import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";
import { addMonths } from "../src/modules/budgets/budgets.utils.js";

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
  patch: (url: string, body: object) => request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
  del: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
});

// Meses relativos al actual: el mes en curso se genera solo al abrirlo.
const now = new Date();
const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
const monthUrl = (delta = 0) => {
  const { year, month } = addMonths(current, delta);
  return `/api/budgets/months/${year}/${month}`;
};
const dateIn = (delta: number, day: number) => {
  const { year, month } = addMonths(current, delta);
  return new Date(Date.UTC(year, month - 1, day, 12)).toISOString();
};

const setup = async () => {
  const { res } = await registerUser();
  const token = res.body.token as string;
  const categories = (await as(token).get("/api/categories")).body.categories as { id: string; type: string }[];
  const expenseCategory = categories.find((c) => c.type === "EXPENSE")!;
  const otherCategory = categories.filter((c) => c.type === "EXPENSE")[1]!;
  const group = (await as(token).post("/api/budgets/groups", { name: "Hogar" })).body.group as { id: string };
  return { token, expenseCategory, otherCategory, group };
};

type Ctx = Awaited<ReturnType<typeof setup>>;

type Entry = {
  id: string;
  name: string;
  amount: string;
  envelope: boolean;
  paid: boolean;
  edited: boolean;
  itemId: string | null;
  suggestedCategoryId: string | null;
  transactions: { id: string; amount: string; occurredAt: string }[];
};

const entriesOf = async (token: string, delta = 0) => {
  const res = await as(token).get(monthUrl(delta));
  return (res.body.groups as { entries: Entry[] }[]).flatMap((group) => group.entries);
};
const entryNamed = async (token: string, name: string, delta = 0) =>
  (await entriesOf(token, delta)).find((entry) => entry.name === name)!;
const entryById = async (token: string, id: string, delta = 0) =>
  (await entriesOf(token, delta)).find((entry) => entry.id === id)!;

const createEntry = async (ctx: Ctx, body: object = {}) => {
  const res = await as(ctx.token).post(`${monthUrl()}/entries`, {
    groupId: ctx.group.id,
    name: "Supermercado",
    amount: 300,
    envelope: true,
    ...body,
  });
  return res.body.entry as { id: string; envelope: boolean; paid: boolean };
};

const spend = (ctx: Ctx, entryId: string | null, amount: number, extra: object = {}) =>
  as(ctx.token).post("/api/transactions", {
    categoryId: ctx.expenseCategory.id,
    type: "EXPENSE",
    amount,
    occurredAt: dateIn(0, 3),
    ...(entryId && { budgetEntryId: entryId }),
    ...extra,
  });

describe("crear sobres", () => {
  it("una linea puede crearse como sobre y por defecto no lo es", async () => {
    const ctx = await setup();

    const envelope = await createEntry(ctx);
    const plain = await createEntry(ctx, { name: "Luz", amount: 60, envelope: undefined });

    expect(envelope.envelope).toBe(true);
    expect(plain.envelope).toBe(false);
  });

  it("un reembolso (importe negativo) no puede ser un sobre", async () => {
    const ctx = await setup();

    const res = await as(ctx.token).post(`${monthUrl()}/entries`, {
      groupId: ctx.group.id,
      name: "Luz Ivan",
      amount: -30,
      envelope: true,
    });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.details)).toContain("reembolso");
  });

  it("un sobre recurrente llega a la plantilla, a los meses posteriores ya guardados y a los que se abren despues", async () => {
    const ctx = await setup();
    await as(ctx.token).get(monthUrl(0));
    await as(ctx.token).post(`${monthUrl(2)}/open`, {});

    await createEntry(ctx, { recurring: true });

    expect(await entryNamed(ctx.token, "Supermercado", 0)).toMatchObject({ envelope: true, paid: false });
    expect(await entryNamed(ctx.token, "Supermercado", 2)).toMatchObject({ envelope: true, paid: false });
    const preview = await as(ctx.token).get(monthUrl(1));
    expect(preview.body.preview).toBe(true);
    expect(preview.body.groups[0].entries[0]).toMatchObject({ name: "Supermercado", envelope: true, transactions: [] });
    const opened = await as(ctx.token).post(`${monthUrl(1)}/open`, {});
    expect(opened.body.groups[0].entries[0]).toMatchObject({ envelope: true, transactions: [] });
  });

  it("la plantilla se puede crear y editar como sobre, sin reembolsos", async () => {
    const ctx = await setup();

    const created = await as(ctx.token).post("/api/budgets/items", {
      groupId: ctx.group.id,
      name: "Gasolina",
      amount: 120,
      envelope: true,
    });
    const id = created.body.item.id as string;
    const renamed = await as(ctx.token).patch(`/api/budgets/items/${id}`, { name: "Combustible" });
    const refund = await as(ctx.token).patch(`/api/budgets/items/${id}`, { amount: -5 });
    const plain = await as(ctx.token).patch(`/api/budgets/items/${id}`, { envelope: false, amount: -5 });

    expect(created.body.item.envelope).toBe(true);
    // Editar solo el nombre no devuelve el sobre a linea normal.
    expect(renamed.body.item).toMatchObject({ name: "Combustible", envelope: true });
    expect(refund.status).toBe(400);
    expect(plain.status).toBe(200);
    expect(plain.body.item.envelope).toBe(false);
  });
});

describe("varios gastos en un sobre", () => {
  it("admite todos los gastos que se enlacen y queda sin marcar como pagado", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);

    const first = await spend(ctx, entry.id, 45);
    const second = await spend(ctx, entry.id, 32.5, { occurredAt: dateIn(0, 5) });
    const third = await spend(ctx, entry.id, 60, { occurredAt: dateIn(0, 4) });

    expect([first.status, second.status, third.status]).toEqual([201, 201, 201]);
    expect(first.body.transaction.budgetEntry).toMatchObject({ id: entry.id, envelope: true });
    const after = await entryById(ctx.token, entry.id);
    expect(after.paid).toBe(false);
    // Salen por fecha del gasto, no por orden de alta.
    expect(after.transactions.map((t) => t.amount)).toEqual(["45", "60", "32.5"]);
  });

  it("una linea normal sigue admitiendo un solo gasto", async () => {
    const ctx = await setup();
    const plain = await createEntry(ctx, { name: "Luz", amount: 60, envelope: false });
    await spend(ctx, plain.id, 62);

    const second = await spend(ctx, plain.id, 10);

    expect(second.status).toBe(409);
    expect(await entryById(ctx.token, plain.id)).toMatchObject({ paid: true });
    expect((await entryById(ctx.token, plain.id)).transactions).toHaveLength(1);
  });

  it("varios enlaces a la vez a un sobre pasan todos; a una linea normal, solo uno", async () => {
    const ctx = await setup();
    const envelope = await createEntry(ctx);
    const plain = await createEntry(ctx, { name: "Luz", amount: 60, envelope: false });

    const toEnvelope = await Promise.all([1, 2, 3, 4, 5].map((n) => spend(ctx, envelope.id, n)));
    const toPlain = await Promise.all([1, 2, 3, 4, 5].map((n) => spend(ctx, plain.id, n)));

    expect(toEnvelope.map((res) => res.status)).toEqual([201, 201, 201, 201, 201]);
    expect(toPlain.filter((res) => res.status === 201)).toHaveLength(1);
    expect(toPlain.filter((res) => res.status === 409)).toHaveLength(4);
    expect((await entryById(ctx.token, envelope.id)).transactions).toHaveLength(5);
    expect((await entryById(ctx.token, plain.id)).transactions).toHaveLength(1);
  });

  it("enlazar un gasto que ya existia con un sobre no lo marca como pagado", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    const loose = await spend(ctx, null, 20);

    const res = await as(ctx.token).patch(`/api/transactions/${loose.body.transaction.id}`, { budgetEntryId: entry.id });

    expect(res.status).toBe(200);
    const after = await entryById(ctx.token, entry.id);
    expect(after.paid).toBe(false);
    expect(after.transactions.map((t) => t.id)).toEqual([loose.body.transaction.id]);
  });

  it("quitar un gasto del sobre (desenlazarlo o borrarlo) no toca los demas ni lo marca", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    const a = await spend(ctx, entry.id, 10);
    const b = await spend(ctx, entry.id, 20);
    const c = await spend(ctx, entry.id, 30);

    await as(ctx.token).patch(`/api/transactions/${a.body.transaction.id}`, { budgetEntryId: null });
    await as(ctx.token).del(`/api/transactions/${b.body.transaction.id}`);

    const after = await entryById(ctx.token, entry.id);
    expect(after.paid).toBe(false);
    expect(after.transactions.map((t) => t.id)).toEqual([c.body.transaction.id]);
  });

  it("mover un gasto de un sobre a una linea normal la deja pagada; el sobre sigue igual", async () => {
    const ctx = await setup();
    const envelope = await createEntry(ctx);
    const plain = await createEntry(ctx, { name: "Luz", amount: 60, envelope: false });
    const expense = await spend(ctx, envelope.id, 62);
    await spend(ctx, envelope.id, 5);

    const res = await as(ctx.token).patch(`/api/transactions/${expense.body.transaction.id}`, { budgetEntryId: plain.id });

    expect(res.status).toBe(200);
    expect(await entryById(ctx.token, plain.id)).toMatchObject({ paid: true });
    expect(await entryById(ctx.token, envelope.id)).toMatchObject({ paid: false });
    expect((await entryById(ctx.token, envelope.id)).transactions).toHaveLength(1);
  });

  it("mover un gasto de una linea normal a un sobre la deja sin pagar", async () => {
    const ctx = await setup();
    const envelope = await createEntry(ctx);
    const plain = await createEntry(ctx, { name: "Luz", amount: 60, envelope: false });
    const expense = await spend(ctx, plain.id, 62);

    await as(ctx.token).patch(`/api/transactions/${expense.body.transaction.id}`, { budgetEntryId: envelope.id });

    expect(await entryById(ctx.token, plain.id)).toMatchObject({ paid: false, transactions: [] });
    expect(await entryById(ctx.token, envelope.id)).toMatchObject({ paid: false });
    expect((await entryById(ctx.token, envelope.id)).transactions).toHaveLength(1);
  });

  it("editar un gasto del sobre sin tocar el enlace lo conserva", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    const expense = await spend(ctx, entry.id, 20);

    const res = await as(ctx.token).patch(`/api/transactions/${expense.body.transaction.id}`, { amount: 25 });

    expect(res.status).toBe(200);
    expect(res.body.transaction.budgetEntry.id).toBe(entry.id);
    expect((await entryById(ctx.token, entry.id)).transactions[0]).toMatchObject({ amount: "25" });
  });

  it("no se enlaza con el sobre de otro usuario", async () => {
    const mine = await setup();
    const other = await setup();
    const theirs = await createEntry(other);

    const res = await spend(mine, theirs.id, 10);

    expect(res.status).toBe(404);
    expect((await entryById(other.token, theirs.id)).transactions).toEqual([]);
  });

  it("borrar la linea del sobre deja los gastos como movimientos sueltos", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    await spend(ctx, entry.id, 10);
    await spend(ctx, entry.id, 20);

    const res = await as(ctx.token).del(`/api/budgets/entries/${entry.id}`);

    expect(res.status).toBe(204);
    const list = await as(ctx.token).get("/api/transactions");
    expect(list.body.transactions).toHaveLength(2);
    expect(list.body.transactions.every((t: { budgetEntry: unknown }) => t.budgetEntry === null)).toBe(true);
  });

  it("al pagar la siguiente vez se sugiere la categoria del ultimo gasto de ese sobre", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, { recurring: true });
    await spend(ctx, entry.id, 10, { categoryId: ctx.otherCategory.id });
    await as(ctx.token).post(`${monthUrl(1)}/open`, {});

    const next = await entryNamed(ctx.token, "Supermercado", 1);

    expect(next.suggestedCategoryId).toBe(ctx.otherCategory.id);
  });
});

describe("cambiar una linea entre normal y sobre", () => {
  it("una linea normal sin gastos pasa a sobre y queda marcada como editada si viene de la plantilla", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, { name: "Gasolina", amount: 120, envelope: false, recurring: true });

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: true });

    expect(res.status).toBe(200);
    expect(res.body.entry).toMatchObject({ envelope: true, paid: false, edited: true });
  });

  it("al pasar a sobre una linea marcada como pagada a mano, deja de estar pagada", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, { name: "Gasolina", amount: 120, envelope: false });
    await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { paid: true });

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: true });

    expect(res.body.entry).toMatchObject({ envelope: true, paid: false });
  });

  it("una linea normal con su gasto pasa a sobre conservando ese gasto", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, { name: "Gasolina", amount: 120, envelope: false });
    await spend(ctx, entry.id, 40);

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: true });

    expect(res.status).toBe(200);
    const after = await entryById(ctx.token, entry.id);
    expect(after).toMatchObject({ envelope: true, paid: false });
    expect(after.transactions).toHaveLength(1);
    // Y ya admite mas.
    expect((await spend(ctx, entry.id, 35)).status).toBe(201);
  });

  it("un sobre con un solo gasto vuelve a ser una linea normal pagada", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    await spend(ctx, entry.id, 40);

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: false });

    expect(res.body.entry).toMatchObject({ envelope: false, paid: true });
  });

  it("un sobre sin gastos vuelve a ser una linea normal sin pagar", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: false });

    expect(res.body.entry).toMatchObject({ envelope: false, paid: false });
  });

  it("un sobre con varios gastos no vuelve a ser una linea normal: 400 y no cambia nada", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    await spend(ctx, entry.id, 40);
    await spend(ctx, entry.id, 15);

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("2 movimientos");
    expect(await entryById(ctx.token, entry.id)).toMatchObject({ envelope: true, paid: false });
  });

  it("un sobre no se marca como pagado, pero quitar la marca no da error aunque tenga gastos", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx);
    await spend(ctx, entry.id, 40);

    const mark = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { paid: true });
    const unmark = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { paid: false });

    expect(mark.status).toBe(400);
    expect(unmark.status).toBe(200);
    expect(await entryById(ctx.token, entry.id)).toMatchObject({ paid: false });
  });

  it("un sobre no puede ser un reembolso, ni una linea reembolso pasar a sobre", async () => {
    const ctx = await setup();
    const envelope = await createEntry(ctx);
    const refund = await createEntry(ctx, { name: "Luz Ivan", amount: -30, envelope: false });

    const toRefund = await as(ctx.token).patch(`/api/budgets/entries/${envelope.id}`, { amount: -10 });
    const refundToEnvelope = await as(ctx.token).patch(`/api/budgets/entries/${refund.id}`, { envelope: true });

    expect(toRefund.status).toBe(400);
    expect(refundToEnvelope.status).toBe(400);
  });

  it("la linea creada con un gasto sigue a su gasto y no puede ser un sobre", async () => {
    const ctx = await setup();
    const created = await spend(ctx, null, 3.5, { budgetGroupId: ctx.group.id, description: "Cerveza" });
    const lineId = created.body.transaction.budgetEntry.id as string;

    const res = await as(ctx.token).patch(`/api/budgets/entries/${lineId}`, { envelope: true });

    expect(res.status).toBe(400);
    expect((await entryById(ctx.token, lineId)).envelope).toBe(false);
  });
});

describe("sobres y «este y los siguientes»", () => {
  const prepare = async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, { name: "Gasolina", amount: 120, envelope: false, recurring: true });
    await as(ctx.token).post(`${monthUrl(2)}/open`, {});
    await as(ctx.token).post(`${monthUrl(4)}/open`, {});
    return { ctx, entry };
  };

  it("convertir en sobre con «este y los siguientes» cambia la plantilla y los meses posteriores", async () => {
    const { ctx, entry } = await prepare();

    const res = await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: true, scope: "template" });

    expect(res.status).toBe(200);
    expect(res.body.entry).toMatchObject({ envelope: true, edited: false });
    for (const delta of [2, 4]) {
      expect(await entryNamed(ctx.token, "Gasolina", delta)).toMatchObject({ envelope: true });
    }
    // Un mes que se abre despues sale ya como sobre.
    const opened = await as(ctx.token).post(`${monthUrl(1)}/open`, {});
    expect(opened.body.groups[0].entries[0]).toMatchObject({ name: "Gasolina", envelope: true });
  });

  it("no toca los meses posteriores que ya tienen gastos enlazados", async () => {
    const { ctx, entry } = await prepare();
    const later = await entryNamed(ctx.token, "Gasolina", 2);
    await as(ctx.token).patch(`/api/budgets/entries/${later.id}`, { paid: true });

    await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: true, scope: "template" });

    expect(await entryNamed(ctx.token, "Gasolina", 2)).toMatchObject({ envelope: false, paid: true });
    expect(await entryNamed(ctx.token, "Gasolina", 4)).toMatchObject({ envelope: true });
  });

  it("solo este mes: la plantilla y los demas meses no cambian", async () => {
    const { ctx, entry } = await prepare();

    await as(ctx.token).patch(`/api/budgets/entries/${entry.id}`, { envelope: true });

    expect(await entryNamed(ctx.token, "Gasolina", 0)).toMatchObject({ envelope: true, edited: true });
    expect(await entryNamed(ctx.token, "Gasolina", 2)).toMatchObject({ envelope: false });
    const opened = await as(ctx.token).post(`${monthUrl(1)}/open`, {});
    expect(opened.body.groups[0].entries[0]).toMatchObject({ envelope: false });
  });

  it("quitar de la plantilla un sobre respeta los meses con gastos enlazados", async () => {
    const ctx = await setup();
    const entry = await createEntry(ctx, { recurring: true });
    await as(ctx.token).post(`${monthUrl(2)}/open`, {});
    const later = await entryNamed(ctx.token, "Supermercado", 2);
    await as(ctx.token).patch(`/api/budgets/entries/${later.id}`, { amount: 250 });
    const lateTransaction = await as(ctx.token).post("/api/transactions", {
      categoryId: ctx.expenseCategory.id,
      type: "EXPENSE",
      amount: 12,
      occurredAt: dateIn(2, 3),
      budgetEntryId: later.id,
    });
    expect(lateTransaction.status).toBe(201);

    await as(ctx.token).del(`/api/budgets/entries/${entry.id}?scope=template`);

    // El mes con un gasto enlazado conserva su linea (suelta) con el gasto dentro.
    const kept = await entryNamed(ctx.token, "Supermercado", 2);
    expect(kept.transactions).toHaveLength(1);
  });
});
