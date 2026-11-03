import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";
import { defineConfig } from "vitest/config";

// TEST_DATABASE_URL tal como la deja backend/.env o backend/.env.test (el segundo manda), sin tocar process.env.
// Se lee con dotenv y no con loadEnv de vite: vite ya no es una dependencia directa de este paquete.
const testDatabaseUrlFromFiles = (): string | undefined =>
  [".env", ".env.test"]
    .filter((file) => existsSync(file))
    .map((file) => parse(readFileSync(file)).TEST_DATABASE_URL)
    .filter(Boolean)
    .pop();

// Los tests usan TEST_DATABASE_URL si existe (en el entorno o en esos ficheros), y asi la base de desarrollo
// (DATABASE_URL) nunca se toca. Sin ella se usa DATABASE_URL, que tests/dbGuard.ts exige que sea de pruebas.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? testDatabaseUrlFromFiles();

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    env: testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {},
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});
