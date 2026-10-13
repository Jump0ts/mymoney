import type { BudgetLineKind } from "@prisma/client";
import { badRequest } from "../../utils/errors.js";
import type { YearMonth } from "./budgets.types.js";

export const compareYearMonth = (a: YearMonth, b: YearMonth): number =>
  a.year !== b.year ? a.year - b.year : a.month - b.month;

// Limites del mes en UTC, igual que getMonthRange de la app, para que los
// movimientos de un mes caigan en el mismo mes que ve el usuario.
export const getMonthBoundsUtc = ({ year, month }: YearMonth) => ({
  from: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
  to: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
});

// Una linea "limite por categoria" necesita categoria e importe positivo
// (es lo asignado); una linea fija nunca lleva categoria.
export const normalizeLine = (line: { kind: BudgetLineKind; amount: number; categoryId?: string | null }) => {
  if (line.kind === "CATEGORY_LIMIT") {
    if (!line.categoryId) throw badRequest("Una línea con límite necesita una categoría");
    if (line.amount <= 0) throw badRequest("El límite de una categoría debe ser positivo");
    return { categoryId: line.categoryId };
  }
  return { categoryId: null };
};
