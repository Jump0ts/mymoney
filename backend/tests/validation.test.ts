import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

// Lo que el cliente recibe cuando una peticion no valida. Se fija aqui porque depende de la libreria de validacion
// (zod): el formato de `details` es { formErrors, fieldErrors } y los mensajes propios se conservan.
const asUser = async () => {
  const { res } = await registerUser();
  return res.body.token as string;
};

describe("errores de validacion de la API", () => {
  it("un cuerpo vacio da 400 con el error general y los campos que faltan", async () => {
    const res = await request(app).post("/api/auth/register").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Petición inválida");
    expect(res.body.details.formErrors).toEqual([]);
    expect(Object.keys(res.body.details.fieldErrors).sort()).toEqual(["email", "name", "password"]);
    for (const messages of Object.values(res.body.details.fieldErrors)) {
      expect(Array.isArray(messages)).toBe(true);
      expect((messages as string[]).every((message) => typeof message === "string" && message.length > 0)).toBe(true);
    }
  });

  it("rechaza un email mal formado y una contraseña corta, cada uno en su campo", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ana", email: "no-es-un-email", password: "corta" });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details.fieldErrors).sort()).toEqual(["email", "password"]);
  });

  it("acepta un email correcto", async () => {
    const { res } = await registerUser({ email: `valido-${Date.now()}@test.local` });

    expect(res.status).toBe(201);
  });

  it("conserva los mensajes propios en español de los esquemas", async () => {
    const token = await asUser();

    const res = await request(app)
      .post("/api/budgets/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Hogar", limit: -5 });

    expect(res.status).toBe(400);
    expect(res.body.details.fieldErrors.limit).toContain("El límite debe ser mayor que 0");
  });

  it("los numeros y las fechas que llegan como texto siguen validandose (coerce)", async () => {
    const token = await asUser();
    const ok = await request(app).get("/api/budgets/months/2026/10").set("Authorization", `Bearer ${token}`);
    const badMonth = await request(app).get("/api/budgets/months/2026/13").set("Authorization", `Bearer ${token}`);
    const badDate = await request(app)
      .get("/api/transactions?from=no-es-una-fecha")
      .set("Authorization", `Bearer ${token}`);

    expect(ok.status).toBe(200);
    expect(badMonth.status).toBe(400);
    expect(badDate.status).toBe(400);
  });

  it("un importe fuera de rango o un tipo desconocido se rechaza", async () => {
    const token = await asUser();
    const categories = (await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`)).body
      .categories as { id: string; type: string }[];
    const categoryId = categories.find((c) => c.type === "EXPENSE")!.id;
    const post = (body: object) =>
      request(app).post("/api/transactions").set("Authorization", `Bearer ${token}`).send(body);

    const tooBig = await post({ categoryId, type: "EXPENSE", amount: 2_000_000, occurredAt: new Date().toISOString() });
    const badType = await post({ categoryId, type: "OTRO", amount: 5, occurredAt: new Date().toISOString() });
    const good = await post({ categoryId, type: "EXPENSE", amount: 5, occurredAt: new Date().toISOString() });

    expect(tooBig.status).toBe(400);
    expect(badType.status).toBe(400);
    expect(good.status).toBe(201);
  });

  it("budgetEntryId admite null y omitido, pero no un numero", async () => {
    const token = await asUser();
    const categories = (await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`)).body
      .categories as { id: string; type: string }[];
    const categoryId = categories.find((c) => c.type === "EXPENSE")!.id;
    const post = (extra: object) =>
      request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({ categoryId, type: "EXPENSE", amount: 5, occurredAt: new Date().toISOString(), ...extra });

    expect((await post({ budgetEntryId: null })).status).toBe(201);
    expect((await post({})).status).toBe(201);
    expect((await post({ budgetEntryId: 123 })).status).toBe(400);
    expect((await post({ budgetEntryId: "" })).status).toBe(400);
  });
});
