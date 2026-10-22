import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

describe("POST /api/auth/register", () => {
  it("crea un usuario y sus categorías por defecto", async () => {
    const { res, payload } = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe(payload.email);
  });

  it("rechaza un email duplicado", async () => {
    const { payload } = await registerUser();
    const res = await request(app).post("/api/auth/register").send(payload);

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("devuelve un token con credenciales correctas", async () => {
    const { payload } = await registerUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("rechaza credenciales incorrectas", async () => {
    const { payload } = await registerUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("requiere autenticación", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("devuelve el usuario autenticado", async () => {
    const { res: registerRes } = await registerUser();
    const token = registerRes.body.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(registerRes.body.user.id);
  });
});
