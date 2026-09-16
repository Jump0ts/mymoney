import { z } from "zod";

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(40).default("tag"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser un hex tipo #RRGGBB")
    .default("#6C5CE7"),
  type: categoryTypeSchema,
});

export const updateCategorySchema = createCategorySchema.partial();
