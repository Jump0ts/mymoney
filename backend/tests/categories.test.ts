import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerFamily } from "./helpers.js";

async function authedFamily() {
  const { res } = await registerFamily();
  return { token: res.body.token as string };
}

describe("GET /api/categories", () => {
  it("lista las categorías por defecto de la familia", async () => {
    const { token } = await authedFamily();

    const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });
});

describe("POST /api/categories", () => {
  it("crea una categoría nueva", async () => {
    const { token } = await authedFamily();

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mascotas", type: "EXPENSE", color: "#123ABC", icon: "paw" });

    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe("Mascotas");
  });

  it("rechaza una categoría duplicada (mismo nombre y tipo)", async () => {
    const { token } = await authedFamily();

    await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mascotas", type: "EXPENSE" });

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mascotas", type: "EXPENSE" });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/categories/:id", () => {
  it("no permite borrar una categoría con movimientos asociados", async () => {
    const { token } = await authedFamily();

    const catRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mascotas", type: "EXPENSE" });
    const categoryId = catRes.body.category.id;

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId, type: "EXPENSE", amount: 20, occurredAt: new Date().toISOString() });

    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
