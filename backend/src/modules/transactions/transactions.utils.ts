import { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "../../utils/errors.js";

type Db = Prisma.TransactionClient;

// Datos de la linea del presupuesto que se devuelven junto a un movimiento enlazado.
export const transactionInclude = {
  category: true,
  budgetEntry: { select: { id: true, name: true, group: { select: { name: true, color: true } } } },
} satisfies Prisma.TransactionInclude;

export const LINK_ONLY_EXPENSE = "Solo un gasto se puede enlazar con una línea del presupuesto";

// Una linea admite un gasto si es del usuario, es una linea de gasto (importe positivo: un reembolso no
// se enlaza) y no tiene ya otro gasto enlazado. `ownTransactionId` permite conservar el enlace propio.
export const assertLinkable = async (db: Db, userId: string, budgetEntryId: string, ownTransactionId?: string) => {
  const entry = await db.budgetEntry.findFirst({
    where: { id: budgetEntryId, userId },
    include: { transaction: { select: { id: true } } },
  });
  if (!entry) throw notFound("Línea del presupuesto no encontrada");
  if (Number(entry.amount) <= 0) throw badRequest("Un reembolso no se enlaza con un gasto");
  if (entry.transaction && entry.transaction.id !== ownTransactionId) {
    throw conflict("Esa línea ya está enlazada a otro movimiento");
  }
};

// Enlazar marca la linea como pagada; desenlazar (o borrar el gasto) la deja sin pagar.
export const setEntryPaid = (db: Db, entryId: string, paid: boolean) =>
  db.budgetEntry.update({ where: { id: entryId }, data: { paid } });

// Dos peticiones a la vez sobre la misma linea: el indice unico deja pasar solo a una.
export const withLinkConflict = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Esa línea ya está enlazada a otro movimiento");
    }
    throw error;
  }
};
