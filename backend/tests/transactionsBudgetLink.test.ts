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

const createExpense = (ctx: Ctx, extra: object = {}, amount = 62.3) =>
  as(ctx.token).post("/api/transactions", {
    categoryId: ctx.expenseCategory.id,
    type: "EXPENSE",
    amount,
    occurredAt: OCCURRED_AT,
    ...extra,
  });

type MonthEntry = { id: string; paid: boolean; amount: string; transaction: { id: string; amount: string } | null };

const getEntry = async ({ token }: Ctx, id: string) => {
  const res = await as(token).get(`/api/budgets/months/${YEAR}/${MONTH}`);
  const entries = (res.body.groups as { entries: MonthEntry[] }[]).flatMap((group) => group.entries);
  return entries.find((entry) => entry.id === id)!;
};

describe("enlazar un gasto con una linea del presupuesto", () => {
  it("al crear un gasto enlazado, la linea queda pagada y devuelve el importe real", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);

    const res = await createExpense(ctx, { budgetEntryId: entry.id });

    expect(res.status).toBe(201);
    expect(res.body.transaction.budgetEntry).toEqual({ id: entry.id, name: "Luz", group: { name: "Hogar", color: expect.any(String) } });
    const updated = await getEntry(ctx, entry.id);
    expect(updated.paid).toBe(true);
    expect(updated.amount).toBe("60");
    expect(updated.transaction).toMatchObject({ id: res.body.transaction.id, amount: "62.3" });
  });

  it("sin enlace todo funciona como antes y la linea no cambia", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);

    const res = await createExpense(ctx);

    expect(res.status).toBe(201);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, entry.id)).paid).toBe(false);
  });

  it("un ingreso no se puede enlazar", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);

    const res = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.incomeCategory.id,
      type: "INCOME",
      amount: 100,
      occurredAt: OCCURRED_AT,
      budgetEntryId: entry.id,
    });

    expect(res.status).toBe(400);
    expect((await getEntry(ctx, entry.id)).paid).toBe(false);
  });

  it("una linea de reembolso no admite gasto", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Luz Ivan", -30);

    const res = await createExpense(ctx, { budgetEntryId: refund.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("reembolso");
  });

  it("no se puede enlazar con la linea de otro usuario ni con una que no existe", async () => {
    const mine = await setup();
    const other = await setup();
    const othersEntry = await createEntry(other, "Luz", 60);

    const crossTenant = await createExpense(mine, { budgetEntryId: othersEntry.id });
    const missing = await createExpense(mine, { budgetEntryId: "no-existe" });

    expect(crossTenant.status).toBe(404);
    expect(missing.status).toBe(404);
    expect((await getEntry(other, othersEntry.id)).paid).toBe(false);
    expect((await getEntry(other, othersEntry.id)).transaction).toBeNull();
  });

  it("una linea solo admite un gasto: el segundo da 409 y no cambia nada", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const first = await createExpense(ctx, { budgetEntryId: entry.id }, 62.3);

    const second = await createExpense(ctx, { budgetEntryId: entry.id }, 10);

    expect(second.status).toBe(409);
    expect((await getEntry(ctx, entry.id)).transaction?.id).toBe(first.body.transaction.id);
    const list = await as(ctx.token).get("/api/transactions");
    expect(list.body.transactions).toHaveLength(1);
  });

  it("dos peticiones a la vez sobre la misma linea: solo una se enlaza", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);

    const results = await Promise.all([
      createExpense(ctx, { budgetEntryId: entry.id }, 10),
      createExpense(ctx, { budgetEntryId: entry.id }, 20),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await as(ctx.token).get("/api/transactions")).body.transactions).toHaveLength(1);
  });

  it("la lista de movimientos incluye la linea enlazada", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    await createExpense(ctx, { budgetEntryId: entry.id });
    await createExpense(ctx);

    const list = await as(ctx.token).get("/api/transactions");

    const links = list.body.transactions.map((t: { budgetEntry: { name: string } | null }) => t.budgetEntry?.name ?? null);
    expect(links).toHaveLength(2);
    expect(links).toContain("Luz");
    expect(links).toContain(null);
  });
});

describe("cambiar o quitar el enlace", () => {
  it("quitarlo (budgetEntryId: null) deja la linea sin pagar", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx, { budgetEntryId: entry.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: null });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    const after = await getEntry(ctx, entry.id);
    expect(after.paid).toBe(false);
    expect(after.transaction).toBeNull();
  });

  it("cambiarlo a otra linea libera la anterior y paga la nueva", async () => {
    const ctx = await setup();
    const luz = await createEntry(ctx, "Luz", 60);
    const agua = await createEntry(ctx, "Agua", 25);
    const created = await createExpense(ctx, { budgetEntryId: luz.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: agua.id });

    expect(res.status).toBe(200);
    expect((await getEntry(ctx, luz.id)).paid).toBe(false);
    expect((await getEntry(ctx, agua.id)).paid).toBe(true);
  });

  it("enlazar un gasto que ya existia lo marca en la linea", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx);

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: entry.id });

    expect(res.status).toBe(200);
    expect((await getEntry(ctx, entry.id)).transaction?.id).toBe(created.body.transaction.id);
  });

  it("editar otros campos sin tocar budgetEntryId conserva el enlace, y el importe real sigue al gasto", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx, { budgetEntryId: entry.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { amount: 58, description: "Octubre" });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry.id).toBe(entry.id);
    const after = await getEntry(ctx, entry.id);
    expect(after.paid).toBe(true);
    expect(after.transaction?.amount).toBe("58");
    expect(after.amount).toBe("60");
  });

  it("no se puede mover el enlace a una linea que ya tiene otro gasto", async () => {
    const ctx = await setup();
    const luz = await createEntry(ctx, "Luz", 60);
    const agua = await createEntry(ctx, "Agua", 25);
    const a = await createExpense(ctx, { budgetEntryId: luz.id });
    await createExpense(ctx, { budgetEntryId: agua.id });

    const res = await as(ctx.token).patch(`/api/transactions/${a.body.transaction.id}`, { budgetEntryId: agua.id });

    expect(res.status).toBe(409);
    expect((await getEntry(ctx, luz.id)).transaction?.id).toBe(a.body.transaction.id);
  });

  it("si un gasto enlazado pasa a ingreso pierde el enlace y la linea queda sin pagar", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx, { budgetEntryId: entry.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "INCOME",
      categoryId: ctx.incomeCategory.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, entry.id)).paid).toBe(false);
  });

  it("pedir a la vez un ingreso y un enlace es un error", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx);

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "INCOME",
      categoryId: ctx.incomeCategory.id,
      budgetEntryId: entry.id,
    });

    expect(res.status).toBe(400);
  });

  it("no se puede enlazar un gasto propio con la linea de otro usuario", async () => {
    const mine = await setup();
    const other = await setup();
    const othersEntry = await createEntry(other, "Luz", 60);
    const created = await createExpense(mine);

    const res = await as(mine.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: othersEntry.id });

    expect(res.status).toBe(404);
    expect((await getEntry(other, othersEntry.id)).transaction).toBeNull();
  });
});

describe("borrar el gasto o la linea", () => {
  it("borrar el gasto deja la linea sin pagar", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx, { budgetEntryId: entry.id });

    const res = await as(ctx.token).del(`/api/transactions/${created.body.transaction.id}`);

    expect(res.status).toBe(204);
    const after = await getEntry(ctx, entry.id);
    expect(after.paid).toBe(false);
    expect(after.transaction).toBeNull();
  });

  it("borrar la linea no borra el gasto: solo pierde el enlace", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    const created = await createExpense(ctx, { budgetEntryId: entry.id });

    const res = await as(ctx.token).del(`/api/budgets/entries/${entry.id}`);

    expect(res.status).toBe(204);
    const list = await as(ctx.token).get("/api/transactions");
    expect(list.body.transactions).toHaveLength(1);
    expect(list.body.transactions[0].id).toBe(created.body.transaction.id);
    expect(list.body.transactions[0].budgetEntry).toBeNull();
  });
});

describe("una linea enlazada en el presupuesto", () => {
  it("no se puede marcar como no pagada: hay que desenlazar el gasto", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    await createExpense(ctx, { budgetEntryId: entry.id });

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { paid: false });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("desenlázalo");
    expect((await getEntry(ctx, entry.id)).paid).toBe(true);
  });

  it("no puede pasar a reembolso, pero si se puede renombrar o cambiar el importe previsto", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);
    await createExpense(ctx, { budgetEntryId: entry.id });

    const refund = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { amount: -5 });
    const edit = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { name: "Luz octubre", amount: 70 });

    expect(refund.status).toBe(400);
    expect(edit.status).toBe(200);
    expect((await getEntry(ctx, entry.id)).paid).toBe(true);
  });

  it("una linea sin enlazar sigue pudiendo marcarse y desmarcarse a mano", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, "Luz", 60);

    const on = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { paid: true });
    const off = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { paid: false });

    expect(on.status).toBe(200);
    expect(off.status).toBe(200);
    expect(off.body.entry.paid).toBe(false);
  });
});
