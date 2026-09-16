import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerFamily } from "./helpers.js";

async function setup() {
  const { res } = await registerFamily();
  const token = res.body.token as string;

  const categoriesRes = await request(app)
    .get("/api/categories")
    .set("Authorization", `Bearer ${token}`);
  const expenseCategory = categoriesRes.body.categories.find((c: { type: string }) => c.type === "EXPENSE");
  const incomeCategory = categoriesRes.body.categories.find((c: { type: string }) => c.type === "INCOME");

  return { token, expenseCategory, incomeCategory };
}

describe("POST /api/transactions", () => {
  it("crea un movimiento de gasto", async () => {
    const { token, expenseCategory } = await setup();

    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: expenseCategory.id,
        type: "EXPENSE",
        amount: 45.5,
        description: "Supermercado",
        occurredAt: "2026-05-10T10:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.transaction.amount).toBe("45.5");
  });

  it("rechaza un importe negativo", async () => {
    const { token, expenseCategory } = await setup();

    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: expenseCategory.id,
        type: "EXPENSE",
        amount: -10,
        occurredAt: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/transactions", () => {
  it("filtra por tipo y categoría", async () => {
    const { token, expenseCategory, incomeCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: incomeCategory.id, type: "INCOME", amount: 1000, occurredAt: "2026-01-05" });

    const res = await request(app)
      .get("/api/transactions")
      .query({ type: "EXPENSE" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].type).toBe("EXPENSE");
  });
});

describe("GET /api/transactions/summary", () => {
  it("agrega totales por tipo y categoría", async () => {
    const { token, expenseCategory, incomeCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: incomeCategory.id, type: "INCOME", amount: 1000, occurredAt: "2026-01-05" });

    const res = await request(app)
      .get("/api/transactions/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(1000);
    expect(res.body.totalExpense).toBe(30);
    expect(res.body.balance).toBe(970);
    expect(res.body.byCategory.length).toBeGreaterThan(0);
  });
});
