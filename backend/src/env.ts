import "dotenv/config";
import { flattenError, z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  NODE_ENV: z.enum(["pre", "staging", "production", "test"]).default("pre"),
  PORT: z.coerce.number().int().positive().default(4000),
  // "false" cierra el registro publico: en un servidor expuesto a Internet nadie mas debe poder crear cuentas.
  REGISTRATION_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:", flattenError(parsed.error).fieldErrors);
  throw new Error("Configuración de entorno inválida");
}

export const env = parsed.data;
