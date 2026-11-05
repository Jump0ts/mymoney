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
  EnvelopeStatus,
} from './budgets.types';
import type { TransactionInput } from '@/features/transactions/useTransactions';
import { compareYearMonth, formatDateKey, getCurrentYearMonth, parseDateKey, type YearMonth } from '@/utils/date';

// Evita arrastrar errores de coma flotante (0.1 + 0.2) a lo que se muestra.
const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Una linea esta enlazada si tiene algun gasto de Movimientos asociado.
export const isEntryLinked = (entry: BudgetEntry): boolean => entry.transactions.length > 0;

// Lo "pagado" de una linea es el importe real de sus gastos enlazados (uno, o la suma de los de un sobre) o, si se
// marco a mano, su importe previsto. Un sobre sin gastos no ha gastado nada.
export const getEntryActual = (entry: BudgetEntry): number => {
  if (entry.transactions.length > 0) {
    return roundMoney(entry.transactions.reduce((sum, expense) => sum + Number(expense.amount), 0));
  }
  return entry.paid && !entry.envelope ? Number(entry.amount) : 0;
};

// Lo que lleva gastado un sobre de lo previsto, para mostrar cuanto queda.
export const getEnvelopeStatus = (entry: BudgetEntry): EnvelopeStatus => {
  const planned = Number(entry.amount);
  const spent = getEntryActual(entry);
  return {
    planned,
    spent,
    remaining: roundMoney(planned - spent),
    ratio: planned > 0 ? Math.min(spent / planned, 1) : 0,
    isOver: spent > planned,
  };
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

// Lo que un grupo aparta del sueldo: su limite, aunque aun no tenga lineas que lo llenen, o lo que suman sus
// lineas si ya lo superan (el dinero de mas tambien esta comprometido). Sin limite, lo que suman sus lineas.
export const getGroupReserved = (group: BudgetGroup): number => {
  const planned = getGroupTotals(group.entries).planned;
  return group.limit === null ? planned : Math.max(Number(group.limit), planned);
};

// Lo que queda del sueldo tras apartar el dinero de todos los grupos salvo el del sobrante: el limite de los que
// lo tienen (ese dinero ya no es "sobrante" aunque aun no este gastado) y lo previsto en los que no.
export const getRemainderAvailable = (groups: BudgetGroup[], income: number): number =>
  roundMoney(income - groups.reduce((sum, group) => (group.isRemainder ? sum : sum + getGroupReserved(group)), 0));

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

export const getLineType = (entry: BudgetEntry): BudgetLineType => {
  if (Number(entry.amount) < 0) return 'REFUND';
  return entry.envelope ? 'ENVELOPE' : 'EXPENSE';
};

// Importe sin signo para el campo de texto del formulario ("21,99").
export const formatAmountForInput = (amount: string): string => String(Math.abs(Number(amount))).replace('.', ',');

export const toLinePayload = (values: { name: string; lineType: BudgetLineType; amount: string }): BudgetLinePayload => {
  const magnitude = parseAmountInput(values.amount) ?? 0;
  return {
    name: values.name.trim(),
    amount: values.lineType === 'REFUND' ? -magnitude : magnitude,
    envelope: values.lineType === 'ENVELOPE',
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

// Se puede apuntar un gasto real en el mes actual o en uno pasado; en un mes futuro se planifica con lineas.
export const canAddExpenseIn = (target: YearMonth, now: YearMonth = getCurrentYearMonth()): boolean =>
  compareYearMonth(target, now) <= 0;

// Dia que propone "+ gasto" al abrir Movimientos desde Presupuesto: hoy en el mes actual (undefined: el formulario ya
// usa hoy) y el ultimo dia en un mes pasado.
export const expenseDateFor = (target: YearMonth, now: YearMonth = getCurrentYearMonth()): string | undefined =>
  compareYearMonth(target, now) >= 0 ? undefined : formatDateKey(new Date(target.year, target.month, 0, 12));

// Marcar como pagada una linea sin enlazar de un mes actual o pasado registra el pago (crea el gasto). No aplica a un
// mes futuro (aun no se ha pagado nada), a un reembolso (no es un gasto), a lo que ya esta pagado (ahi solo se
// desmarca) ni a un sobre (ahi se apuntan gastos, no se marca).
export const shouldRegisterPayment = (
  entry: BudgetEntry,
  target: YearMonth,
  now: YearMonth = getCurrentYearMonth(),
): boolean =>
  !entry.envelope && !entry.paid && !isEntryLinked(entry) && Number(entry.amount) > 0 && canAddExpenseIn(target, now);

// Tocar un sobre de un mes actual o pasado apunta un gasto nuevo en el. En un mes futuro aun no se ha gastado nada.
export const shouldAddToEnvelope = (
  entry: BudgetEntry,
  target: YearMonth,
  now: YearMonth = getCurrentYearMonth(),
): boolean => entry.envelope && canAddExpenseIn(target, now);

// Parametros con los que se abre la hoja de pago. Viajan por la ruta, asi que todo son textos y solo van los que existen.
// (type y no interface: asi encaja como parametros de ruta de expo-router.)
export type PayEntryParams = {
  entryId: string;
  name: string;
  amount: string;
  categoryId?: string;
  date?: string;
  // Solo en un sobre: '1' y lo gastado hasta ahora. El importe de la hoja es entonces el de un gasto nuevo, vacio, y
  // `amount` es lo previsto para todo el sobre.
  envelope?: string;
  spent?: string;
};

export const payEntryParams = (
  entry: BudgetEntry,
  target: YearMonth,
  now: YearMonth = getCurrentYearMonth(),
): PayEntryParams => {
  const date = expenseDateFor(target, now);
  return {
    entryId: entry.id,
    name: entry.name,
    amount: entry.amount,
    ...(entry.suggestedCategoryId ? { categoryId: entry.suggestedCategoryId } : {}),
    ...(date ? { date } : {}),
    ...(entry.envelope ? { envelope: '1', spent: String(getEntryActual(entry)) } : {}),
  };
};

// El gasto que crea la hoja de pago: enlazado a la linea, con su nombre como descripcion y la fecha de hoy (o el
// ultimo dia del mes si la linea es de un mes pasado).
export const toPaymentInput = (
  params: Pick<PayEntryParams, 'entryId' | 'name' | 'date'>,
  values: { categoryId: string; amount: string },
): TransactionInput => ({
  type: 'EXPENSE',
  categoryId: values.categoryId,
  amount: parseAmountInput(values.amount) ?? 0,
  description: params.name,
  occurredAt: ((params.date && parseDateKey(params.date)) || new Date()).toISOString(),
  budgetEntryId: params.entryId,
});
