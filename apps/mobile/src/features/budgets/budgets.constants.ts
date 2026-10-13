import type { SegmentOption } from '@/components/SegmentedControl';
import type { BudgetLineType, BudgetScope } from './budgets.types';

export const LINE_TYPE_OPTIONS_ALL: SegmentOption<BudgetLineType>[] = [
  { label: 'Fijo', value: 'FIXED' },
  { label: 'Reembolso', value: 'REFUND' },
  { label: 'Límite', value: 'LIMIT' },
];

// Una línea con límite no puede pasar a fija (ni al revés): el servidor no cambia el tipo.
export const LINE_TYPE_OPTIONS_FIXED: SegmentOption<BudgetLineType>[] = [
  { label: 'Fijo', value: 'FIXED' },
  { label: 'Reembolso', value: 'REFUND' },
];

export const SCOPE_OPTIONS_CREATE: SegmentOption<BudgetScope>[] = [
  { label: 'Solo este mes', value: 'month' },
  { label: 'Todos los meses', value: 'template' },
];

export const SCOPE_OPTIONS_EDIT: SegmentOption<BudgetScope>[] = [
  { label: 'Solo este mes', value: 'month' },
  { label: 'Este y los siguientes', value: 'template' },
];
