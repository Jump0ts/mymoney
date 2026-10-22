import { describe, expect, it } from "vitest";
import { assertTestDatabase, databaseNameOf } from "./dbGuard.js";

const url = (database: string, suffix = "") => `postgresql://usuario:secreto@localhost:5432/${database}${suffix}`;

describe("databaseNameOf", () => {
  it("extrae el nombre de la base, con o sin parametros", () => {
    expect(databaseNameOf(url("mymoney_test"))).toBe("mymoney_test");
    expect(databaseNameOf(url("mymoney_test", "?schema=public&sslmode=disable"))).toBe("mymoney_test");
  });

  it("rechaza una URL ausente o invalida", () => {
    expect(() => databaseNameOf(undefined)).toThrow("No hay DATABASE_URL");
    expect(() => databaseNameOf("esto no es una url")).toThrow("no es una URL valida");
  });
});

describe("assertTestDatabase", () => {
  it.each(["mymoney_test", "mymoney_ci_test", "MYMONEY_TEST", "otraapp_test"])("acepta la base %s", (name) => {
    expect(() => assertTestDatabase(url(name))).not.toThrow();
  });

  it("acepta una URL de pruebas con parametros", () => {
    expect(() => assertTestDatabase(url("mymoney_test", "?schema=public"))).not.toThrow();
  });

  it.each(["mymoney_dev", "mymoney", "mymoney_production", "mymoney_pre", "mymoney_staging", "test", "mymoney_test_old", "mymoney_testing"])(
    "se niega a trabajar con la base %s",
    (name) => {
      expect(() => assertTestDatabase(url(name))).toThrow(/no se ejecutan contra la base/);
    },
  );

  it("el error explica como arreglarlo", () => {
    expect(() => assertTestDatabase(url("mymoney_dev"))).toThrow("TEST_DATABASE_URL");
  });

  it("el error nunca incluye la contrasena ni la URL", () => {
    try {
      assertTestDatabase(url("mymoney_production"));
      throw new Error("deberia haber fallado");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("mymoney_production");
      expect(message).not.toContain("secreto");
      expect(message).not.toContain("postgresql://");
    }
  });

  it("falla sin DATABASE_URL en vez de continuar", () => {
    expect(() => assertTestDatabase(undefined)).toThrow();
  });
});
