import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

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
