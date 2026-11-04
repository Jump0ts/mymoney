import { z } from "zod";

// Cuantos colores propios puede guardar cada usuario: de sobra para uso personal y evita una lista sin fin.
export const MAX_SAVED_COLORS = 24;

export const createSavedColorSchema = z.object({
  hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser un hex tipo #RRGGBB")
    // Siempre en mayusculas: #aabbcc y #AABBCC son el mismo color y no se guardan dos veces.
    .transform((value) => value.toUpperCase()),
});
