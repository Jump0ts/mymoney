import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/prisma.js";
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
  const userId = res.body.user.id as string;
  const categories = (await as(token).get("/api/categories")).body.categories as { id: string; name: string; type: string }[];
  const expenseCategory = categories.find((c) => c.type === "EXPENSE")!;
  const otherCategory = categories.filter((c) => c.type === "EXPENSE")[1]!;
  const incomeCategory = categories.find((c) => c.type === "INCOME")!;
  const wishes = (await as(token).post("/api/budgets/groups", { name: "Deseos", isRemainder: true })).body.group as {
    id: string;
  };
  const home = (await as(token).post("/api/budgets/groups", { name: "Hogar" })).body.group as { id: string };
  return { token, userId, expenseCategory, otherCategory, incomeCategory, wishes, home };
};

type Ctx = Awaited<ReturnType<typeof setup>>;

const createExpense = (ctx: Ctx, extra: object = {}, amount = 3.5) =>
  as(ctx.token).post("/api/transactions", {
    categoryId: ctx.expenseCategory.id,
    type: "EXPENSE",
    amount,
    occurredAt: OCCURRED_AT,
    ...extra,
  });

type MonthEntry = {
  id: string;
  name: string;
  amount: string;
  paid: boolean;
  itemId: string | null;
  position: number;
  transaction: { id: string; amount: string } | null;
};
type MonthGroup = { id: string; entries: MonthEntry[] };

const getMonth = async ({ token }: Ctx, year = YEAR, month = MONTH) =>
  (await as(token).get(`/api/budgets/months/${year}/${month}`)).body as { groups: MonthGroup[] };

const entriesOf = async (ctx: Ctx, groupId: string, year = YEAR, month = MONTH) =>
  (await getMonth(ctx, year, month)).groups.find((group) => group.id === groupId)!.entries;

const createLine = async ({ token }: Ctx, groupId: string, name: string, amount: number) =>
  (await as(token).post(`/api/budgets/months/${YEAR}/${MONTH}/entries`, { groupId, name, amount })).body.entry as {
    id: string;
  };

describe("crear un gasto que sale de un grupo del presupuesto", () => {
  it("crea el gasto y, a la vez, una linea puntual pagada y enlazada en el mes del gasto", async () => {
    const ctx = await setup();

    const res = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    expect(res.status).toBe(201);
    expect(res.body.transaction.budgetEntry).toMatchObject({ name: "Cerveza", group: { name: "Deseos" } });
    const [line] = await entriesOf(ctx, ctx.wishes.id);
    expect(line).toMatchObject({ name: "Cerveza", amount: "3.5", paid: true, itemId: null });
    expect(line.transaction).toMatchObject({ id: res.body.transaction.id, amount: "3.5" });
  });

  it("la linea nace marcada como creada con el gasto", async () => {
    const ctx = await setup();

    const res = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    const entry = await prisma.budgetEntry.findUniqueOrThrow({ where: { id: res.body.transaction.budgetEntry.id } });
    expect(entry.fromTransaction).toBe(true);
    expect(entry.userId).toBe(ctx.userId);
  });

  it("sin descripcion la linea se llama como la categoria", async () => {
    const ctx = await setup();

    const res = await createExpense(ctx, { budgetGroupId: ctx.wishes.id });

    expect(res.body.transaction.budgetEntry.name).toBe(ctx.expenseCategory.name);
  });

  it("una descripcion larga se recorta al limite del nombre de una linea", async () => {
    const ctx = await setup();

    const res = await createExpense(ctx, { description: "x".repeat(150), budgetGroupId: ctx.wishes.id });

    expect(res.status).toBe(201);
    expect(res.body.transaction.budgetEntry.name).toBe("x".repeat(60));
    expect(res.body.transaction.description).toBe("x".repeat(150));
  });

  it("deja la linea al final del grupo, detras de las que ya habia", async () => {
    const ctx = await setup();
    await createLine(ctx, ctx.wishes.id, "Cine", 10);

    await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });
    await createExpense(ctx, { description: "Tapa", budgetGroupId: ctx.wishes.id });

    const entries = await entriesOf(ctx, ctx.wishes.id);
    expect(entries.map((entry) => entry.name)).toEqual(["Cine", "Cerveza", "Tapa"]);
  });

  it("el gasto cae en el mes de su fecha, no en el actual, y ese mes se guarda con su plantilla", async () => {
    const ctx = await setup();
    // Ya hay presupuesto en octubre; en septiembre (anterior al primero) el mes se crea vacio.
    await getMonth(ctx);

    await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id, occurredAt: "2026-09-20T10:00:00.000Z" });

    const september = await entriesOf(ctx, ctx.wishes.id, 2026, 9);
    expect(september.map((entry) => entry.name)).toEqual(["Cerveza"]);
    expect(await entriesOf(ctx, ctx.wishes.id)).toEqual([]);
  });

  it("si el mes tiene plantilla, la linea nueva convive con las recurrentes de ese mes", async () => {
    const ctx = await setup();
    await as(ctx.token).post(`/api/budgets/months/${YEAR}/${MONTH}/entries`, {
      groupId: ctx.wishes.id,
      name: "Gimnasio",
      amount: 30,
      recurring: true,
    });

    await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id, occurredAt: "2026-11-03T10:00:00.000Z" });

    const november = await entriesOf(ctx, ctx.wishes.id, 2026, 11);
    expect(november.map((entry) => entry.name)).toEqual(["Gimnasio", "Cerveza"]);
    expect(november[0].paid).toBe(false);
  });

  it("no se puede combinar con enlazar una linea que ya existe", async () => {
    const ctx = await setup();
    const line = await createLine(ctx, ctx.home.id, "Luz", 60);

    const res = await createExpense(ctx, { budgetEntryId: line.id, budgetGroupId: ctx.wishes.id });

    expect(res.status).toBe(400);
    expect(await prisma.transaction.count({ where: { userId: ctx.userId } })).toBe(0);
  });

  it("un ingreso no puede salir de un grupo", async () => {
    const ctx = await setup();

    const res = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.incomeCategory.id,
      type: "INCOME",
      amount: 100,
      occurredAt: OCCURRED_AT,
      budgetGroupId: ctx.wishes.id,
    });

    expect(res.status).toBe(400);
    expect(await prisma.budgetEntry.count({ where: { userId: ctx.userId } })).toBe(0);
  });

  it("un grupo de otro usuario no se puede usar y no se guarda nada", async () => {
    const ctx = await setup();
    const stranger = await setup();

    const res = await createExpense(ctx, { budgetGroupId: stranger.wishes.id });

    expect(res.status).toBe(404);
    expect(await prisma.transaction.count({ where: { userId: ctx.userId } })).toBe(0);
    expect(await prisma.budgetEntry.count({ where: { userId: ctx.userId } })).toBe(0);
    expect(await prisma.budgetEntry.count({ where: { userId: stranger.userId } })).toBe(0);
  });

  it("un grupo que no existe da 404", async () => {
    const ctx = await setup();

    expect((await createExpense(ctx, { budgetGroupId: "no-existe" })).status).toBe(404);
  });

  it("si la categoria no es suya no se crea ni el gasto ni la linea", async () => {
    const ctx = await setup();
    const stranger = await setup();

    const res = await createExpense(ctx, { categoryId: stranger.expenseCategory.id, budgetGroupId: ctx.wishes.id });

    expect(res.status).toBe(404);
    expect(await prisma.budgetEntry.count({ where: { userId: ctx.userId } })).toBe(0);
  });

  it("una fecha demasiado lejana se rechaza sin dejar nada a medias", async () => {
    const ctx = await setup();

    const res = await createExpense(ctx, { budgetGroupId: ctx.wishes.id, occurredAt: "2099-01-10T10:00:00.000Z" });

    expect(res.status).toBe(400);
    expect(await prisma.transaction.count({ where: { userId: ctx.userId } })).toBe(0);
    expect(await prisma.budgetEntry.count({ where: { userId: ctx.userId } })).toBe(0);
  });

  it("sin grupo todo funciona como antes y no se crea ninguna linea", async () => {
    const ctx = await setup();

    const res = await createExpense(ctx, { description: "Cerveza" });

    expect(res.status).toBe(201);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect(await prisma.budgetEntry.count({ where: { userId: ctx.userId } })).toBe(0);
  });
});

describe("borrar el gasto que creo una linea", () => {
  it("la linea se borra con el gasto", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    const res = await as(ctx.token).del(`/api/transactions/${created.body.transaction.id}`);

    expect(res.status).toBe(204);
    expect(await entriesOf(ctx, ctx.wishes.id)).toEqual([]);
  });

  it("una linea que ya existia (la escribiste tu) solo vuelve a quedar sin pagar", async () => {
    const ctx = await setup();
    const line = await createLine(ctx, ctx.home.id, "Seguro coche", 300);
    const created = await createExpense(ctx, { budgetEntryId: line.id }, 300);

    await as(ctx.token).del(`/api/transactions/${created.body.transaction.id}`);

    const [kept] = await entriesOf(ctx, ctx.home.id);
    expect(kept).toMatchObject({ id: line.id, paid: false, transaction: null });
  });

  it("borrar la linea desde el presupuesto deja el gasto en Movimientos", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });
    const lineId = created.body.transaction.budgetEntry.id as string;

    expect((await as(ctx.token).del(`/api/budgets/entries/${lineId}`)).status).toBe(204);

    const list = await as(ctx.token).get("/api/transactions");
    expect(list.body.transactions).toHaveLength(1);
    expect(list.body.transactions[0].budgetEntry).toBeNull();
  });
});

describe("editar el gasto que creo una linea", () => {
  it("cambiar importe y descripcion actualiza la linea", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      amount: 4.2,
      description: "Cerveza grande",
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry.name).toBe("Cerveza grande");
    const [line] = await entriesOf(ctx, ctx.wishes.id);
    expect(line).toMatchObject({ name: "Cerveza grande", amount: "4.2", paid: true });
  });

  it("sin descripcion, cambiar la categoria cambia el nombre de la linea", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { budgetGroupId: ctx.wishes.id });

    await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { categoryId: ctx.otherCategory.id });

    const [line] = await entriesOf(ctx, ctx.wishes.id);
    expect(line.name).toBe(ctx.otherCategory.name);
  });

  it("cambiar solo la categoria con descripcion no toca el nombre de la linea", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { categoryId: ctx.otherCategory.id });

    const [line] = await entriesOf(ctx, ctx.wishes.id);
    expect(line.name).toBe("Cerveza");
  });

  it("al pasar la fecha a otro mes, la linea se rehace en ese mes y en el mismo grupo", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });
    const oldLineId = created.body.transaction.budgetEntry.id as string;

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      occurredAt: "2026-11-02T10:00:00.000Z",
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry.id).not.toBe(oldLineId);
    expect(await entriesOf(ctx, ctx.wishes.id)).toEqual([]);
    const [moved] = await entriesOf(ctx, ctx.wishes.id, 2026, 11);
    expect(moved).toMatchObject({ name: "Cerveza", amount: "3.5", paid: true });
    expect(await prisma.budgetEntry.findUnique({ where: { id: oldLineId } })).toBeNull();
  });

  it("cambiar de dia dentro del mismo mes no toca la linea", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });
    const lineId = created.body.transaction.budgetEntry.id as string;

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      occurredAt: "2026-10-20T10:00:00.000Z",
    });

    expect(res.body.transaction.budgetEntry.id).toBe(lineId);
  });

  it("si el gasto pasa a ingreso, pierde el enlace y la linea que nacio con el se borra", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "INCOME",
      categoryId: ctx.incomeCategory.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toBeNull();
    expect(await entriesOf(ctx, ctx.wishes.id)).toEqual([]);
  });

  it("enlazarlo despues con otra linea borra la que nacio con el y deja pagada la otra", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });
    const other = await createLine(ctx, ctx.home.id, "Luz", 60);

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: other.id });

    expect(res.status).toBe(200);
    expect(await entriesOf(ctx, ctx.wishes.id)).toEqual([]);
    expect((await entriesOf(ctx, ctx.home.id))[0]).toMatchObject({ id: other.id, paid: true });
  });

  it("quitarle el enlace borra la linea que nacio con el y el gasto sigue existiendo", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza", budgetGroupId: ctx.wishes.id });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, { budgetEntryId: null });

    expect(res.body.transaction.budgetEntry).toBeNull();
    expect(await entriesOf(ctx, ctx.wishes.id)).toEqual([]);
    expect(await prisma.transaction.count({ where: { userId: ctx.userId } })).toBe(1);
  });

  it("un gasto sin enlace puede pasar a salir de un grupo despues", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza" });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      budgetGroupId: ctx.wishes.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry).toMatchObject({ name: "Cerveza", group: { name: "Deseos" } });
    expect((await entriesOf(ctx, ctx.wishes.id))[0]).toMatchObject({ paid: true, amount: "3.5" });
  });

  it("un gasto enlazado a una linea que ya existia puede pasar a otro grupo: la antigua vuelve a quedar sin pagar", async () => {
    const ctx = await setup();
    const line = await createLine(ctx, ctx.home.id, "Luz", 60);
    const created = await createExpense(ctx, { budgetEntryId: line.id }, 60);

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      budgetGroupId: ctx.wishes.id,
    });

    expect(res.status).toBe(200);
    expect((await entriesOf(ctx, ctx.home.id))[0]).toMatchObject({ id: line.id, paid: false, transaction: null });
    expect((await entriesOf(ctx, ctx.wishes.id))).toHaveLength(1);
  });

  it("no se puede pedir a la vez una linea y un grupo, ni un grupo para un ingreso", async () => {
    const ctx = await setup();
    const created = await createExpense(ctx, { description: "Cerveza" });
    const line = await createLine(ctx, ctx.home.id, "Luz", 60);

    const both = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      budgetEntryId: line.id,
      budgetGroupId: ctx.wishes.id,
    });
    const income = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      type: "INCOME",
      categoryId: ctx.incomeCategory.id,
      budgetGroupId: ctx.wishes.id,
    });

    expect(both.status).toBe(400);
    expect(income.status).toBe(400);
    expect(await prisma.budgetEntry.count({ where: { userId: ctx.userId, fromTransaction: true } })).toBe(0);
  });

  it("un grupo de otro usuario da 404 al editar y el gasto no cambia", async () => {
    const ctx = await setup();
    const stranger = await setup();
    const created = await createExpense(ctx, { description: "Cerveza" });

    const res = await as(ctx.token).patch(`/api/transactions/${created.body.transaction.id}`, {
      budgetGroupId: stranger.wishes.id,
      amount: 99,
    });

    expect(res.status).toBe(404);
    const list = await as(ctx.token).get("/api/transactions");
    expect(list.body.transactions[0]).toMatchObject({ amount: "3.5", budgetEntry: null });
  });
});
