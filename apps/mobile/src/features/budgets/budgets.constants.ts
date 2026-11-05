import type { SegmentOption } from '@/components/SegmentedControl';
import type { BudgetLineType, BudgetScope } from './budgets.types';

export const LINE_TYPE_OPTIONS: SegmentOption<BudgetLineType>[] = [
  { label: 'Gasto', value: 'EXPENSE' },
  { label: 'Variable', value: 'ENVELOPE' },
  { label: 'Reembolso', value: 'REFUND' },
];

// Una linea que nacio con un gasto lo sigue a el: no puede ser un sobre.
export const LINE_TYPE_OPTIONS_NO_ENVELOPE = LINE_TYPE_OPTIONS.filter((option) => option.value !== 'ENVELOPE');

// Explicacion de un sobre al elegir "Variable" en el formulario de una linea.
export const ENVELOPE_HINT =
  'Para gastos que se reparten en varias compras (supermercado, gasolina). El importe es lo previsto para todas; cada gasto que enlaces se descuenta de él.';

export const SCOPE_OPTIONS_CREATE: SegmentOption<BudgetScope>[] = [
  { label: 'Solo este mes', value: 'month' },
  { label: 'Todos los meses', value: 'template' },
];

export const SCOPE_OPTIONS_EDIT: SegmentOption<BudgetScope>[] = [
  { label: 'Solo este mes', value: 'month' },
  { label: 'Este y los siguientes', value: 'template' },
];

// Hasta cuantos meses por delante del actual se puede abrir el presupuesto (apuntar cobros futuros).
// Debe coincidir con MAX_MONTHS_AHEAD del backend, que lo hace cumplir.
export const MAX_MONTHS_AHEAD = 12;
