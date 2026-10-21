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

// Lo que queda del sueldo tras repartir lo previsto en todos los grupos salvo el del sobrante.
export const getRemainderAvailable = (groups: BudgetGroup[], income: number): number =>
  roundMoney(
    income -
      groups.reduce((sum, group) => (group.isRemainder ? sum : sum + getGroupTotals(group.entries).planned), 0),
  );

// Cuanto del tope del grupo se lleva consumido con lo previsto en sus lineas. El tope es su limite,
// o el disponible calculado si es el grupo del sobrante; null si no tiene ninguno.
export const getLimitStatus = (group: BudgetGroup, remainderAvailable = 0): BudgetLimitStatus | null => {
  if (!group.isRemainder && group.limit === null) return null;
  const limit = group.isRemainder ? remainderAvailable : Number(group.limit);
  const used = getGroupTotals(group.entries).planned;
  return {
    limit,
    used,
    remaining: roundMoney(limit - used),
    ratio: used > 0 && limit > 0 ? Math.min(used / limit, 1) : used > 0 ? 1 : 0,
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
// El grupo del sobrante no tiene limite propio: su tope es el disponible.
export const toGroupPayload = (values: {
  name: string;
  color: string;
  limit: string;
  isRemainder: boolean;
}): BudgetGroupPayload => ({
  name: values.name.trim(),
  color: values.color,
  limit: values.isRemainder || values.limit.trim() === '' ? null : parseAmountInput(values.limit),
  isRemainder: values.isRemainder,
});

// Para la actualizacion optimista del check de pagado.
export const setEntryPaid = (month: BudgetMonthResponse, entryId: string, paid: boolean): BudgetMonthResponse => ({
  ...month,
  groups: month.groups.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => (entry.id === entryId ? { ...entry, paid } : entry)),
  })),
});

// Mueve un id una posicion arriba (-1) o abajo (1); devuelve la misma lista si no se puede.
export const moveId = (ids: string[], id: string, delta: -1 | 1): string[] => {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};

const sortByIds = <T extends { id: string }>(items: T[], ids: string[]): T[] =>
  ids.map((id) => items.find((item) => item.id === id)).filter((item): item is T => item !== undefined);

// Para la actualizacion optimista del orden de los grupos.
export const setGroupOrder = (month: BudgetMonthResponse, ids: string[]): BudgetMonthResponse => ({
  ...month,
  groups: sortByIds(month.groups, ids),
});

// Para la actualizacion optimista del orden de las lineas de un grupo.
export const setEntryOrder = (month: BudgetMonthResponse, groupId: string, ids: string[]): BudgetMonthResponse => ({
  ...month,
  groups: month.groups.map((group) => (group.id === groupId ? { ...group, entries: sortByIds(group.entries, ids) } : group)),
});
