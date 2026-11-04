import type { YearMonth } from "./budgets.types.js";

export const compareYearMonth = (a: YearMonth, b: YearMonth): number =>
  a.year !== b.year ? a.year - b.year : a.month - b.month;

// Hasta cuantos meses por delante del actual se puede abrir el presupuesto (apuntar cobros futuros).
// La app ofrece MAX_MONTHS_AHEAD; el servidor admite uno mas porque su "mes actual" (UTC) puede ir un
// dia por detras del del movil y asi nunca rechaza lo que la app deja elegir.
export const MAX_MONTHS_AHEAD = 12;

export const addMonths = ({ year, month }: YearMonth, delta: number): YearMonth => {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};

// Filtro de Prisma: filas de meses estrictamente posteriores al indicado.
export const afterMonth = ({ year, month }: YearMonth) => ({
  OR: [{ year: { gt: year } }, { year, month: { gt: month } }],
});

// Un mes posterior al actual (UTC): se muestra sin guardarlo hasta que el usuario escribe algo en el.
export const isFutureMonth = (target: YearMonth, now: Date = new Date()): boolean =>
  compareYearMonth(target, { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }) > 0;

// Prefijo del id de las lineas de un mes sin guardar: aun no existen en la base de datos.
export const PREVIEW_ENTRY_PREFIX = "preview:";

export const isTooFarAhead = (target: YearMonth, now: Date = new Date()): boolean =>
  compareYearMonth(
    target,
    addMonths({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }, MAX_MONTHS_AHEAD + 1),
  ) > 0;
