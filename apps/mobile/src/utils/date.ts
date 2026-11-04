export interface YearMonth {
  year: number;
  month: number;
}

export const getCurrentYearMonth = (): YearMonth => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export const addMonths = ({ year, month }: YearMonth, delta: number): YearMonth => {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};

export const compareYearMonth = (a: YearMonth, b: YearMonth): number => {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
};

export const getMonthRange = (year: number, month: number): { from: string; to: string } => {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
};

export const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const getDayRange = (dateKey: string): { from: string; to: string } => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const from = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
};

// "2026-10-31" -> ese dia a mediodia (hora local, como el selector de fecha); undefined si no es una fecha valida.
export const parseDateKey = (dateKey: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
};
