export interface BudgetEntry {
  id: string;
  groupId: string;
  itemId: string | null;
  name: string;
  amount: string;
  paid: boolean;
  position: number;
}

export interface BudgetGroup {
  id: string;
  name: string;
  color: string;
  // Tope opcional para la suma de lo previsto en las lineas del grupo.
  limit: string | null;
  position: number;
  entries: BudgetEntry[];
}

export interface BudgetMonthResponse {
  // null si el mes es anterior al primer presupuesto y no se ha generado.
  month: { year: number; month: number; income: string } | null;
  groups: BudgetGroup[];
}

// Lo que elige el usuario al crear una linea; un reembolso es una linea con importe negativo.
export type BudgetLineType = 'FIXED' | 'REFUND';

// "month": solo el mes abierto; "template": tambien la plantilla (meses siguientes).
export type BudgetScope = 'month' | 'template';

// Cuerpo comun de crear/editar una linea, ya con el importe con signo.
export interface BudgetLinePayload {
  name: string;
  amount: number;
}

// Cuerpo comun de crear/editar un grupo; limit null = sin limite.
export interface BudgetGroupPayload {
  name: string;
  color: string;
  limit: number | null;
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
  // Suma de lo previsto en las lineas del grupo.
  used: number;
  remaining: number;
  ratio: number;
  isOver: boolean;
}
