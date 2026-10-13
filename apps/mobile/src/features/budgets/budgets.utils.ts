import type {
  BudgetEntry,
  BudgetGroup,
  BudgetLimitStatus,
  BudgetMonthResponse,
  BudgetMonthTotals,
  BudgetTotals,
} from './budgets.types';

// Evita arrastrar errores de coma flotante (0.1 + 0.2) a lo que se muestra.
const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Lo "pagado" de una linea fija es su importe si esta marcada; en una linea con
// limite es lo realmente gastado en esa categoria ese mes.
export const getEntryActual = (entry: BudgetEntry): number => {
  if (entry.kind === 'CATEGORY_LIMIT') return entry.spent ?? 0;
  return entry.paid ? Number(entry.amount) : 0;
};

export const getGroupTotals = (entries: BudgetEntry[]): BudgetTotals => ({
  planned: roundMoney(entries.reduce((sum, entry) => sum + Number(entry.amount), 0)),
  paid: roundMoney(entries.reduce((sum, entry) => sum + getEntryActual(entry), 0)),
});

export const getMonthTotals = (groups: BudgetGroup[], income: number): BudgetMonthTotals => {
  const planned = roundMoney(groups.reduce((sum, group) => sum + getGroupTotals(group.entries).planned, 0));
  const paid = roundMoney(groups.reduce((sum, group) => sum + getGroupTotals(group.entries).paid, 0));
  return {
    income,
    planned,
    paid,
    remainingPlanned: roundMoney(income - planned),
    remainingReal: roundMoney(income - paid),
  };
};

export const getLimitStatus = (entry: BudgetEntry): BudgetLimitStatus => {
  const limit = Number(entry.amount);
  const spent = entry.spent ?? 0;
  return {
    limit,
    spent,
    remaining: roundMoney(limit - spent),
    ratio: limit > 0 ? Math.min(spent / limit, 1) : 0,
    isOver: spent > limit,
  };
};

// Para la actualizacion optimista del check de pagado.
export const setEntryPaid = (month: BudgetMonthResponse, entryId: string, paid: boolean): BudgetMonthResponse => ({
  ...month,
  groups: month.groups.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, paid } : entry)),
  })),
});
