import type {
  BudgetEntry,
  BudgetGroup,
  BudgetGroupPayload,
  BudgetLimitStatus,
  BudgetLinePayload,
  BudgetLineType,
  BudgetMonthResponse,
  BudgetMonthTotals,
  BudgetTotals,
} from './budgets.types';

// Evita arrastrar errores de coma flotante (0.1 + 0.2) a lo que se muestra.
const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Lo "pagado" de una linea es su importe si esta marcada.
export const getEntryActual = (entry: BudgetEntry): number => (entry.paid ? Number(entry.amount) : 0);

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

// Cuanto del limite del grupo se lleva consumido con lo previsto en sus lineas; null si no tiene limite.
export const getLimitStatus = (group: BudgetGroup): BudgetLimitStatus | null => {
  if (group.limit === null) return null;
  const limit = Number(group.limit);
  const used = getGroupTotals(group.entries).planned;
  return {
    limit,
    used,
    remaining: roundMoney(limit - used),
    ratio: limit > 0 ? Math.min(Math.max(used / limit, 0), 1) : 0,
    isOver: used > limit,
  };
};

// Lee un importe escrito a mano: "1700,5", "1700.5", "1.500" (miles) o "1.500,75".
// Devuelve null si no es un numero valido o es negativo.
export const parseAmountInput = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;

  let normalized = trimmed;
  if (trimmed.includes(',')) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    normalized = trimmed.replace(/\./g, '');
  }

  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
};

export const getLineType = (entry: BudgetEntry): BudgetLineType => (Number(entry.amount) < 0 ? 'REFUND' : 'FIXED');

// Importe sin signo para el campo de texto del formulario ("21,99").
export const formatAmountForInput = (amount: string): string => String(Math.abs(Number(amount))).replace('.', ',');

export const toLinePayload = (values: { name: string; lineType: BudgetLineType; amount: string }): BudgetLinePayload => {
  const magnitude = parseAmountInput(values.amount) ?? 0;
  return {
    name: values.name.trim(),
    amount: values.lineType === 'REFUND' ? -magnitude : magnitude,
  };
};

// El campo del limite vacio significa "sin limite".
export const toGroupPayload = (values: { name: string; color: string; limit: string }): BudgetGroupPayload => ({
  name: values.name.trim(),
  color: values.color,
  limit: values.limit.trim() === '' ? null : parseAmountInput(values.limit),
});

// Para la actualizacion optimista del check de pagado.
export const setEntryPaid = (month: BudgetMonthResponse, entryId: string, paid: boolean): BudgetMonthResponse => ({
  ...month,
  groups: month.groups.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, paid } : entry)),
  })),
});
