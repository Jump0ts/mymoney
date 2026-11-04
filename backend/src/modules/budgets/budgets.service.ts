import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { compareYearMonth, isTooFarAhead, MAX_MONTHS_AHEAD } from "./budgets.utils.js";
import type { YearMonth } from "./budgets.types.js";

type Db = Prisma.TransactionClient;

export const findOwnedGroup = async (userId: string, groupId: string) => {
  const group = await prisma.budgetGroup.findFirst({ where: { id: groupId, userId } });
  if (!group) throw notFound("Grupo no encontrado");
  return group;
};

export const nextEntryPosition = async (db: Db | typeof prisma, userId: string, target: YearMonth, groupId: string) => {
  const max = await db.budgetEntry.aggregate({
    where: { userId, ...target, groupId },
    _max: { position: true },
  });
  return (max._max.position ?? -1) + 1;
};

// Categoria del ultimo gasto enlazado a cada linea de plantilla (por itemId). Al pagar una linea se propone esa misma,
// asi la segunda vez basta confirmar. Una plantilla sin ningun gasto enlazado no aparece en el resultado.
export const lastCategoryByItem = async (userId: string, itemIds: string[]): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  if (itemIds.length === 0) return result;

  const rows = await prisma.transaction.findMany({
    where: { userId, budgetEntry: { itemId: { in: itemIds } } },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    select: { categoryId: true, budgetEntry: { select: { itemId: true } } },
  });
  for (const row of rows) {
    const itemId = row.budgetEntry?.itemId;
    if (itemId && !result.has(itemId)) result.set(itemId, row.categoryId);
  }
  return result;
};

// Ultimo mes guardado anterior al indicado: de el se copia el sueldo al generar un mes nuevo.
export const findPreviousMonth = (userId: string, target: YearMonth) =>
  prisma.budgetMonth.findFirst({
    where: {
      userId,
      OR: [{ year: { lt: target.year } }, { year: target.year, month: { lt: target.month } }],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

// Abre el presupuesto de un mes: la primera vez lo genera copiando la plantilla
// (con "pagado" en false) y el sueldo del ultimo mes anterior. Devuelve false si
// el mes es anterior al primer presupuesto del usuario: no tiene sentido
// rellenar con la plantilla de hoy meses que ya pasaron.
export const openMonth = async (userId: string, target: YearMonth): Promise<boolean> => {
  if (isTooFarAhead(target)) {
    throw badRequest(`Solo se pueden preparar presupuestos hasta ${MAX_MONTHS_AHEAD} meses por delante`);
  }
  const existing = await prisma.budgetMonth.findUnique({
    where: { userId_year_month: { userId, ...target } },
  });
  if (existing) return true;

  const earliest = await prisma.budgetMonth.findFirst({
    where: { userId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  if (earliest && compareYearMonth(target, earliest) < 0) return false;

  const previous = await findPreviousMonth(userId, target);
  const items = await prisma.budgetItem.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  try {
    await prisma.$transaction([
      prisma.budgetMonth.create({ data: { userId, ...target, income: previous?.income ?? 0 } }),
      prisma.budgetEntry.createMany({
        data: items.map((item) => ({
          userId,
          ...target,
          groupId: item.groupId,
          itemId: item.id,
          name: item.name,
          amount: item.amount,
          position: item.position,
        })),
        skipDuplicates: true,
      }),
    ]);
  } catch (error) {
    // Otra peticion abrio el mismo mes a la vez: ya esta generado, no hay nada que hacer.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return true;
};

// Deja guardado el mes: lo genera desde la plantilla si hace falta y, si es anterior al primer presupuesto
// (no se rellena con la plantilla), lo crea vacio para poder escribir en el.
export const ensureMonth = async (userId: string, target: YearMonth): Promise<void> => {
  if (await openMonth(userId, target)) return;
  await prisma.budgetMonth.upsert({
    where: { userId_year_month: { userId, ...target } },
    update: {},
    create: { userId, ...target },
  });
};
