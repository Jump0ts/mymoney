import { z } from "zod";
import { transactionTypeSchema } from "../transactions/transactions.schema.js";

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser un hex tipo #RRGGBB");

const categoryFields = {
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().min(1).max(40),
  color: colorSchema,
  type: transactionTypeSchema,
};

// Al crear, el icono y el color tienen valor por defecto.
export const createCategorySchema = z.object({
  ...categoryFields,
  icon: categoryFields.icon.default("tag"),
  color: categoryFields.color.default("#6C5CE7"),
});

// Al editar, lo que no se manda no se toca. Los valores por defecto NO van aqui: con `createCategorySchema.partial()`
// un cambio solo de nombre restablecia el color y el icono a los de por defecto.
export const updateCategorySchema = z.object(categoryFields).partial();
