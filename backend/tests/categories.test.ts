import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

async function authedUser() {
  const { res } = await registerUser();
  return { token: res.body.token as string };
}

describe("GET /api/categories", () => {
  it("lista las categorías por defecto del usuario", async () => {
    const { token } = await authedUser();

    const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it("no muestra las categorías de otro usuario", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();

    await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Solo de Ana", type: "EXPENSE" });

    const res = await request(app).get("/api/categories").set("Authorization", `Bearer ${tokenB}`);

    expect(res.body.categories.some((c: { name: string }) => c.name === "Solo de Ana")).toBe(false);
  });
});

describe("POST /api/categories", () => {
  it("crea una categoría nueva", async () => {
    const { token } = await authedUser();

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mascotas", type: "EXPENSE", color: "#123ABC", icon: "paw" });

    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe("Mascotas");
  });

  it("rechaza una categoría duplicada (mismo nombre y tipo)", async () => {
    const { token } = await authedUser();

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

  it("permite que dos usuarios distintos tengan una categoria con el mismo nombre", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();

    const resA = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Mascotas", type: "EXPENSE" });
    const resB = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Mascotas", type: "EXPENSE" });

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });
});

describe("DELETE /api/categories/:id", () => {
  it("no permite borrar una categoría con movimientos asociados", async () => {
    const { token } = await authedUser();

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

  it("no permite borrar la categoría de otro usuario", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();

    const catRes = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Solo de Ana", type: "EXPENSE" });

    const res = await request(app)
      .delete(`/api/categories/${catRes.body.category.id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
