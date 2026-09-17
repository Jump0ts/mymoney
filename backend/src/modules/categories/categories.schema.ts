import { z } from "zod";
import { transactionTypeSchema } from "../transactions/transactions.schema.js";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(40).default("tag"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser un hex tipo #RRGGBB")
    .default("#6C5CE7"),
  type: transactionTypeSchema,
});

export const updateCategorySchema = createCategorySchema.partial();
