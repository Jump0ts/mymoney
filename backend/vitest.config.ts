import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Los tests usan TEST_DATABASE_URL si existe (en el entorno o en backend/.env), y asi la base de desarrollo
// (DATABASE_URL) nunca se toca. Sin ella se usa DATABASE_URL, que tests/dbGuard.ts exige que sea de pruebas.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;

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
