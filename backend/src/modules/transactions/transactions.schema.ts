import { z } from "zod";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const INCOME_POSITIVE = "Un ingreso debe ser mayor que 0: un reembolso es un gasto de importe negativo";

const transactionFields = z.object({
  categoryId: z.string().min(1),
  type: transactionTypeSchema,
  // Un gasto de importe negativo es un reembolso: dinero que te devuelven por un gasto (la mitad de una cena). Resta
  // de su categoria en los resumenes en vez de contar como ingreso. Un ingreso siempre es positivo.
  amount: z
    .number()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((amount) => amount !== 0, { message: "El importe no puede ser 0" }),
  currency: z.string().length(3).default("EUR"),
  description: z.string().trim().max(200).optional(),
  occurredAt: z.coerce.date(),
  // Linea del presupuesto que cubre este gasto o reembolso (del mismo signo que la linea); null al editar quita el enlace.
  budgetEntryId: z.string().min(1).nullable().optional(),
  // Grupo del presupuesto del que sale este gasto: crea una linea puntual ya pagada y enlazada en el mes del gasto.
  // No se combina con budgetEntryId (enlazar con una linea que ya existe).
  budgetGroupId: z.string().min(1).optional(),
});

export const createTransactionSchema = transactionFields.refine((t) => t.type !== "INCOME" || t.amount > 0, {
  message: INCOME_POSITIVE,
  path: ["amount"],
});

// Sin la regla del ingreso: al editar puede faltar el tipo o el importe (se comprueba en la ruta con lo que ya habia).
export const updateTransactionSchema = transactionFields.partial();

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
