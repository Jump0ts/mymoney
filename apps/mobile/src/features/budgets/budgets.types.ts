export type BudgetLineKind = 'FIXED' | 'CATEGORY_LIMIT';

export interface BudgetEntry {
  id: string;
  groupId: string;
  itemId: string | null;
  name: string;
  amount: string;
  kind: BudgetLineKind;
  categoryId: string | null;
  paid: boolean;
  position: number;
  // Solo en lineas con limite: lo gastado ese mes en la categoria (null en las fijas).
  spent: number | null;
}

export interface BudgetGroup {
  id: string;
  name: string;
  color: string;
  position: number;
  entries: BudgetEntry[];
}

export interface BudgetMonthResponse {
  // null si el mes es anterior al primer presupuesto y no se ha generado.
  month: { year: number; month: number; income: string } | null;
  groups: BudgetGroup[];
}

export interface BudgetTotals {
  planned: number;
  paid: number;
}

export interface BudgetMonthTotals extends BudgetTotals {
  income: number;
  remainingPlanned: number;
  remainingReal: number;
}

export interface BudgetLimitStatus {
  limit: number;
  spent: number;
  remaining: number;
  ratio: number;
  isOver: boolean;
}
