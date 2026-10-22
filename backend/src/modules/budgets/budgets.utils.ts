import type { YearMonth } from "./budgets.types.js";

export const compareYearMonth = (a: YearMonth, b: YearMonth): number =>
  a.year !== b.year ? a.year - b.year : a.month - b.month;
