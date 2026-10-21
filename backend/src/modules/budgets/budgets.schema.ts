import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser un hex tipo #RRGGBB");

// Negativo permitido: reembolsos de otras personas dentro de un grupo (p. ej. "Luz Ivan").
const amountSchema = z
  .number()
  .min(-1_000_000)
  .max(1_000_000)
  .refine((value) => value !== 0, "El importe no puede ser 0");

export const monthParamsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// Tope opcional de la suma de lo previsto en las lineas del grupo; null lo quita.
const groupLimitSchema = z.number().positive("El límite debe ser mayor que 0").max(1_000_000).nullable();

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: colorSchema.default("#6C5CE7"),
  limit: groupLimitSchema.optional(),
  isRemainder: z.boolean().optional(),
});

export const updateGroupSchema = createGroupSchema.partial().extend({
  position: z.number().int().min(0).optional(),
});

export const createItemSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  amount: amountSchema,
});

export const updateItemSchema = z.object({
  groupId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  amount: amountSchema.optional(),
  position: z.number().int().min(0).optional(),
});

// recurring=true ademas de la linea del mes crea el item en la plantilla.
export const createEntrySchema = createItemSchema.extend({
  recurring: z.boolean().default(false),
});

export const updateEntrySchema = z.object({
  groupId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  amount: amountSchema.optional(),
  paid: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateMonthSchema = z.object({
  income: z.number().min(0).max(10_000_000),
});
