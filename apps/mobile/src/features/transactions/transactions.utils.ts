import type { AddTransactionFormValues } from './transactions.schema';
import type { TransactionInput } from './useTransactions';

// Cuerpo comun de crear y editar un movimiento a partir del formulario.
const baseInput = (values: AddTransactionFormValues): Omit<TransactionInput, 'budgetEntryId'> => ({
  categoryId: values.categoryId,
  type: values.type,
  amount: values.amount,
  description: values.description || undefined,
  occurredAt: values.occurredAt.toISOString(),
});

// Solo un gasto puede estar enlazado con una linea del presupuesto.
const linkOf = (values: AddTransactionFormValues): string | null =>
  values.type === 'EXPENSE' ? (values.budgetEntryId ?? null) : null;

// Al crear, sin enlace el campo se omite.
export const toCreateInput = (values: AddTransactionFormValues): TransactionInput => {
  const budgetEntryId = linkOf(values);
  return { ...baseInput(values), ...(budgetEntryId ? { budgetEntryId } : {}) };
};

// Al editar, el enlace se manda siempre: null es la unica forma de quitarlo.
export const toUpdateInput = (values: AddTransactionFormValues): TransactionInput => ({
  ...baseInput(values),
  budgetEntryId: linkOf(values),
});
