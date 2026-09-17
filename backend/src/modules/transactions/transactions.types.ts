import type { Prisma } from "@prisma/client";

export interface MonthlyBreakdownRow {
  month: Date;
  type: "INCOME" | "EXPENSE";
  total: Prisma.Decimal;
}
