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

const groupFields = {
  name: z.string().trim().min(1).max(40),
  color: colorSchema,
  limit: groupLimitSchema.optional(),
  isRemainder: z.boolean().optional(),
};

// Al crear, el color tiene valor por defecto.
export const createGroupSchema = z.object({ ...groupFields, color: groupFields.color.default("#6C5CE7") });

// Al editar, lo que no se manda no se toca (con el valor por defecto aqui, un cambio solo de nombre restablecia el color).
export const updateGroupSchema = z.object(groupFields).partial().extend({
  position: z.number().int().min(0).optional(),
});

// Orden completo de una lista (grupos o lineas de un grupo): ids sin repetir, de primero a ultimo.
export const reorderSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "No puede haber ids repetidos"),
});

export const entriesOrderParamsSchema = monthParamsSchema.extend({ groupId: z.string().min(1) });

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

// "month": el cambio es solo de este mes (y la linea queda marcada como editada a mano); "template": tambien
// cambia la plantilla y los meses posteriores ya guardados que no se hayan tocado a mano.
export const entryScopeSchema = z.enum(["month", "template"]).default("month");

export const updateEntrySchema = z.object({
  groupId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  amount: amountSchema.optional(),
  paid: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  scope: entryScopeSchema,
});

export const deleteEntryQuerySchema = z.object({ scope: entryScopeSchema });

export const updateMonthSchema = z.object({
  income: z.number().min(0).max(10_000_000),
});
