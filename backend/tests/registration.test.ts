import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// `env` se lee una sola vez al importar, así que cada caso carga la app con su propio valor.
const loadApp = async (registrationEnabled?: string) => {
  vi.resetModules();
  vi.stubEnv("REGISTRATION_ENABLED", registrationEnabled ?? "");
  // Vacío = sin definir: borrarla para probar el valor por defecto de verdad.
  if (registrationEnabled === undefined) delete process.env.REGISTRATION_ENABLED;
  const { createApp } = await import("../src/app.js");
  const { prisma } = await import("../src/prisma.js");
  return { app: createApp(), prisma };
};

const payload = () => ({
  name: "Ana",
  email: `ana-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
  password: "password123",
});

describe("registro de cuentas (REGISTRATION_ENABLED)", () => {
  const clients: Array<{ $disconnect: () => Promise<void> }> = [];

  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    await Promise.all(clients.map((client) => client.$disconnect()));
  });

  it("por defecto el registro está abierto", async () => {
    const { app, prisma } = await loadApp();
    clients.push(prisma);

    const res = await request(app).post("/api/auth/register").send(payload());

    expect(res.status).toBe(201);
  });

  it("con REGISTRATION_ENABLED=false rechaza el registro con 403 y no crea la cuenta", async () => {
    const { app, prisma } = await loadApp("false");
    clients.push(prisma);
    const body = payload();

    const res = await request(app).post("/api/auth/register").send(body);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("El registro de cuentas está cerrado");
    expect(await prisma.user.findUnique({ where: { email: body.email } })).toBeNull();
  });

  it("con el registro cerrado quien ya tiene cuenta sigue pudiendo entrar", async () => {
    const open = await loadApp("true");
    clients.push(open.prisma);
    const body = payload();
    await request(open.app).post("/api/auth/register").send(body);

    const closed = await loadApp("false");
    clients.push(closed.prisma);
    const res = await request(closed.app).post("/api/auth/login").send({ email: body.email, password: body.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("rechaza un valor que no sea true/false para no cerrar o abrir por error", async () => {
    vi.resetModules();
    vi.stubEnv("REGISTRATION_ENABLED", "si");

    await expect(import("../src/env.js")).rejects.toThrow("Configuración de entorno inválida");
  });
});
