import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
  patch: (url: string, body: object) => request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
});

type Category = { id: string; name: string; icon: string; color: string; type: "INCOME" | "EXPENSE" };

const newUser = async () => {
  const { res } = await registerUser();
  return { token: res.body.token as string };
};

const createCategory = async (token: string, body: Partial<Category> & { name: string }) => {
  const res = await as(token).post("/api/categories", { type: "EXPENSE", ...body });
  return res.body.category as Category;
};

const listCategories = async (token: string) => (await as(token).get("/api/categories")).body.categories as Category[];

describe("PATCH /api/categories/:id", () => {
  it("sin token da 401", async () => {
    expect((await request(app).patch("/api/categories/abc").send({ name: "X" })).status).toBe(401);
  });

  describe("editar nombre y color", () => {
    it("cambia el nombre", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe", color: "#112233" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { name: "Cafeteria" });

      expect(res.status).toBe(200);
      expect(res.body.category).toMatchObject({ id: category.id, name: "Cafeteria", color: "#112233" });
    });

    it("cambia el color y lo deja sin tocar el nombre", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe", color: "#112233" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { color: "#E91E63" });

      expect(res.status).toBe(200);
      expect(res.body.category).toMatchObject({ name: "Cafe", color: "#E91E63" });
    });

    it("cambia las dos cosas a la vez", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { name: "Cafeteria", color: "#00AA55" });

      expect(res.body.category).toMatchObject({ name: "Cafeteria", color: "#00AA55" });
    });

    it("quita los espacios del nombre", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { name: "  Cafeteria  " });

      expect(res.body.category.name).toBe("Cafeteria");
    });

    it("no cambia el tipo ni el icono si no se mandan", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Sueldo extra", type: "INCOME", icon: "briefcase" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { name: "Sueldo" });

      expect(res.body.category).toMatchObject({ type: "INCOME", icon: "briefcase" });
    });

    it("el cambio queda guardado en la lista", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });

      await as(token).patch(`/api/categories/${category.id}`, { name: "Cafeteria", color: "#E91E63" });

      const saved = (await listCategories(token)).find((c) => c.id === category.id);
      expect(saved).toMatchObject({ name: "Cafeteria", color: "#E91E63" });
    });

    it("sus movimientos se quedan con ella y ya salen con el nombre y el color nuevos", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe", color: "#112233" });
      await as(token).post("/api/transactions", {
        categoryId: category.id,
        type: "EXPENSE",
        amount: 2.5,
        occurredAt: "2026-10-10T10:00:00.000Z",
      });

      await as(token).patch(`/api/categories/${category.id}`, { name: "Cafeteria", color: "#E91E63" });

      const { transactions } = (await as(token).get("/api/transactions")).body;
      expect(transactions).toHaveLength(1);
      expect(transactions[0].category).toMatchObject({ id: category.id, name: "Cafeteria", color: "#E91E63" });
    });
  });

  describe("validacion", () => {
    it.each([
      ["un color sin #", { color: "E91E63" }],
      ["un color corto", { color: "#E91" }],
      ["un color que no es hexadecimal", { color: "#GGGGGG" }],
      ["un nombre vacio", { name: "" }],
      ["un nombre de solo espacios", { name: "   " }],
      ["un nombre de mas de 40 caracteres", { name: "x".repeat(41) }],
    ])("rechaza %s", async (_name, body) => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe", color: "#112233" });

      const res = await as(token).patch(`/api/categories/${category.id}`, body);

      expect(res.status).toBe(400);
      const saved = (await listCategories(token)).find((c) => c.id === category.id);
      expect(saved).toMatchObject({ name: "Cafe", color: "#112233" });
    });
  });

  describe("nombres repetidos", () => {
    it("renombrar a uno que ya existe del mismo tipo da 400 con un mensaje claro y no cambia nada", async () => {
      const { token } = await newUser();
      await createCategory(token, { name: "Cafe" });
      const other = await createCategory(token, { name: "Te" });

      const res = await as(token).patch(`/api/categories/${other.id}`, { name: "Cafe" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ya existe una categoría con ese nombre y tipo");
      expect((await listCategories(token)).find((c) => c.id === other.id)?.name).toBe("Te");
    });

    it("el mismo nombre en el otro tipo si se permite", async () => {
      const { token } = await newUser();
      await createCategory(token, { name: "Extras", type: "INCOME" });
      const expense = await createCategory(token, { name: "Otros extras", type: "EXPENSE" });

      const res = await as(token).patch(`/api/categories/${expense.id}`, { name: "Extras" });

      expect(res.status).toBe(200);
    });

    it("guardar una categoria con su propio nombre no es un repetido", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { name: "Cafe", color: "#E91E63" });

      expect(res.status).toBe(200);
      expect(res.body.category.color).toBe("#E91E63");
    });

    it("otro usuario puede tener una categoria con el mismo nombre", async () => {
      const ana = await newUser();
      const luis = await newUser();
      await createCategory(ana.token, { name: "Cafe" });
      const mine = await createCategory(luis.token, { name: "Te" });

      const res = await as(luis.token).patch(`/api/categories/${mine.id}`, { name: "Cafe" });

      expect(res.status).toBe(200);
    });

    it("dos renombrados a la vez al mismo nombre: uno se aplica y el otro da 400, nunca un 500", async () => {
      const { token } = await newUser();
      const a = await createCategory(token, { name: "A" });
      const b = await createCategory(token, { name: "B" });

      const results = await Promise.all([
        as(token).patch(`/api/categories/${a.id}`, { name: "Igual" }),
        as(token).patch(`/api/categories/${b.id}`, { name: "Igual" }),
      ]);

      expect(results.map((res) => res.status).sort()).toEqual([200, 400]);
    });
  });

  describe("cambiar el tipo", () => {
    it("se puede si no tiene movimientos", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });

      const res = await as(token).patch(`/api/categories/${category.id}`, { type: "INCOME" });

      expect(res.status).toBe(200);
      expect(res.body.category.type).toBe("INCOME");
    });

    it("no se puede si tiene movimientos: quedarian en una categoria del otro tipo", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });
      await as(token).post("/api/transactions", {
        categoryId: category.id,
        type: "EXPENSE",
        amount: 2.5,
        occurredAt: "2026-10-10T10:00:00.000Z",
      });

      const res = await as(token).patch(`/api/categories/${category.id}`, { type: "INCOME" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No se puede cambiar el tipo de una categoría con movimientos asociados");
      expect((await listCategories(token)).find((c) => c.id === category.id)?.type).toBe("EXPENSE");
    });

    it("con movimientos si se puede renombrar y cambiar el color (el tipo no cambia)", async () => {
      const { token } = await newUser();
      const category = await createCategory(token, { name: "Cafe" });
      await as(token).post("/api/transactions", {
        categoryId: category.id,
        type: "EXPENSE",
        amount: 2.5,
        occurredAt: "2026-10-10T10:00:00.000Z",
      });

      const res = await as(token).patch(`/api/categories/${category.id}`, { type: "EXPENSE", name: "Cafeteria", color: "#E91E63" });

      expect(res.status).toBe(200);
    });

    it("cambiar el tipo a uno donde ya existe ese nombre da 400", async () => {
      const { token } = await newUser();
      await createCategory(token, { name: "Extras", type: "INCOME" });
      const expense = await createCategory(token, { name: "Extras", type: "EXPENSE" });

      const res = await as(token).patch(`/api/categories/${expense.id}`, { type: "INCOME" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Ya existe una categoría con ese nombre y tipo");
    });
  });

  describe("aislamiento entre usuarios", () => {
    it("no se puede editar la categoria de otro usuario (404) y no cambia", async () => {
      const ana = await newUser();
      const luis = await newUser();
      const category = await createCategory(ana.token, { name: "Cafe", color: "#112233" });

      const res = await as(luis.token).patch(`/api/categories/${category.id}`, { name: "Robada", color: "#E91E63" });

      expect(res.status).toBe(404);
      expect((await listCategories(ana.token)).find((c) => c.id === category.id)).toMatchObject({
        name: "Cafe",
        color: "#112233",
      });
    });

    it("una categoria que no existe da 404", async () => {
      const { token } = await newUser();

      expect((await as(token).patch("/api/categories/no-existe", { name: "X" })).status).toBe(404);
    });
  });
});
