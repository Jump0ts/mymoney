import { z } from "zod";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const createTransactionSchema = z.object({
  categoryId: z.string().min(1),
  type: transactionTypeSchema,
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3).default("EUR"),
  description: z.string().trim().max(200).optional(),
  occurredAt: z.coerce.date(),
  // Linea del presupuesto que cubre este gasto; null al editar quita el enlace.
  budgetEntryId: z.string().min(1).nullable().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionsQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  categoryId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const summaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
