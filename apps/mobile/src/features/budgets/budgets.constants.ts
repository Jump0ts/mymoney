import type { SegmentOption } from '@/components/SegmentedControl';
import type { BudgetLineType, BudgetScope } from './budgets.types';

export const LINE_TYPE_OPTIONS: SegmentOption<BudgetLineType>[] = [
  { label: 'Gasto', value: 'EXPENSE' },
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
