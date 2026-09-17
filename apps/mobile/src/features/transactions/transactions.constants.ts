import type { TransactionType } from './transactions.types';

export const TRANSACTION_TYPE_FILTERS: { label: string; value: TransactionType | undefined }[] = [
  { label: 'Todo', value: undefined },
  { label: 'Gastos', value: 'EXPENSE' },
  { label: 'Ingresos', value: 'INCOME' },
];
