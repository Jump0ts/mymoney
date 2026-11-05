// Gasto de Movimientos enlazado a una linea del presupuesto.
export interface LinkedExpense {
  id: string;
  amount: string;
  occurredAt: string;
}

export interface BudgetEntry {
  id: string;
  groupId: string;
  itemId: string | null;
  name: string;
  amount: string;
  // Sobre: gasto variable (supermercado, gasolina) al que se enlazan varios gastos y cuyo importe es lo previsto para
  // todos ellos. Nunca esta "pagado": lo gastado es la suma de sus gastos.
  envelope: boolean;
  paid: boolean;
  position: number;
  // La linea nacio con un gasto de Movimientos ("Descontar de" un grupo) y lo sigue; no puede ser un sobre.
  fromTransaction?: boolean;
  // Gastos de Movimientos enlazados: su importe es el "real" de la linea. Una linea normal tiene uno como mucho (y
  // cuenta como pagada); un sobre, los que sean (y se suman).
  transactions: LinkedExpense[];
  // Categoria del ultimo gasto con el que se pago esta misma linea de plantilla (solo en lineas sin pagar).
  suggestedCategoryId?: string | null;
}

export interface BudgetGroup {
  id: string;
  name: string;
  color: string;
  // Tope opcional para la suma de lo previsto en las lineas del grupo.
  limit: string | null;
  // Recibe lo que sobra del sueldo tras repartir el resto; su "limite" es ese disponible (calculado).
  isRemainder: boolean;
  position: number;
  entries: BudgetEntry[];
}

export interface BudgetMonthResponse {
  // true en un mes futuro que aun no se ha guardado: se ve como quedaria, pero sus lineas llevan un id
  // provisional y no se pueden editar hasta guardarlo (useOpenMonth).
  preview?: boolean;
  // null si el mes es anterior al primer presupuesto y no se ha generado.
  month: { year: number; month: number; income: string } | null;
  groups: BudgetGroup[];
}

// Lo que elige el usuario al crear una linea; un reembolso es una linea con importe negativo.
export type BudgetLineType = 'EXPENSE' | 'ENVELOPE' | 'REFUND';

// "month": solo el mes abierto; "template": tambien la plantilla (meses siguientes).
export type BudgetScope = 'month' | 'template';

// Cuerpo comun de crear/editar una linea, ya con el importe con signo.
export interface BudgetLinePayload {
  name: string;
  amount: number;
  envelope: boolean;
}

// Cuerpo comun de crear/editar un grupo; limit null = sin limite.
export interface BudgetGroupPayload {
  name: string;
  color: string;
  limit: number | null;
  isRemainder: boolean;
}

// Cuanto lleva gastado un sobre de lo previsto.
export interface EnvelopeStatus {
  planned: number;
  spent: number;
  remaining: number;
  // De 0 a 1, para la barra.
  ratio: number;
  isOver: boolean;
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
