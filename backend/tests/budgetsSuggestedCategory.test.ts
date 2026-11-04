import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
});

type MonthEntry = { id: string; itemId: string | null; name: string; paid: boolean; suggestedCategoryId: string | null };

const setup = async () => {
  const { res } = await registerUser();
  const token = res.body.token as string;
  const categories = (await as(token).get("/api/categories")).body.categories as { id: string; type: string }[];
  const [first, second] = categories.filter((c) => c.type === "EXPENSE");
  const group = (await as(token).post("/api/budgets/groups", { name: "Hogar" })).body.group as { id: string };
  const item = (await as(token).post("/api/budgets/items", { groupId: group.id, name: "Netflix", amount: 12.99 })).body
    .item as { id: string };
  return { token, first, second, group, item };
};

type Ctx = Awaited<ReturnType<typeof setup>>;

const monthEntries = async ({ token }: Ctx, month: number): Promise<MonthEntry[]> => {
  const res = await as(token).get(`/api/budgets/months/2026/${month}`);
  return (res.body.groups as { entries: MonthEntry[] }[]).flatMap((group) => group.entries);
};

const netflixOf = async (ctx: Ctx, month: number) =>
  (await monthEntries(ctx, month)).find((entry) => entry.itemId === ctx.item.id)!;

// Paga la linea de Netflix de un mes con un gasto de esa categoria.
const payNetflix = async (ctx: Ctx, month: number, categoryId: string, day = 10) => {
  const entry = await netflixOf(ctx, month);
  const res = await as(ctx.token).post("/api/transactions", {
    categoryId,
    type: "EXPENSE",
    amount: 12.99,
    occurredAt: `2026-${String(month).padStart(2, "0")}-${day}T10:00:00.000Z`,
    budgetEntryId: entry.id,
  });
  expect(res.status).toBe(201);
};

describe("categoria sugerida de una linea sin pagar", () => {
  it("sin ningun gasto previo de esa linea no hay sugerencia", async () => {
    const ctx = await setup();
    await netflixOf(ctx, 8);

    expect((await netflixOf(ctx, 9)).suggestedCategoryId).toBeNull();
  });

  it("propone la categoria del gasto con el que se pago la misma linea otro mes", async () => {
    const ctx = await setup();
    await payNetflix(ctx, 8, ctx.first.id);

    const next = await netflixOf(ctx, 9);

    expect(next.paid).toBe(false);
    expect(next.suggestedCategoryId).toBe(ctx.first.id);
  });

  it("si cambio de categoria, vale la del gasto mas reciente", async () => {
    const ctx = await setup();
    await payNetflix(ctx, 8, ctx.first.id);
    await payNetflix(ctx, 9, ctx.second.id);

    expect((await netflixOf(ctx, 10)).suggestedCategoryId).toBe(ctx.second.id);
  });

  it("manda la fecha del gasto, no el orden en que se crearon", async () => {
    const ctx = await setup();
    // Se apunta antes el de septiembre (segunda categoria) y despues el de agosto.
    await netflixOf(ctx, 8);
    await payNetflix(ctx, 9, ctx.second.id);
    await payNetflix(ctx, 8, ctx.first.id);

    expect((await netflixOf(ctx, 10)).suggestedCategoryId).toBe(ctx.second.id);
  });

  it("una linea ya pagada no lleva sugerencia", async () => {
    const ctx = await setup();
    await payNetflix(ctx, 8, ctx.first.id);
    await payNetflix(ctx, 9, ctx.first.id);

    const paid = await netflixOf(ctx, 9);

    expect(paid.paid).toBe(true);
    expect(paid.suggestedCategoryId).toBeNull();
  });

  it("una linea puntual (sin plantilla) no tiene sugerencia", async () => {
    const ctx = await setup();
    await payNetflix(ctx, 8, ctx.first.id);
    await as(ctx.token).post("/api/budgets/months/2026/9/entries", { groupId: ctx.group.id, name: "Cerveza", amount: 3 });

    const oneOff = (await monthEntries(ctx, 9)).find((entry) => entry.name === "Cerveza")!;

    expect(oneOff.itemId).toBeNull();
    expect(oneOff.suggestedCategoryId).toBeNull();
  });

  it("no mezcla lineas de plantillas distintas", async () => {
    const ctx = await setup();
    const spotify = (
      await as(ctx.token).post("/api/budgets/items", { groupId: ctx.group.id, name: "Spotify", amount: 10.99 })
    ).body.item as { id: string };
    await payNetflix(ctx, 8, ctx.first.id);

    const other = (await monthEntries(ctx, 9)).find((entry) => entry.itemId === spotify.id)!;

    expect(other.suggestedCategoryId).toBeNull();
  });

  it("los gastos de otro usuario no influyen", async () => {
    const mine = await setup();
    const other = await setup();
    await payNetflix(other, 8, other.first.id);

    expect((await netflixOf(mine, 9)).suggestedCategoryId).toBeNull();
  });
});
