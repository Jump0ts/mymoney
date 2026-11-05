import { parseDateKey } from '@/utils/date';
import type { AddTransactionFormValues } from './transactions.schema';
import type { CategoryBreakdown } from './transactions.types';
import type { TransactionInput } from './useTransactions';

// Cuerpo comun de crear y editar un movimiento a partir del formulario.
const baseInput = (values: AddTransactionFormValues): Omit<TransactionInput, 'budgetEntryId' | 'budgetGroupId'> => ({
  categoryId: values.categoryId,
  type: values.type,
  // Un reembolso es un gasto de importe negativo (el formulario lo pide en positivo).
  amount: values.type === 'EXPENSE' && values.refund ? -values.amount : values.amount,
  description: values.description || undefined,
  occurredAt: values.occurredAt.toISOString(),
});

// Un gasto se enlaza con una linea de gasto del presupuesto y un reembolso, con una de reembolso; un ingreso, con
// ninguna. Lo mismo para salir de un grupo (el reembolso crea su propia linea de reembolso).
const linkOf = (values: AddTransactionFormValues): string | null =>
  values.type === 'EXPENSE' ? (values.budgetEntryId ?? null) : null;

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

// Porciones del grafico de gastos del Resumen: lo gastado por categoria, neto de reembolsos. Una categoria con mas
// reembolsos que gastos queda en cero o en negativo y no tiene porcion que dibujar.
export const toExpenseSlices = (byCategory: CategoryBreakdown[], colorOf: (color: string) => string) =>
  byCategory
    .filter((c) => c.type === 'EXPENSE' && c.total > 0)
    .map((c) => ({ label: c.categoryName, value: c.total, color: colorOf(c.color) }));

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
