import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";
import { addMonths, isFutureMonth, isTooFarAhead, MAX_MONTHS_AHEAD } from "../src/modules/budgets/budgets.utils.js";

const authedUser = async () => {
  const { res } = await registerUser();
  return { token: res.body.token as string };
};

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
  put: (url: string, body: object) => request(app).put(url).set("Authorization", `Bearer ${token}`).send(body),
  patch: (url: string, body: object) => request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
  del: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
});

const createGroup = async (token: string, name = "Hogar") => {
  const res = await as(token).post("/api/budgets/groups", { name });
  return res.body.group as { id: string };
};

const createItem = async (token: string, groupId: string, extra: object = {}) => {
  const res = await as(token).post("/api/budgets/items", { groupId, name: "Netflix", amount: 21.99, ...extra });
  return res.body.item as { id: string };
};

const firstExpenseCategory = async (token: string) => {
  const res = await as(token).get("/api/categories");
  return res.body.categories.find((c: { type: string }) => c.type === "EXPENSE") as { id: string };
};

describe("grupos de presupuesto", () => {
  it("crea grupos y los lista en orden", async () => {
    const { token } = await authedUser();

    const first = await as(token).post("/api/budgets/groups", { name: "Hogar", color: "#112233" });
    const second = await as(token).post("/api/budgets/groups", { name: "Deseos" });
    const list = await as(token).get("/api/budgets/groups");

    expect(first.status).toBe(201);
    expect(first.body.group.position).toBe(0);
    expect(second.body.group.position).toBe(1);
    expect(list.body.groups.map((g: { name: string }) => g.name)).toEqual(["Hogar", "Deseos"]);
  });

  it("editar solo una cosa del grupo no toca las demas (cambiar el nombre no restablece el color)", async () => {
    const { token } = await authedUser();
    const created = await as(token).post("/api/budgets/groups", { name: "Hogar", color: "#E91E63" });
    const id = created.body.group.id;

    const renamed = await as(token).patch(`/api/budgets/groups/${id}`, { name: "Casa" });
    const recolored = await as(token).patch(`/api/budgets/groups/${id}`, { color: "#00AA55" });

    expect(renamed.body.group).toMatchObject({ name: "Casa", color: "#E91E63" });
    expect(recolored.body.group).toMatchObject({ name: "Casa", color: "#00AA55" });
  });

  it("rechaza un nombre duplicado y un color invalido", async () => {
    const { token } = await authedUser();
    await createGroup(token, "Hogar");

    const duplicate = await as(token).post("/api/budgets/groups", { name: "Hogar" });
    const badColor = await as(token).post("/api/budgets/groups", { name: "Otro", color: "rojo" });

    expect(duplicate.status).toBe(400);
    expect(badColor.status).toBe(400);
  });

  it("no deja ver ni tocar los grupos de otro usuario", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    const group = await createGroup(tokenA);

    const list = await as(tokenB).get("/api/budgets/groups");
    const patch = await as(tokenB).patch(`/api/budgets/groups/${group.id}`, { name: "Hackeado" });
    const del = await as(tokenB).del(`/api/budgets/groups/${group.id}`);

    expect(list.body.groups).toEqual([]);
    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
  });

  it("no permite borrar un grupo con lineas, pero si uno vacio", async () => {
    const { token } = await authedUser();
    const used = await createGroup(token, "Con lineas");
    const empty = await createGroup(token, "Vacio");
    await createItem(token, used.id);

    expect((await as(token).del(`/api/budgets/groups/${used.id}`)).status).toBe(400);
    expect((await as(token).del(`/api/budgets/groups/${empty.id}`)).status).toBe(204);
  });

  it("un grupo puede tener un limite opcional, que se puede cambiar y quitar", async () => {
    const { token } = await authedUser();

    const created = await as(token).post("/api/budgets/groups", { name: "Gastos fijos", limit: 600 });
    const withoutLimit = await as(token).post("/api/budgets/groups", { name: "Deseos" });
    const changed = await as(token).patch(`/api/budgets/groups/${created.body.group.id}`, { limit: 750.5 });
    const removed = await as(token).patch(`/api/budgets/groups/${created.body.group.id}`, { limit: null });

    expect(Number(created.body.group.limit)).toBe(600);
    expect(withoutLimit.body.group.limit).toBeNull();
    expect(Number(changed.body.group.limit)).toBe(750.5);
    expect(removed.body.group.limit).toBeNull();
  });

  it("un grupo puede marcarse como el que recibe lo que sobra, y desmarcarse", async () => {
    const { token } = await authedUser();

    const created = await as(token).post("/api/budgets/groups", { name: "Caprichos", isRemainder: true });
    const normal = await as(token).post("/api/budgets/groups", { name: "Hogar" });
    const unmarked = await as(token).patch(`/api/budgets/groups/${created.body.group.id}`, { isRemainder: false });

    expect(created.status).toBe(201);
    expect(created.body.group.isRemainder).toBe(true);
    expect(normal.body.group.isRemainder).toBe(false);
    expect(unmarked.body.group.isRemainder).toBe(false);
  });

  it("solo puede haber un grupo que reciba lo que sobra por usuario", async () => {
    const { token } = await authedUser();
    const first = await as(token).post("/api/budgets/groups", { name: "Caprichos", isRemainder: true });
    const second = await as(token).post("/api/budgets/groups", { name: "Imprevistos" });

    const duplicate = await as(token).post("/api/budgets/groups", { name: "Otro", isRemainder: true });
    const moved = await as(token).patch(`/api/budgets/groups/${second.body.group.id}`, { isRemainder: true });
    const again = await as(token).patch(`/api/budgets/groups/${first.body.group.id}`, { isRemainder: true });

    expect(duplicate.status).toBe(400);
    expect(moved.status).toBe(400);
    expect(again.status).toBe(200);
  });

  it("otro usuario puede tener su propio grupo del sobrante", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    await as(tokenA).post("/api/budgets/groups", { name: "Caprichos", isRemainder: true });

    const res = await as(tokenB).post("/api/budgets/groups", { name: "Caprichos", isRemainder: true });

    expect(res.status).toBe(201);
  });

  it("el grupo del sobrante no admite limite, y al marcarlo se quita el que tuviera", async () => {
    const { token } = await authedUser();
    const withLimit = await as(token).post("/api/budgets/groups", { name: "Hogar", limit: 600 });
    const remainder = await as(token).post("/api/budgets/groups", { name: "Caprichos", isRemainder: true });

    const createWithLimit = await as(token).post("/api/budgets/groups", { name: "X", isRemainder: true, limit: 50 });
    const setLimit = await as(token).patch(`/api/budgets/groups/${remainder.body.group.id}`, { limit: 100 });
    const markRemainder = await as(token).patch(`/api/budgets/groups/${withLimit.body.group.id}`, {
      isRemainder: true,
    });
    await as(token).patch(`/api/budgets/groups/${remainder.body.group.id}`, { isRemainder: false });
    const retry = await as(token).patch(`/api/budgets/groups/${withLimit.body.group.id}`, { isRemainder: true });

    expect(createWithLimit.status).toBe(400);
    expect(setLimit.status).toBe(400);
    expect(markRemainder.status).toBe(400);
    expect(retry.status).toBe(200);
    expect(retry.body.group.limit).toBeNull();
  });

  it("devuelve la marca del sobrante junto a cada grupo del mes", async () => {
    const { token } = await authedUser();
    await as(token).post("/api/budgets/groups", { name: "Caprichos", isRemainder: true });
    await createGroup(token, "Hogar");

    const res = await as(token).get("/api/budgets/months/2026/9");

    expect(res.body.groups.map((g: { isRemainder: boolean }) => g.isRemainder)).toEqual([true, false]);
  });

  it("editar otros campos del grupo no toca su limite", async () => {
    const { token } = await authedUser();
    const group = await as(token).post("/api/budgets/groups", { name: "Gastos fijos", limit: 600 });

    const res = await as(token).patch(`/api/budgets/groups/${group.body.group.id}`, { name: "Fijos" });

    expect(Number(res.body.group.limit)).toBe(600);
  });

  it("rechaza un limite de 0, negativo o desorbitado", async () => {
    const { token } = await authedUser();
    const post = (limit: number) => as(token).post("/api/budgets/groups", { name: `G${limit}`, limit });

    expect((await post(0)).status).toBe(400);
    expect((await post(-10)).status).toBe(400);
    expect((await post(2_000_000)).status).toBe(400);
  });
});

describe("orden de los grupos", () => {
  it("guarda el nuevo orden de los grupos", async () => {
    const { token } = await authedUser();
    const a = await createGroup(token, "A");
    const b = await createGroup(token, "B");
    const c = await createGroup(token, "C");

    const res = await as(token).put("/api/budgets/groups/order", { ids: [c.id, a.id, b.id] });
    const list = await as(token).get("/api/budgets/groups");
    const month = await as(token).get("/api/budgets/months/2026/9");

    expect(res.status).toBe(204);
    expect(list.body.groups.map((g: { name: string }) => g.name)).toEqual(["C", "A", "B"]);
    expect(month.body.groups.map((g: { name: string }) => g.name)).toEqual(["C", "A", "B"]);
  });

  it("rechaza un orden incompleto, con repetidos o con grupos ajenos", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    const a = await createGroup(tokenA, "A");
    const b = await createGroup(tokenA, "B");
    const foreign = await createGroup(tokenB, "X");

    expect((await as(tokenA).put("/api/budgets/groups/order", { ids: [a.id] })).status).toBe(400);
    expect((await as(tokenA).put("/api/budgets/groups/order", { ids: [a.id, a.id] })).status).toBe(400);
    expect((await as(tokenA).put("/api/budgets/groups/order", { ids: [a.id, foreign.id] })).status).toBe(400);
    expect((await as(tokenA).put("/api/budgets/groups/order", { ids: [] })).status).toBe(400);
    expect((await as(tokenA).get("/api/budgets/groups")).body.groups.map((g: { id: string }) => g.id)).toEqual([
      a.id,
      b.id,
    ]);
  });
});

describe("orden de las lineas", () => {
  const monthOrder = async (token: string, month = 9) => {
    const res = await as(token).get(`/api/budgets/months/2026/${month}`);
    return res.body.groups[0].entries.map((e: { name: string }) => e.name);
  };

  it("guarda el orden de las lineas de un grupo en ese mes", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id, { name: "Netflix" });
    await createItem(token, group.id, { name: "Spotify" });
    await createItem(token, group.id, { name: "Gimnasio" });
    const month = await as(token).get("/api/budgets/months/2026/9");
    const [netflix, spotify, gym] = month.body.groups[0].entries.map((e: { id: string }) => e.id);

    const res = await as(token).put(`/api/budgets/months/2026/9/groups/${group.id}/entries/order`, {
      ids: [gym, netflix, spotify],
    });

    expect(res.status).toBe(204);
    expect(await monthOrder(token)).toEqual(["Gimnasio", "Netflix", "Spotify"]);
  });

  it("los meses que se generen despues heredan el orden y los anteriores no cambian", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id, { name: "Netflix" });
    await createItem(token, group.id, { name: "Spotify" });
    const september = await as(token).get("/api/budgets/months/2026/9");
    const [netflix, spotify] = september.body.groups[0].entries.map((e: { id: string }) => e.id);
    await as(token).get("/api/budgets/months/2026/10");

    await as(token).put(`/api/budgets/months/2026/9/groups/${group.id}/entries/order`, { ids: [spotify, netflix] });

    expect(await monthOrder(token, 10)).toEqual(["Netflix", "Spotify"]);
    expect(await monthOrder(token, 11)).toEqual(["Spotify", "Netflix"]);
  });

  it("una linea puntual se reordena solo en su mes", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id, { name: "Netflix" });
    const september = await as(token).get("/api/budgets/months/2026/9");
    const netflix = september.body.groups[0].entries[0].id;
    const gift = await as(token).post("/api/budgets/months/2026/9/entries", {
      groupId: group.id,
      name: "Regalo",
      amount: 10,
    });

    await as(token).put(`/api/budgets/months/2026/9/groups/${group.id}/entries/order`, {
      ids: [gift.body.entry.id, netflix],
    });

    expect(await monthOrder(token)).toEqual(["Regalo", "Netflix"]);
    expect(await monthOrder(token, 10)).toEqual(["Netflix"]);
  });

  it("rechaza un orden incompleto o con lineas de otro grupo", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token, "A");
    const other = await createGroup(token, "B");
    await createItem(token, group.id, { name: "Netflix" });
    await createItem(token, group.id, { name: "Spotify" });
    await createItem(token, other.id, { name: "Luz" });
    const month = await as(token).get("/api/budgets/months/2026/9");
    const [netflix, spotify] = month.body.groups[0].entries.map((e: { id: string }) => e.id);
    const luz = month.body.groups[1].entries[0].id;
    const url = `/api/budgets/months/2026/9/groups/${group.id}/entries/order`;

    expect((await as(token).put(url, { ids: [netflix] })).status).toBe(400);
    expect((await as(token).put(url, { ids: [netflix, luz] })).status).toBe(400);
    expect((await as(token).put(url, { ids: [netflix, spotify, spotify] })).status).toBe(400);
    expect(await monthOrder(token)).toEqual(["Netflix", "Spotify"]);
  });

  it("no deja reordenar el grupo de otro usuario", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    const group = await createGroup(tokenA);
    await createItem(tokenA, group.id);
    const month = await as(tokenA).get("/api/budgets/months/2026/9");

    const res = await as(tokenB).put(`/api/budgets/months/2026/9/groups/${group.id}/entries/order`, {
      ids: [month.body.groups[0].entries[0].id],
    });

    expect(res.status).toBe(404);
  });
});

describe("plantilla recurrente (items)", () => {
  it("crea una linea fija, incluso con importe negativo", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);

    const res = await as(token).post("/api/budgets/items", { groupId: group.id, name: "Luz Ivan", amount: -50 });

    expect(res.status).toBe(201);
    expect(Number(res.body.item.amount)).toBe(-50);
  });

  it("rechaza un importe 0", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);

    const res = await as(token).post("/api/budgets/items", { groupId: group.id, name: "X", amount: 0 });

    expect(res.status).toBe(400);
  });

  it("no acepta un grupo de otro usuario", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    const groupA = await createGroup(tokenA);

    const res = await as(tokenB).post("/api/budgets/items", { groupId: groupA.id, name: "X", amount: 5 });

    expect(res.status).toBe(404);
  });

  it("edita el importe de una linea", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    const item = await createItem(token, group.id);

    const res = await as(token).patch(`/api/budgets/items/${item.id}`, { amount: 25 });

    expect(res.status).toBe(200);
    expect(Number(res.body.item.amount)).toBe(25);
  });

  it("borrar un item de la plantilla no toca los meses ya generados", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    const item = await createItem(token, group.id);
    await as(token).get("/api/budgets/months/2026/9");

    await as(token).del(`/api/budgets/items/${item.id}`);
    const month = await as(token).get("/api/budgets/months/2026/9");

    expect(month.body.groups[0].entries).toHaveLength(1);
    expect(month.body.groups[0].entries[0].itemId).toBeNull();
  });
});

describe("presupuesto de un mes", () => {
  it("la primera vez genera las lineas desde la plantilla, sin pagar", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id, { name: "Netflix", amount: 21.99 });
    await createItem(token, group.id, { name: "Spotify", amount: 3 });

    const res = await as(token).get("/api/budgets/months/2026/9");

    expect(res.status).toBe(200);
    expect(res.body.month.year).toBe(2026);
    expect(res.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Netflix", "Spotify"]);
    expect(res.body.groups[0].entries.every((e: { paid: boolean }) => e.paid === false)).toBe(true);
  });

  it("abrir el mes dos veces no duplica lineas ni pisa lo editado", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id);
    const first = await as(token).get("/api/budgets/months/2026/9");
    await as(token).patch(`/api/budgets/entries/${first.body.groups[0].entries[0].id}`, { paid: true });

    const second = await as(token).get("/api/budgets/months/2026/9");

    expect(second.body.groups[0].entries).toHaveLength(1);
    expect(second.body.groups[0].entries[0].paid).toBe(true);
  });

  it("al generar un mes nuevo copia el sueldo del ultimo mes anterior y resetea el pagado", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id);
    const september = await as(token).get("/api/budgets/months/2026/9");
    await as(token).patch("/api/budgets/months/2026/9", { income: 1594.9 });
    await as(token).patch(`/api/budgets/entries/${september.body.groups[0].entries[0].id}`, { paid: true });

    const october = await as(token).get("/api/budgets/months/2026/10");

    expect(Number(october.body.month.income)).toBe(1594.9);
    expect(october.body.groups[0].entries[0].paid).toBe(false);
  });

  it("no rellena con la plantilla de hoy un mes anterior al primer presupuesto", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id);
    await as(token).get("/api/budgets/months/2026/9");

    const past = await as(token).get("/api/budgets/months/2026/3");

    expect(past.body.month).toBeNull();
    expect(past.body.groups[0].entries).toEqual([]);
  });

  it("guarda el sueldo previsto del mes", async () => {
    const { token } = await authedUser();

    const res = await as(token).patch("/api/budgets/months/2026/9", { income: 1500 });

    expect(res.status).toBe(200);
    expect(Number(res.body.month.income)).toBe(1500);
  });

  it("valida el mes de la URL", async () => {
    const { token } = await authedUser();

    expect((await as(token).get("/api/budgets/months/2026/13")).status).toBe(400);
    expect((await as(token).get("/api/budgets/months/abc/1")).status).toBe(400);
  });

  it("devuelve el limite de cada grupo junto a sus lineas", async () => {
    const { token } = await authedUser();
    const limited = await createGroup(token, "Gastos fijos");
    await createGroup(token, "Deseos");
    await as(token).patch(`/api/budgets/groups/${limited.id}`, { limit: 600 });
    await createItem(token, limited.id);

    const res = await as(token).get("/api/budgets/months/2026/9");

    expect(Number(res.body.groups[0].limit)).toBe(600);
    expect(res.body.groups[1].limit).toBeNull();
  });

  it("otro usuario no ve nada del presupuesto de este", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    const group = await createGroup(tokenA);
    await createItem(tokenA, group.id);
    await as(tokenA).get("/api/budgets/months/2026/9");

    const res = await as(tokenB).get("/api/budgets/months/2026/9");

    expect(res.body.groups).toEqual([]);
  });
});

describe("lineas del mes (entries)", () => {
  it("una linea puntual solo existe en ese mes", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id);
    await as(token).get("/api/budgets/months/2026/9");

    const created = await as(token).post("/api/budgets/months/2026/9/entries", {
      groupId: group.id,
      name: "Regalo",
      amount: 10,
    });
    const october = await as(token).get("/api/budgets/months/2026/10");

    expect(created.status).toBe(201);
    expect(created.body.entry.itemId).toBeNull();
    expect(october.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Netflix"]);
  });

  it("una linea recurrente tambien entra en la plantilla y aparece los meses siguientes", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await as(token).get("/api/budgets/months/2026/9");

    const created = await as(token).post("/api/budgets/months/2026/9/entries", {
      groupId: group.id,
      name: "Gimnasio",
      amount: 60,
      recurring: true,
    });
    const october = await as(token).get("/api/budgets/months/2026/10");

    expect(created.body.entry.itemId).not.toBeNull();
    expect(october.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Gimnasio"]);
  });

  it("marcar pagado o cambiar el importe de un mes no toca la plantilla", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id, { amount: 100 });
    const month = await as(token).get("/api/budgets/months/2026/9");
    const entryId = month.body.groups[0].entries[0].id;

    const res = await as(token).patch(`/api/budgets/entries/${entryId}`, { paid: true, amount: 130 });
    const items = await as(token).get("/api/budgets/items");

    expect(res.body.entry.paid).toBe(true);
    expect(Number(res.body.entry.amount)).toBe(130);
    expect(Number(items.body.items[0].amount)).toBe(100);
  });

  it("borra una linea del mes", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id);
    const month = await as(token).get("/api/budgets/months/2026/9");

    const del = await as(token).del(`/api/budgets/entries/${month.body.groups[0].entries[0].id}`);
    const after = await as(token).get("/api/budgets/months/2026/9");

    expect(del.status).toBe(204);
    expect(after.body.groups[0].entries).toEqual([]);
  });

  it("no deja editar ni borrar las lineas de otro usuario", async () => {
    const { token: tokenA } = await authedUser();
    const { token: tokenB } = await authedUser();
    const group = await createGroup(tokenA);
    await createItem(tokenA, group.id);
    const month = await as(tokenA).get("/api/budgets/months/2026/9");
    const entryId = month.body.groups[0].entries[0].id;

    expect((await as(tokenB).patch(`/api/budgets/entries/${entryId}`, { paid: true })).status).toBe(404);
    expect((await as(tokenB).del(`/api/budgets/entries/${entryId}`)).status).toBe(404);
  });

  it("el presupuesto no depende de las categorias: se pueden borrar sin tocarlo", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id);
    const category = await firstExpenseCategory(token);

    const res = await as(token).del(`/api/categories/${category.id}`);

    expect(res.status).toBe(204);
  });
});

describe("presupuestos de meses futuros", () => {
  const now = new Date();
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const monthUrl = (delta: number) => {
    const { year, month } = addMonths(current, delta);
    return `/api/budgets/months/${year}/${month}`;
  };

  it("apunta un cobro en un mes futuro sin tocar el mes actual", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token, "Coche");
    await createItem(token, group.id, { name: "Gasolina", amount: 60 });
    // La app abre siempre el mes actual primero: asi existe antes que cualquier mes futuro.
    await as(token).get(monthUrl(0));

    const created = await as(token).post(`${monthUrl(3)}/entries`, {
      groupId: group.id,
      name: "Seguro del coche",
      amount: 380,
      recurring: false,
    });
    const future = await as(token).get(monthUrl(3));
    const present = await as(token).get(monthUrl(0));

    expect(created.status).toBe(201);
    expect(future.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Gasolina", "Seguro del coche"]);
    expect(present.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Gasolina"]);
  });

  it("un mes futuro copia la plantilla y el sueldo del ultimo mes anterior", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);
    await createItem(token, group.id, { name: "Netflix", amount: 12 });
    await as(token).patch(monthUrl(0), { income: 1500 });

    const future = await as(token).get(monthUrl(2));

    expect(Number(future.body.month.income)).toBe(1500);
    expect(future.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Netflix"]);
    expect(future.body.groups[0].entries[0].paid).toBe(false);
  });

  it("permite fijar el sueldo previsto de un mes futuro", async () => {
    const { token } = await authedUser();

    const res = await as(token).patch(monthUrl(5), { income: 1800 });

    expect(res.status).toBe(200);
    expect(Number(res.body.month.income)).toBe(1800);
  });

  it("admite hasta el limite de meses por delante y rechaza lo que pasa de ahi", async () => {
    const { token } = await authedUser();
    const group = await createGroup(token);

    expect((await as(token).get(monthUrl(MAX_MONTHS_AHEAD))).status).toBe(200);
    expect((await as(token).get(monthUrl(MAX_MONTHS_AHEAD + 2))).status).toBe(400);
    expect((await as(token).patch(monthUrl(MAX_MONTHS_AHEAD + 2), { income: 1 })).status).toBe(400);
    const entry = await as(token).post(`${monthUrl(MAX_MONTHS_AHEAD + 2)}/entries`, {
      groupId: group.id,
      name: "Demasiado lejos",
      amount: 10,
      recurring: false,
    });
    expect(entry.status).toBe(400);
  });

  it("un rechazo por lejania no deja ningun mes creado", async () => {
    const { token } = await authedUser();

    await as(token).get(monthUrl(MAX_MONTHS_AHEAD + 5));
    const near = await as(token).get(monthUrl(1));

    expect(near.status).toBe(200);
    expect(near.body.month).not.toBeNull();
  });

  describe("vista previa sin guardar", () => {
    const countFor = async (userId: string) => ({
      months: await prisma.budgetMonth.count({ where: { userId } }),
      entries: await prisma.budgetEntry.count({ where: { userId } }),
    });
    const userIdOf = async (token: string) => {
      const me = await as(token).get("/api/auth/me");
      return me.body.user.id as string;
    };

    it("ver un mes futuro lo devuelve como vista previa y no guarda nada", async () => {
      const { token } = await authedUser();
      const userId = await userIdOf(token);
      const group = await createGroup(token);
      await createItem(token, group.id, { name: "Netflix", amount: 12 });
      await as(token).patch(monthUrl(0), { income: 1500 });
      const before = await countFor(userId);

      const first = await as(token).get(monthUrl(4));
      const second = await as(token).get(monthUrl(4));

      expect(first.status).toBe(200);
      expect(first.body.preview).toBe(true);
      expect(Number(first.body.month.income)).toBe(1500);
      expect(first.body.groups[0].entries).toMatchObject([
        { name: "Netflix", amount: "12", paid: false, transaction: null },
      ]);
      expect(first.body.groups[0].entries[0].id).toMatch(/^preview:/);
      expect(second.body.preview).toBe(true);
      expect(await countFor(userId)).toEqual(before);
    });

    it("el mes actual y los pasados se siguen guardando al abrirlos", async () => {
      const { token } = await authedUser();
      const userId = await userIdOf(token);

      const res = await as(token).get(monthUrl(0));

      expect(res.body.preview).toBe(false);
      expect((await countFor(userId)).months).toBe(1);
    });

    it("la vista previa recoge los cambios de la plantilla hechos despues de mirarla", async () => {
      const { token } = await authedUser();
      const group = await createGroup(token);
      await createItem(token, group.id, { name: "Netflix", amount: 12 });
      await as(token).get(monthUrl(0));
      await as(token).get(monthUrl(3));

      await createItem(token, group.id, { name: "Gimnasio", amount: 30 });
      const again = await as(token).get(monthUrl(3));

      expect(again.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Netflix", "Gimnasio"]);
    });

    it("escribir en el mes lo guarda y deja de ser vista previa", async () => {
      const { token } = await authedUser();
      const userId = await userIdOf(token);
      const group = await createGroup(token);
      await createItem(token, group.id, { name: "Netflix", amount: 12 });
      await as(token).get(monthUrl(0));
      await as(token).get(monthUrl(2));

      await as(token).post(`${monthUrl(2)}/entries`, { groupId: group.id, name: "Seguro", amount: 380, recurring: false });
      const after = await as(token).get(monthUrl(2));

      expect(after.body.preview).toBe(false);
      expect(after.body.groups[0].entries.map((e: { name: string }) => e.name)).toEqual(["Netflix", "Seguro"]);
      expect((await countFor(userId)).months).toBe(2);
    });

    it("fijar el sueldo previsto guarda el mes", async () => {
      const { token } = await authedUser();
      await as(token).get(monthUrl(0));
      await as(token).get(monthUrl(2));

      await as(token).patch(monthUrl(2), { income: 1700 });
      const after = await as(token).get(monthUrl(2));

      expect(after.body.preview).toBe(false);
      expect(Number(after.body.month.income)).toBe(1700);
    });

    it("POST /open guarda el mes con la plantilla, sin pagar, y es idempotente", async () => {
      const { token } = await authedUser();
      const userId = await userIdOf(token);
      const group = await createGroup(token);
      await createItem(token, group.id, { name: "Netflix", amount: 12 });
      await as(token).get(monthUrl(0));

      const first = await as(token).post(`${monthUrl(3)}/open`, {});
      const second = await as(token).post(`${monthUrl(3)}/open`, {});

      expect(first.status).toBe(200);
      expect(first.body.preview).toBe(false);
      expect(first.body.groups[0].entries).toHaveLength(1);
      expect(first.body.groups[0].entries[0].id).not.toMatch(/^preview:/);
      expect(second.body.groups[0].entries).toHaveLength(1);
      expect((await countFor(userId)).entries).toBe(2);
    });

    it("tras guardar el mes se puede marcar una linea como pagada", async () => {
      const { token } = await authedUser();
      const group = await createGroup(token);
      await createItem(token, group.id);
      await as(token).get(monthUrl(0));

      const opened = await as(token).post(`${monthUrl(2)}/open`, {});
      const entryId = opened.body.groups[0].entries[0].id;
      const paid = await as(token).patch(`/api/budgets/entries/${entryId}`, { paid: true });

      expect(paid.status).toBe(200);
      expect(paid.body.entry.paid).toBe(true);
    });

    it("una linea con id provisional no se puede editar: hay que guardar el mes antes", async () => {
      const { token } = await authedUser();
      const group = await createGroup(token);
      const item = await createItem(token, group.id);
      await as(token).get(monthUrl(0));

      const res = await as(token).patch(`/api/budgets/entries/preview:${item.id}`, { paid: true });

      expect(res.status).toBe(404);
    });

    it("POST /open respeta el limite de meses y la vista previa no mezcla datos de otro usuario", async () => {
      const { token } = await authedUser();
      const other = await authedUser();
      const group = await createGroup(token);
      await createItem(token, group.id, { name: "Privada", amount: 99 });
      await as(token).get(monthUrl(0));
      await as(other.token).get(monthUrl(0));

      expect((await as(token).post(`${monthUrl(MAX_MONTHS_AHEAD + 2)}/open`, {})).status).toBe(400);
      const theirs = await as(other.token).get(monthUrl(2));
      expect(theirs.body.groups).toEqual([]);
    });

    it("un mes futuro demasiado lejos sigue dando 400 aunque sea vista previa", async () => {
      const { token } = await authedUser();

      expect((await as(token).get(monthUrl(MAX_MONTHS_AHEAD + 2))).status).toBe(400);
    });

    it("isFutureMonth compara con el mes actual en UTC", () => {
      const base = new Date(Date.UTC(2026, 10, 30, 23, 59));
      expect(isFutureMonth({ year: 2026, month: 11 }, base)).toBe(false);
      expect(isFutureMonth({ year: 2026, month: 12 }, base)).toBe(true);
      expect(isFutureMonth({ year: 2026, month: 10 }, base)).toBe(false);
      expect(isFutureMonth({ year: 2027, month: 1 }, new Date(Date.UTC(2026, 11, 31)))).toBe(true);
    });
  });

  describe("isTooFarAhead", () => {
    const base = new Date(Date.UTC(2026, 10, 4));

    it("el limite del servidor es uno mas que el de la app", () => {
      // Base nov-2026: la app llega a nov-2027 (12 meses) y el servidor a dic-2027 (13).
      expect(isTooFarAhead({ year: 2027, month: 11 }, base)).toBe(false);
      expect(isTooFarAhead({ year: 2027, month: 12 }, base)).toBe(false);
      expect(isTooFarAhead({ year: 2028, month: 1 }, base)).toBe(true);
    });

    it("no limita el pasado", () => {
      expect(isTooFarAhead({ year: 2020, month: 1 }, base)).toBe(false);
    });

    it("cruza bien el cambio de año", () => {
      expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
      expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    });
  });
});

describe("cambios de plantilla en meses posteriores ya guardados", () => {
  const now = new Date();
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const monthUrl = (delta: number) => {
    const { year, month } = addMonths(current, delta);
    return `/api/budgets/months/${year}/${month}`;
  };

  type Entry = {
    id: string;
    name: string;
    amount: string;
    paid: boolean;
    edited: boolean;
    itemId: string | null;
    groupId: string;
  };

  const entriesOf = async (token: string, delta: number) => {
    const res = await as(token).get(monthUrl(delta));
    return (res.body.groups as { entries: Entry[] }[]).flatMap((group) => group.entries);
  };
  const entryNamed = async (token: string, delta: number, name: string) =>
    (await entriesOf(token, delta)).find((entry) => entry.name === name);

  // Plantilla con una linea recurrente "Netflix" y los meses -1, 0, +2 y +4 guardados; el +1 y el +3 solo se ven.
  const setup = async () => {
    const { token } = await authedUser();
    const group = await createGroup(token, "Hogar");
    await createItem(token, group.id, { name: "Netflix", amount: 10 });
    await as(token).get(monthUrl(-1));
    await as(token).get(monthUrl(0));
    await as(token).post(`${monthUrl(2)}/open`, {});
    await as(token).post(`${monthUrl(4)}/open`, {});
    return { token, group };
  };

  const edit = (token: string, id: string, body: object) => as(token).patch(`/api/budgets/entries/${id}`, body);

  describe("alta de una linea recurrente", () => {
    it("llega a los meses posteriores guardados, sin pagar, y no a los anteriores", async () => {
      const { token, group } = await setup();

      await as(token).post(`${monthUrl(0)}/entries`, { groupId: group.id, name: "Gimnasio", amount: 30, recurring: true });

      for (const delta of [0, 2, 4]) {
        expect(await entryNamed(token, delta, "Gimnasio")).toMatchObject({ amount: "30", paid: false, edited: false });
      }
      expect(await entryNamed(token, -1, "Gimnasio")).toBeUndefined();
    });

    it("los meses que solo se habian visto la recogen de la plantilla al verlos", async () => {
      const { token, group } = await setup();

      await as(token).post(`${monthUrl(0)}/entries`, { groupId: group.id, name: "Gimnasio", amount: 30, recurring: true });
      const preview = await as(token).get(monthUrl(1));

      expect(preview.body.preview).toBe(true);
      expect(preview.body.groups[0].entries.map((e: { name: string }) => e.name)).toContain("Gimnasio");
    });

    it("una linea solo de este mes no se propaga", async () => {
      const { token, group } = await setup();

      await as(token).post(`${monthUrl(0)}/entries`, { groupId: group.id, name: "Seguro", amount: 380, recurring: false });

      expect(await entryNamed(token, 0, "Seguro")).toBeDefined();
      expect(await entryNamed(token, 2, "Seguro")).toBeUndefined();
      expect(await entryNamed(token, 4, "Seguro")).toBeUndefined();
    });

    it("dar de alta en un mes futuro tampoco llega a los meses anteriores", async () => {
      const { token, group } = await setup();

      await as(token).post(`${monthUrl(2)}/entries`, { groupId: group.id, name: "Gimnasio", amount: 30, recurring: true });

      expect(await entryNamed(token, 2, "Gimnasio")).toBeDefined();
      expect(await entryNamed(token, 4, "Gimnasio")).toBeDefined();
      expect(await entryNamed(token, 0, "Gimnasio")).toBeUndefined();
      expect(await entryNamed(token, -1, "Gimnasio")).toBeUndefined();
    });
  });

  describe("editar con «este y los siguientes»", () => {
    it("cambia el importe y el nombre en la plantilla y en los meses posteriores", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      const res = await edit(token, netflix.id, { name: "Netflix 4K", amount: 15, scope: "template" });

      expect(res.status).toBe(200);
      for (const delta of [0, 2, 4]) {
        expect(await entryNamed(token, delta, "Netflix 4K")).toMatchObject({ amount: "15" });
      }
      // Un mes anterior no cambia, y un mes que se abra despues sale con lo nuevo.
      expect(await entryNamed(token, -1, "Netflix")).toMatchObject({ amount: "10" });
      const preview = await as(token).get(monthUrl(1));
      expect(preview.body.groups[0].entries[0]).toMatchObject({ name: "Netflix 4K", amount: "15" });
    });

    it("no toca las lineas pagadas de los meses posteriores", async () => {
      const { token } = await setup();
      const later = (await entryNamed(token, 2, "Netflix"))!;
      await edit(token, later.id, { paid: true });
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await edit(token, netflix.id, { amount: 15, scope: "template" });

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ amount: "10", paid: true });
      expect(await entryNamed(token, 4, "Netflix")).toMatchObject({ amount: "15" });
    });

    it("no toca las lineas enlazadas a un gasto", async () => {
      const { token } = await setup();
      const category = await firstExpenseCategory(token);
      const later = (await entryNamed(token, 2, "Netflix"))!;
      const link = await as(token).post("/api/transactions", {
        categoryId: category.id,
        type: "EXPENSE",
        amount: 10,
        occurredAt: new Date().toISOString(),
        budgetEntryId: later.id,
      });
      expect(link.status).toBe(201);
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await edit(token, netflix.id, { amount: 15, scope: "template" });

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ amount: "10", paid: true });
    });

    it("respeta lo editado a mano solo para su mes", async () => {
      const { token } = await setup();
      const later = (await entryNamed(token, 2, "Netflix"))!;
      const handEdit = await edit(token, later.id, { amount: 99, scope: "month" });
      expect(handEdit.body.entry.edited).toBe(true);
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await edit(token, netflix.id, { amount: 15, scope: "template" });

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ amount: "99", edited: true });
      expect(await entryNamed(token, 4, "Netflix")).toMatchObject({ amount: "15", edited: false });
    });

    it("volver a editar una linea con «este y los siguientes» la devuelve a la plantilla", async () => {
      const { token } = await setup();
      const later = (await entryNamed(token, 2, "Netflix"))!;
      await edit(token, later.id, { amount: 99, scope: "month" });

      const res = await edit(token, later.id, { amount: 20, scope: "template" });

      expect(res.body.entry.edited).toBe(false);
      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ amount: "20", edited: false });
      expect(await entryNamed(token, 4, "Netflix")).toMatchObject({ amount: "20" });
      // Los meses anteriores a este no cambian.
      expect(await entryNamed(token, 0, "Netflix")).toMatchObject({ amount: "10" });
    });

    it("mover la linea de grupo tambien llega a los meses posteriores", async () => {
      const { token } = await setup();
      const other = await createGroup(token, "Ocio");
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await edit(token, netflix.id, { groupId: other.id, scope: "template" });

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ groupId: other.id });
      expect(await entryNamed(token, 4, "Netflix")).toMatchObject({ groupId: other.id });
    });

    it("una linea suelta (sin plantilla) se edita solo en su mes aunque se pida «template»", async () => {
      const { token, group } = await setup();
      await as(token).post(`${monthUrl(0)}/entries`, { groupId: group.id, name: "Seguro", amount: 380, recurring: false });
      const seguro = (await entryNamed(token, 0, "Seguro"))!;

      const res = await edit(token, seguro.id, { amount: 400, scope: "template" });

      expect(res.status).toBe(200);
      expect(await entryNamed(token, 0, "Seguro")).toMatchObject({ amount: "400", edited: false });
    });

    it("marcar como pagada con scope «template» no cambia la plantilla ni los meses posteriores", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await edit(token, netflix.id, { paid: true, scope: "template" });

      expect(await entryNamed(token, 0, "Netflix")).toMatchObject({ paid: true });
      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ paid: false, amount: "10" });
    });

    it("no toca los datos de otro usuario", async () => {
      const mine = await setup();
      const theirs = await setup();
      const netflix = (await entryNamed(mine.token, 0, "Netflix"))!;

      await edit(mine.token, netflix.id, { amount: 15, scope: "template" });

      expect(await entryNamed(theirs.token, 2, "Netflix")).toMatchObject({ amount: "10" });
      expect((await edit(theirs.token, netflix.id, { amount: 1, scope: "template" })).status).toBe(404);
    });

    it("rechaza un scope desconocido", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      expect((await edit(token, netflix.id, { amount: 15, scope: "todos" })).status).toBe(400);
    });
  });

  describe("editar solo este mes", () => {
    it("marca la linea como editada a mano si cambia nombre, importe o grupo", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 2, "Netflix"))!;

      await edit(token, netflix.id, { amount: 12 });

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ amount: "12", edited: true });
    });

    it("no la marca si el valor es el mismo, ni al pagarla, ni al reordenarla", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 2, "Netflix"))!;

      await edit(token, netflix.id, { amount: 10, name: "Netflix" });
      await edit(token, netflix.id, { paid: true });
      await edit(token, netflix.id, { position: 3 });

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ edited: false, paid: true });
    });

    it("una linea que no viene de la plantilla no se marca", async () => {
      const { token, group } = await setup();
      await as(token).post(`${monthUrl(0)}/entries`, { groupId: group.id, name: "Seguro", amount: 380, recurring: false });
      const seguro = (await entryNamed(token, 0, "Seguro"))!;

      await edit(token, seguro.id, { amount: 400 });

      expect(await entryNamed(token, 0, "Seguro")).toMatchObject({ amount: "400", edited: false });
    });
  });

  describe("quitar con «este y los siguientes»", () => {
    const remove = (token: string, id: string, scope?: string) =>
      as(token).del(`/api/budgets/entries/${id}${scope ? `?scope=${scope}` : ""}`);

    it("quita la linea de la plantilla y de los meses posteriores, y no de los anteriores", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      const res = await remove(token, netflix.id, "template");

      expect(res.status).toBe(204);
      expect(await entryNamed(token, 0, "Netflix")).toBeUndefined();
      expect(await entryNamed(token, 2, "Netflix")).toBeUndefined();
      expect(await entryNamed(token, 4, "Netflix")).toBeUndefined();
      expect(await entryNamed(token, -1, "Netflix")).toBeDefined();
      const preview = await as(token).get(monthUrl(1));
      expect(preview.body.groups[0].entries).toEqual([]);
    });

    it("conserva como lineas sueltas las pagadas y las editadas a mano de los meses posteriores", async () => {
      const { token } = await setup();
      const paid = (await entryNamed(token, 2, "Netflix"))!;
      await edit(token, paid.id, { paid: true });
      const handEdited = (await entryNamed(token, 4, "Netflix"))!;
      await edit(token, handEdited.id, { amount: 99 });
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await remove(token, netflix.id, "template");

      expect(await entryNamed(token, 2, "Netflix")).toMatchObject({ paid: true, itemId: null });
      expect(await entryNamed(token, 4, "Netflix")).toMatchObject({ amount: "99", itemId: null });
      expect((await as(token).get("/api/budgets/items")).body.items).toEqual([]);
    });

    it("sin scope (o «month») solo quita la linea de ese mes", async () => {
      const { token } = await setup();
      const netflix = (await entryNamed(token, 0, "Netflix"))!;

      await remove(token, netflix.id);
      await remove(token, (await entryNamed(token, 2, "Netflix"))!.id, "month");

      expect(await entryNamed(token, 0, "Netflix")).toBeUndefined();
      expect(await entryNamed(token, 2, "Netflix")).toBeUndefined();
      expect(await entryNamed(token, 4, "Netflix")).toBeDefined();
      expect((await as(token).get("/api/budgets/items")).body.items).toHaveLength(1);
    });

    it("una linea suelta se quita sin error aunque se pida «template»", async () => {
      const { token, group } = await setup();
      await as(token).post(`${monthUrl(0)}/entries`, { groupId: group.id, name: "Seguro", amount: 380, recurring: false });
      const seguro = (await entryNamed(token, 0, "Seguro"))!;

      expect((await remove(token, seguro.id, "template")).status).toBe(204);
      expect(await entryNamed(token, 0, "Seguro")).toBeUndefined();
    });

    it("rechaza un scope desconocido y no toca lo de otro usuario", async () => {
      const mine = await setup();
      const theirs = await setup();
      const netflix = (await entryNamed(mine.token, 0, "Netflix"))!;

      expect((await remove(mine.token, netflix.id, "todos")).status).toBe(400);
      expect((await remove(theirs.token, netflix.id, "template")).status).toBe(404);
      expect(await entryNamed(mine.token, 2, "Netflix")).toBeDefined();
    });
  });
});
