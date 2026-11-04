import { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import { nextEntryPosition } from "../budgets/budgets.service.js";
import type { YearMonth } from "../budgets/budgets.types.js";

type Db = Prisma.TransactionClient;

// Datos de la linea del presupuesto que se devuelven junto a un movimiento enlazado.
export const transactionInclude = {
  category: true,
  budgetEntry: { select: { id: true, name: true, fromTransaction: true, group: { select: { name: true, color: true } } } },
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

export const LINK_EXCLUSIVE = "Elige una línea del presupuesto o un grupo, no las dos cosas";

// Mes (UTC) del presupuesto al que pertenece un gasto segun su fecha. La app guarda el dia a mediodia, asi que
// el dia no cambia entre la hora local y UTC.
export const monthOf = (date: Date): YearMonth => ({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });

const ENTRY_NAME_MAX = 60;

// Nombre de la linea puntual creada con un gasto: su descripcion o, si no tiene, la categoria.
export const entryNameFor = (description: string | null | undefined, categoryName: string): string =>
  ((description ?? "").trim() || categoryName).slice(0, ENTRY_NAME_MAX);

interface NewExpenseEntry {
  groupId: string;
  name: string;
  amount: number | Prisma.Decimal;
  month: YearMonth;
}

// Linea puntual (sin plantilla) ya pagada que nace de un gasto; el mes ya debe estar guardado.
export const createEntryForExpense = async (db: Db, userId: string, { groupId, name, amount, month }: NewExpenseEntry) =>
  db.budgetEntry.create({
    data: {
      userId,
      ...month,
      groupId,
      name,
      amount,
      paid: true,
      fromTransaction: true,
      position: await nextEntryPosition(db, userId, month, groupId),
    },
  });

// El gasto deja de cubrir una linea: si la linea nacio con el gasto se borra, y si ya existia vuelve a estar sin pagar.
export const releaseEntry = async (db: Db, entryId: string) => {
  const entry = await db.budgetEntry.findUnique({ where: { id: entryId }, select: { fromTransaction: true } });
  if (!entry) return;
  if (entry.fromTransaction) await db.budgetEntry.delete({ where: { id: entryId } });
  else await setEntryPaid(db, entryId, false);
};
