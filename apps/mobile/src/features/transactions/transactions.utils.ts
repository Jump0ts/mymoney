import { parseDateKey } from '@/utils/date';
import type { AddTransactionFormValues } from './transactions.schema';
import type { TransactionInput } from './useTransactions';

// Cuerpo comun de crear y editar un movimiento a partir del formulario.
const baseInput = (values: AddTransactionFormValues): Omit<TransactionInput, 'budgetEntryId' | 'budgetGroupId'> => ({
  categoryId: values.categoryId,
  type: values.type,
  amount: values.amount,
  description: values.description || undefined,
  occurredAt: values.occurredAt.toISOString(),
});

// Un gasto se enlaza con una linea de gasto del presupuesto y un ingreso, con un reembolso (el formulario ya quita el
// enlace cuando cambia el tipo). Solo un gasto puede salir de un grupo.
const linkOf = (values: AddTransactionFormValues): string | null => values.budgetEntryId ?? null;

const groupOf = (values: AddTransactionFormValues): string | null =>
  values.type === 'EXPENSE' ? (values.budgetGroupId ?? null) : null;

// Al crear, sin enlace el campo se omite. Un grupo crea una linea nueva, asi que no se manda a la vez que una linea.
export const toCreateInput = (values: AddTransactionFormValues): TransactionInput => {
  const budgetGroupId = groupOf(values);
  if (budgetGroupId) return { ...baseInput(values), budgetGroupId };
  const budgetEntryId = linkOf(values);
  return { ...baseInput(values), ...(budgetEntryId ? { budgetEntryId } : {}) };
};

// Al editar, el enlace se manda siempre: null es la unica forma de quitarlo.
export const toUpdateInput = (values: AddTransactionFormValues): TransactionInput => {
  const budgetGroupId = groupOf(values);
  if (budgetGroupId) return { ...baseInput(values), budgetGroupId };
  return { ...baseInput(values), budgetEntryId: linkOf(values) };
};

// Formulario de un gasto nuevo que llega desde "+ gasto" de un grupo del presupuesto: el grupo ya viene elegido y la
// fecha (YYYY-MM-DD) es la de otro mes, si el presupuesto abierto no era el actual. Sin grupo no hay valores propios.
export const toNewExpenseDefaults = (groupId?: string, date?: string): AddTransactionFormValues | undefined =>
  groupId
    ? {
        type: 'EXPENSE',
        categoryId: '',
        // Vacio hasta que se escriba: el formulario lo trata como "sin importe".
        amount: undefined as unknown as number,
        description: '',
        occurredAt: (date && parseDateKey(date)) || new Date(),
        budgetEntryId: null,
        budgetGroupId: groupId,
      }
    : undefined;
