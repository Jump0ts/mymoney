import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

const setup = async () => {
  const { res } = await registerUser();
  const token = res.body.token as string;

  const categoriesRes = await request(app)
    .get("/api/categories")
    .set("Authorization", `Bearer ${token}`);
  const expenseCategory = categoriesRes.body.categories.find((c: { type: string }) => c.type === "EXPENSE");
  const incomeCategory = categoriesRes.body.categories.find((c: { type: string }) => c.type === "INCOME");

  return { token, expenseCategory, incomeCategory };
};

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

  it("no devuelve movimientos de otro usuario", async () => {
    const { token, expenseCategory } = await setup();
    const { token: otherToken, expenseCategory: otherExpenseCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ categoryId: otherExpenseCategory.id, type: "EXPENSE", amount: 999, occurredAt: "2026-01-01" });

    const res = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].amount).toBe("30");
  });

  it("filtra por rango de fechas (from/to), usado por el selector de mes de la app", async () => {
    const { token, expenseCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 10, occurredAt: "2026-05-31T23:00:00.000Z" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 20, occurredAt: "2026-06-15T12:00:00.000Z" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-07-01T00:00:00.000Z" });

    const res = await request(app)
      .get("/api/transactions")
      .query({ from: "2026-06-01T00:00:00.000Z", to: "2026-06-30T23:59:59.999Z" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].amount).toBe("20");
  });
});

describe("GET /api/transactions (paginación)", () => {
  it("pagina los resultados con page y pageSize", async () => {
    const { token, expenseCategory } = await setup();

    const dates = ["2026-01-01", "2026-01-02", "2026-01-03"];
    for (const occurredAt of dates) {
      await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 10, occurredAt });
    }

    const firstPage = await request(app)
      .get("/api/transactions")
      .query({ pageSize: 2, page: 1 })
      .set("Authorization", `Bearer ${token}`);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.transactions).toHaveLength(2);
    expect(firstPage.body.pagination).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    // orden mas reciente primero
    expect(firstPage.body.transactions[0].occurredAt).toContain("2026-01-03");

    const secondPage = await request(app)
      .get("/api/transactions")
      .query({ pageSize: 2, page: 2 })
      .set("Authorization", `Bearer ${token}`);

    expect(secondPage.body.transactions).toHaveLength(1);
    expect(secondPage.body.pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(secondPage.body.transactions[0].occurredAt).toContain("2026-01-01");
  });

  it("devuelve una pagina vacia si se pide una pagina fuera de rango", async () => {
    const { token, expenseCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 10, occurredAt: "2026-01-01" });

    const res = await request(app)
      .get("/api/transactions")
      .query({ page: 5, pageSize: 10 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.transactions).toHaveLength(0);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe("PATCH /api/transactions/:id", () => {
  it("actualiza el importe y la descripción de un movimiento propio", async () => {
    const { token, expenseCategory } = await setup();

    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: expenseCategory.id,
        type: "EXPENSE",
        amount: 30,
        description: "Original",
        occurredAt: "2026-01-01",
      });

    const res = await request(app)
      .patch(`/api/transactions/${created.body.transaction.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 55.75, description: "Corregido" });

    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe("55.75");
    expect(res.body.transaction.description).toBe("Corregido");
  });

  it("rechaza cambiar a una categoría de otro usuario", async () => {
    const { token, expenseCategory } = await setup();
    const { expenseCategory: otherExpenseCategory } = await setup();

    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });

    const res = await request(app)
      .patch(`/api/transactions/${created.body.transaction.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: otherExpenseCategory.id });

    expect(res.status).toBe(404);
  });

  it("no permite editar el movimiento de otro usuario", async () => {
    const { token, expenseCategory } = await setup();
    const { token: otherToken } = await setup();

    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });

    const res = await request(app)
      .patch(`/api/transactions/${created.body.transaction.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ amount: 999 });

    expect(res.status).toBe(404);
  });

  it("devuelve 404 si el movimiento no existe", async () => {
    const { token } = await setup();

    const res = await request(app)
      .patch("/api/transactions/no-existe")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 10 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("borra un movimiento propio", async () => {
    const { token, expenseCategory } = await setup();

    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });

    const res = await request(app)
      .delete(`/api/transactions/${created.body.transaction.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const list = await request(app).get("/api/transactions").set("Authorization", `Bearer ${token}`);
    expect(list.body.transactions).toHaveLength(0);
  });

  it("no permite borrar el movimiento de otro usuario", async () => {
    const { token, expenseCategory } = await setup();
    const { token: otherToken } = await setup();

    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });

    const res = await request(app)
      .delete(`/api/transactions/${created.body.transaction.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);

    const list = await request(app).get("/api/transactions").set("Authorization", `Bearer ${token}`);
    expect(list.body.transactions).toHaveLength(1);
  });

  it("devuelve 404 si el movimiento no existe", async () => {
    const { token } = await setup();

    const res = await request(app)
      .delete("/api/transactions/no-existe")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
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

  it("limita los totales al rango from/to, usado por el selector de mes de la app", async () => {
    const { token, expenseCategory, incomeCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: incomeCategory.id, type: "INCOME", amount: 1000, occurredAt: "2026-05-20" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 40, occurredAt: "2026-06-10" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 999, occurredAt: "2026-07-01" });

    const res = await request(app)
      .get("/api/transactions/summary")
      .query({ from: "2026-06-01T00:00:00.000Z", to: "2026-06-30T23:59:59.999Z" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(0);
    expect(res.body.totalExpense).toBe(40);
    expect(res.body.balance).toBe(-40);
  });

  it("no mezcla totales entre usuarios distintos", async () => {
    const { token, expenseCategory } = await setup();
    const { token: otherToken, expenseCategory: otherExpenseCategory } = await setup();

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: expenseCategory.id, type: "EXPENSE", amount: 30, occurredAt: "2026-01-01" });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ categoryId: otherExpenseCategory.id, type: "EXPENSE", amount: 999, occurredAt: "2026-01-01" });

    const res = await request(app)
      .get("/api/transactions/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.totalExpense).toBe(30);
  });
});
