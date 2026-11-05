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

// Un reembolso es un GASTO de importe negativo en la categoria del gasto que compensa (lo que te devuelve otra persona,
// por ejemplo la mitad de una cena): resta de esa categoria en los resumenes y no cuenta como ingreso. En el presupuesto
// cubre una linea de reembolso (importe negativo), igual que un gasto paga una linea de gasto.
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

const createExpense = (ctx: Ctx, extra: object = {}, amount = 40) =>
  as(ctx.token).post("/api/transactions", {
    categoryId: ctx.expenseCategory.id,
    type: "EXPENSE",
    amount,
    occurredAt: OCCURRED_AT,
    ...extra,
  });

const createRefund = (ctx: Ctx, extra: object = {}, amount = 20) => createExpense(ctx, extra, -amount);

type MonthEntry = {
  id: string;
  name: string;
  paid: boolean;
  amount: string;
  fromTransaction: boolean;
  transactions: { id: string; amount: string }[];
};

const getEntries = async ({ token }: Ctx) => {
  const res = await as(token).get(`/api/budgets/months/${YEAR}/${MONTH}`);
  return (res.body.groups as { entries: MonthEntry[] }[]).flatMap((group) => group.entries);
};

const getEntry = async (ctx: Ctx, id: string) => (await getEntries(ctx)).find((entry) => entry.id === id)!;

describe("un reembolso es un gasto de importe negativo", () => {
  it("se crea y se lista como un gasto con importe negativo", async () => {
    const ctx = await setup();

    const res = await createRefund(ctx);

    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("EXPENSE");
    expect(Number(res.body.transaction.amount)).toBe(-20);
    const list = (await as(ctx.token).get("/api/transactions?type=EXPENSE")).body.transactions;
    expect(list.map((t: { amount: string }) => Number(t.amount))).toEqual([-20]);
  });

  it("un ingreso sigue siendo positivo, y el importe no puede ser 0", async () => {
    const ctx = await setup();

    const income = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.incomeCategory.id,
      type: "INCOME",
      amount: -20,
      occurredAt: OCCURRED_AT,
    });
    const zero = await createExpense(ctx, {}, 0);

    expect(income.status).toBe(400);
    expect(JSON.stringify(income.body.details)).toContain("reembolso");
    expect(zero.status).toBe(400);
  });

  it("al editar, un ingreso no puede pasar a importe negativo ni un reembolso a ingreso sin cambiar el importe", async () => {
    const ctx = await setup();
    const income = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.incomeCategory.id,
      type: "INCOME",
      amount: 100,
      occurredAt: OCCURRED_AT,
    });
    const refund = await createRefund(ctx);

    const negativeIncome = await as(ctx.token).patch(`/api/transactions/${income.body.transaction.id}`, { amount: -5 });
    const refundToIncome = await as(ctx.token).patch(`/api/transactions/${refund.body.transaction.id}`, {
      type: "INCOME",
      categoryId: ctx.incomeCategory.id,
    });

    expect(negativeIncome.status).toBe(400);
    expect(refundToIncome.status).toBe(400);
    expect(refundToIncome.body.error).toContain("reembolso");
  });

  it("resta de su categoria y del gasto total, y no cuenta como ingreso: la cena de 50 con 25 de vuelta deja 25", async () => {
    const ctx = await setup();
    await createExpense(ctx, {}, 50);
    await createRefund(ctx, {}, 25);

    const summary = (await as(ctx.token).get("/api/transactions/summary")).body;

    expect(summary.totalExpense).toBe(25);
    expect(summary.totalIncome).toBe(0);
    expect(summary.balance).toBe(-25);
    const category = summary.byCategory.find((c: { categoryId: string }) => c.categoryId === ctx.expenseCategory.id);
    expect(category.total).toBe(25);
    const month = summary.byMonth.find((m: { type: string }) => m.type === "EXPENSE");
    expect(month.total).toBe(25);
    expect(summary.byMonth.some((m: { type: string }) => m.type === "INCOME")).toBe(false);
  });

  it("un reembolso mayor que el gasto de su categoria deja la categoria en negativo (la app no la dibuja)", async () => {
    const ctx = await setup();
    await createExpense(ctx, {}, 10);
    await createRefund(ctx, {}, 30);

    const summary = (await as(ctx.token).get("/api/transactions/summary")).body;

    expect(summary.totalExpense).toBe(-20);
    expect(summary.byCategory[0].total).toBe(-20);
  });
});

describe("cubrir una linea de reembolso del presupuesto", () => {
  it("un reembolso enlazado deja la linea pagada y devuelve el importe real con su signo", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    const res = await createRefund(ctx, { budgetEntryId: refund.id }, 18.5);

    expect(res.status).toBe(201);
    expect(res.body.transaction.budgetEntry.id).toBe(refund.id);
    const line = await getEntry(ctx, refund.id);
    expect(line.paid).toBe(true);
    expect(line.transactions.map((t) => Number(t.amount))).toEqual([-18.5]);
  });

  it("un gasto no se enlaza con un reembolso, ni un reembolso con una linea de gasto", async () => {
    const ctx = await setup();
    const bill = await createEntry(ctx, "Internet", 40);
    const refundLine = await createEntry(ctx, "Internet (mitad)", -20);

    const refundToBill = await createRefund(ctx, { budgetEntryId: bill.id });
    const expenseToRefund = await createExpense(ctx, { budgetEntryId: refundLine.id });

    expect(refundToBill.status).toBe(400);
    expect(refundToBill.body.error).toContain("reembolso");
    expect(expenseToRefund.status).toBe(400);
    expect(expenseToRefund.body.error).toContain("reembolso");
    expect((await getEntry(ctx, bill.id)).paid).toBe(false);
    expect((await getEntry(ctx, refundLine.id)).paid).toBe(false);
  });

  it("un ingreso no se enlaza con ninguna linea", async () => {
    const ctx = await setup();
    const refundLine = await createEntry(ctx, "Internet (mitad)", -20);

    const res = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.incomeCategory.id,
      type: "INCOME",
      amount: 20,
      occurredAt: OCCURRED_AT,
      budgetEntryId: refundLine.id,
    });

    expect(res.status).toBe(400);
  });

  it("una linea de reembolso admite un solo reembolso", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    await createRefund(ctx, { budgetEntryId: refund.id });

    const second = await createRefund(ctx, { budgetEntryId: refund.id });

    expect(second.status).toBe(409);
    expect((await getEntry(ctx, refund.id)).transactions).toHaveLength(1);
  });

  it("cinco reembolsos a la vez a una linea: pasa uno y los otros cuatro dan 409", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);

    const results = await Promise.all(Array.from({ length: 5 }, () => createRefund(ctx, { budgetEntryId: refund.id })));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect((await getEntry(ctx, refund.id)).transactions).toHaveLength(1);
  });

  it("no se enlaza con el reembolso de otro usuario", async () => {
    const mine = await setup();
    const other = await setup();
    const othersRefund = await createEntry(other, "Internet (mitad)", -20);

    const res = await createRefund(mine, { budgetEntryId: othersRefund.id });

    expect(res.status).toBe(404);
    expect((await getEntry(other, othersRefund.id)).paid).toBe(false);
  });

  it("un sobre no admite reembolsos (es una linea de gasto)", async () => {
    const ctx = await setup();
    const envelope = (
      await as(ctx.token).post(`/api/budgets/months/${YEAR}/${MONTH}/entries`, {
        groupId: ctx.group.id,
        name: "Supermercado",
        amount: 300,
        envelope: true,
      })
    ).body.entry as { id: string };

    const res = await createRefund(ctx, { budgetEntryId: envelope.id });

    expect(res.status).toBe(400);
  });
});

describe("cambios sobre un reembolso enlazado", () => {
  it("editar solo la descripcion o la cantidad (sin cambiar el signo) conserva el enlace", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createRefund(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      description: "Bizum de Ana",
      amount: -19,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry.id).toBe(refund.id);
    const line = await getEntry(ctx, refund.id);
    expect(line.paid).toBe(true);
    expect(line.transactions.map((t) => Number(t.amount))).toEqual([-19]);
  });

  it("si el importe cambia de signo ya no encaja con su linea: la pierde y la linea queda sin pagar", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createRefund(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { amount: 20 });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, refund.id)).paid).toBe(false);
  });

  it("quitar el enlace deja el reembolso sin pagar y el movimiento suelto", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createRefund(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: null });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, refund.id)).paid).toBe(false);
  });

  it("enlazar un reembolso que ya existe con su linea lo marca pagado; con una linea de gasto, no", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const bill = await createEntry(ctx, "Internet", 40);
    const created = await createRefund(ctx);

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

  it("borrar el reembolso deja la linea sin pagar", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createRefund(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).del(`/api/transactions/${created.body.transaction.id}`);

    expect(res.status).toBe(204);
    const line = await getEntry(ctx, refund.id);
    expect(line.paid).toBe(false);
    expect(line.transactions).toEqual([]);
  });

  it("si el reembolso pasa a ingreso pierde el enlace (un ingreso no cubre ninguna linea)", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    const created = await createRefund(ctx, { budgetEntryId: refund.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "INCOME",
      categoryId: ctx.incomeCategory.id,
      amount: 20,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect((await getEntry(ctx, refund.id)).paid).toBe(false);
  });
});

describe("reembolso nuevo en un grupo (la cena de 50 con 25 de vuelta)", () => {
  it("crea su propia linea de reembolso ya pagada y enlazada, junto a la linea del gasto", async () => {
    const ctx = await setup();
    const dinner = await createExpense(ctx, { budgetGroupId: ctx.group.id, description: "Cena cita" }, 50);
    const back = await createRefund(ctx, { budgetGroupId: ctx.group.id, description: "Cena cita (mitad)" }, 25);

    expect(dinner.status).toBe(201);
    expect(back.status).toBe(201);
    const entries = await getEntries(ctx);
    const dinnerLine = entries.find((e) => e.name === "Cena cita")!;
    const backLine = entries.find((e) => e.name === "Cena cita (mitad)")!;
    expect(Number(dinnerLine.amount)).toBe(50);
    expect(Number(backLine.amount)).toBe(-25);
    expect([dinnerLine.paid, backLine.paid]).toEqual([true, true]);
    expect([dinnerLine.fromTransaction, backLine.fromTransaction]).toEqual([true, true]);
    expect(backLine.transactions.map((t) => Number(t.amount))).toEqual([-25]);
  });

  it("la linea del reembolso sigue a su movimiento: cambia con el importe y se borra con el", async () => {
    const ctx = await setup();
    const back = await createRefund(ctx, { budgetGroupId: ctx.group.id, description: "Cena (mitad)" }, 25);
    const id = back.body.transaction.id as string;

    await as(ctx.token).patch(`/api/transactions/${id}`, { amount: -30, description: "Cena (parte de Ana)" });
    const edited = (await getEntries(ctx)).find((e) => e.fromTransaction)!;
    expect(Number(edited.amount)).toBe(-30);
    expect(edited.name).toBe("Cena (parte de Ana)");

    await as(ctx.token).del(`/api/transactions/${id}`);
    expect(await getEntries(ctx)).toEqual([]);
  });

  it("si el reembolso nacido en el grupo pasa a ser un gasto, su linea desaparece", async () => {
    const ctx = await setup();
    const back = await createRefund(ctx, { budgetGroupId: ctx.group.id }, 25);

    const res = await as(ctx.token).patch(`/api/transactions/${back.body.transaction.id}`, { amount: 25 });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect(await getEntries(ctx)).toEqual([]);
  });

  it("un ingreso sigue sin poder salir de un grupo", async () => {
    const ctx = await setup();

    const res = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.incomeCategory.id,
      type: "INCOME",
      amount: 20,
      occurredAt: OCCURRED_AT,
      budgetGroupId: ctx.group.id,
    });

    expect(res.status).toBe(400);
  });
});

describe("la linea de reembolso con un reembolso enlazado", () => {
  it("se puede renombrar y cambiar su importe previsto, pero no desmarcar ni pasar a gasto", async () => {
    const ctx = await setup();
    const refund = await createEntry(ctx, "Internet (mitad)", -20);
    await createRefund(ctx, { budgetEntryId: refund.id });

    const edit = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { name: "Internet Ana", amount: -25 });
    const unpay = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { paid: false });
    const toExpense = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { amount: 25 });

    expect(edit.status).toBe(200);
    expect(unpay.status).toBe(409);
    expect(toExpense.status).toBe(400);
    expect(toExpense.body.error).toContain("gasto");
    expect((await getEntry(ctx, refund.id)).paid).toBe(true);
  });

  it("sin reembolso enlazado se puede pasar de reembolso a gasto y al reves", async () => {
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
