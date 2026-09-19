export interface YearMonth {
  year: number;
  month: number;
}

export const getCurrentYearMonth = (): YearMonth => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
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
