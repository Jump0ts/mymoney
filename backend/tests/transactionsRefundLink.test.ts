import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
  patch: (url: string, body: object) => request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
  del: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
});

const YEAR = 2026;
const MONTH = 10;
const OCCURRED_AT = "2026-10-12T10:00:00.000Z";

// Un reembolso del presupuesto es una linea de importe negativo (lo que te devuelve otra persona, por ejemplo la mitad
// de internet): se cubre con un INGRESO, igual que una linea de gasto se paga con un gasto.
const setup = async () => {
  const { res } = await registerUser();
  const token = res.body.token as string;
  const categories = (await as(token).get("/api/categories")).body.categories as { id: string; type: string }[];
  const expenseCategory = categories.find((c) => c.type === "EXPENSE")!;
  const incomeCategory = categories.find((c) => c.type === "INCOME")!;
  const group = (await as(token).post("/api/budgets/groups", { name: "Hogar" })).body.group as { id: string };
  return { token, expenseCategory, incomeCategory, group };
};

type Ctx = Awaited<ReturnType<typeof setup>>;

const createEntry = async ({ token, group }: Ctx, name: string, amount: number) => {
  const res = await as(token).post(`/api/budgets/months/${YEAR}/${MONTH}/entries`, {
    groupId: group.id,
    name,
    amount,
  });
  return res.body.entry as { id: string };
};

const createIncome = (ctx: Ctx, extra: object = {}, amount = 20) =>
  as(ctx.token).post("/api/transactions", {
    categoryId: ctx.incomeCategory.id,
    type: "INCOME",
    amount,
    occurredAt: OCCURRED_AT,
    ...extra,
  });

const createExpense = (ctx: Ctx, extra: object = {}, amount = 40) =>
  as(ctx.token).post("/api/transactions", {
    categoryId: ctx.expenseCategory.id,
    type: "EXPENSE",
    amount,
    occurredAt: OCCURRED_AT,
    ...extra,
  });

type MonthEntry = { id: string; paid: boolean; amount: string; transactions: { id: string; amount: string }[] };

const getEntry = async ({ token }: Ctx, id: string) => {
  const res = await as(token).get(`/api/budgets/months/${YEAR}/${MONTH}`);
  const entries = (res.body.groups as { entries: MonthEntry[] }[]).flatMap((group) => group.entries);
  return entries.find((entry) => entry.id === id)!;
};

describe("cubrir una linea de reembolso con un ingreso", () => {
  it("un ingreso enlazado a un reembolso lo deja pagado y la linea devuelve el importe real", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    const res = await createIncome(ctx, { budgetEntryId: refund.id }, 18.5);

    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("INCOME");
    expect(res.body.transaction.budgetEntry.id).toBe(refund.id);
    const line = await getEntry(ctx, refund.id);
    expect(line.paid).toBe(true);
    expect(line.transactions.map((t) => Number(t.amount))).toEqual([18.5]);
  });

  it("el ingreso cuenta en el resumen: el gasto de internet y su reembolso quedan en el balance", async () => {
    const ctx = await setup();
    const bill = await createEntry(ctx, "Internet", 40);
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    await createExpense(ctx, { budgetEntryId: bill.id }, 40);
    await createIncome(ctx, { budgetEntryId: refund.id }, 20);

    const summary = (await as(ctx.token).get("/api/transactions/summary")).body;
    expect(summary.totalExpense).toBe(40);
    expect(summary.totalIncome).toBe(20);
    expect(summary.balance).toBe(-20);
  });

  it("un ingreso no se enlaza con una linea de gasto, y un gasto no se enlaza con un reembolso", async () => {
    const ctx = await setup();
    const bill = await createEntry(ctx, "Internet", 40);
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    const income = await createIncome(ctx, { budgetEntryId: bill.id });
    const expense = await createExpense(ctx, { budgetEntryId: refund.id });

    expect(income.status).toBe(400);
    expect(income.body.error).toContain("reembolso");
    expect(expense.status).toBe(400);
    expect(expense.body.error).toContain("reembolso");
    expect((await getEntry(ctx, bill.id)).paid).toBe(false);
    expect((await getEntry(ctx, refund.id)).paid).toBe(false);
  });

  it("un ingreso no puede salir de un grupo del presupuesto", async () => {
    const ctx = await setup();

    const res = await createIncome(ctx, { budgetGroupId: ctx.group.id });

    expect(res.status).toBe(400);
  });

  it("una linea de reembolso admite un solo ingreso", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    await createIncome(ctx, { budgetEntryId: refund.id });

    const second = await createIncome(ctx, { budgetEntryId: refund.id });

    expect(second.status).toBe(409);
    expect((await getEntry(ctx, refund.id)).transactions).toHaveLength(1);
  });

  it("cinco ingresos a la vez a un reembolso: pasa uno y los otros cuatro dan 409", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    const results = await Promise.all(Array.from({ length: 5 }, () => createIncome(ctx, { budgetEntryId: refund.id })));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect((await getEntry(ctx, refund.id)).transactions).toHaveLength(1);
  });

  it("no se enlaza con el reembolso de otro usuario", async () => {
    const mine = await setup();
    const other = await setup();
    const othersRefund = await createEntry(other, "Internet (mitad)", -20);

    const res = await createIncome(mine, { budgetEntryId: othersRefund.id });

    expect(res.status).toBe(404);
    expect((await getEntry(other, othersRefund.id)).paid).toBe(false);
  });
});

describe("cambios sobre un ingreso enlazado", () => {
  it("editar solo la descripcion o el importe conserva el enlace", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createIncome(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      description: "Bizum de Ana",
      amount: 19,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry.id).toBe(refund.id);
    const line = await getEntry(ctx, refund.id);
    expect(line.paid).toBe(true);
    expect(line.transactions.map((t) => Number(t.amount))).toEqual([19]);
  });

  it("quitar el enlace deja el reembolso sin pagar y el ingreso suelto", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createIncome(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: null });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, refund.id)).paid).toBe(false);
  });

  it("enlazar un ingreso que ya existe con un reembolso lo marca pagado", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const bill = await createEntry(ctx, "Internet", 40);
    const created = await createIncome(ctx);

    const wrong = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      budgetEntryId: bill.id,
    });
    const right = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      budgetEntryId: refund.id,
    });

    expect(wrong.status).toBe(400);
    expect(right.status).toBe(200);
    expect((await getEntry(ctx, refund.id)).paid).toBe(true);
    expect((await getEntry(ctx, bill.id)).paid).toBe(false);
  });

  it("borrar el ingreso deja el reembolso sin pagar", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createIncome(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).del(`/api/transactions/${created.body.transaction.id}`);

    expect(res.status).toBe(204);
    const line = await getEntry(ctx, refund.id);
    expect(line.paid).toBe(false);
    expect(line.transactions).toEqual([]);
  });

  it("si el ingreso pasa a gasto pierde el enlace y el reembolso queda sin pagar", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createIncome(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "EXPENSE",
      categoryId: ctx.expenseCategory.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, refund.id)).paid).toBe(false);
  });

  it("pedir a la vez un gasto y el enlace con un reembolso es un error", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createIncome(ctx);

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "EXPENSE",
      categoryId: ctx.expenseCategory.id,
      budgetEntryId: refund.id,
    });

    expect(res.status).toBe(400);
  });
});

describe("la linea de reembolso con un ingreso enlazado", () => {
  it("se puede renombrar y cambiar su importe previsto, pero no desmarcar ni pasar a gasto", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    await createIncome(ctx, { budgetEntryId: refund.id });

    const edit = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { name: "Internet Ana", amount: -25 });
    const unpay = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { paid: false });
    const toExpense = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { amount: 25 });

    expect(edit.status).toBe(200);
    expect(unpay.status).toBe(409);
    expect(toExpense.status).toBe(400);
    expect(toExpense.body.error).toContain("gasto");
    expect((await getEntry(ctx, refund.id)).paid).toBe(true);
  });

  it("sin ingreso enlazado se puede pasar de reembolso a gasto y al reves", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    const toExpense = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { amount: 20 });
    const back = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { amount: -20 });

    expect(toExpense.status).toBe(200);
    expect(back.status).toBe(200);
  });

  it("una linea de gasto con su gasto sigue sin poder pasar a reembolso", async () => {
    const ctx = await setup();
    const bill = await createEntry(ctx, "Internet", 40);
    await createExpense(ctx, { budgetEntryId: bill.id });

    const res = await as(ctx.token).patch(`/api/budgets/entries/${bill.id}`, { amount: -40 });

    expect(res.status).toBe(400);
  });
});
