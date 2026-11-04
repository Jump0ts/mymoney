import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerUser } from "./helpers.js";
import { prisma } from "../src/prisma.js";
import { MAX_SAVED_COLORS } from "../src/modules/colors/colors.schema.js";

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
  del: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
});

const newUser = async () => {
  const { res } = await registerUser();
  return { token: res.body.token as string, userId: res.body.user.id as string };
};

type SavedColor = { id: string; hex: string; createdAt: string };

const listColors = async (token: string) => (await as(token).get("/api/colors")).body.colors as SavedColor[];

// Un hex distinto por indice: #000001, #000002...
const hexFor = (index: number) => `#${(index + 1).toString(16).toUpperCase().padStart(6, "0")}`;

describe("colores propios guardados", () => {
  describe("autenticacion", () => {
    it.each([
      ["GET", () => request(app).get("/api/colors")],
      ["POST", () => request(app).post("/api/colors").send({ hex: "#112233" })],
      ["DELETE", () => request(app).delete("/api/colors/abc")],
    ])("%s sin token da 401", async (_method, call) => {
      expect((await call()).status).toBe(401);
    });
  });

  describe("listar", () => {
    it("un usuario nuevo no tiene colores guardados", async () => {
      const { token } = await newUser();

      const res = await as(token).get("/api/colors");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ colors: [] });
    });

    it("los devuelve del mas antiguo al mas nuevo", async () => {
      const { token } = await newUser();
      for (const hex of ["#AA0000", "#00BB00", "#0000CC"]) await as(token).post("/api/colors", { hex });

      expect((await listColors(token)).map((color) => color.hex)).toEqual(["#AA0000", "#00BB00", "#0000CC"]);
    });
  });

  describe("guardar", () => {
    it("guarda un color y lo devuelve con su id", async () => {
      const { token } = await newUser();

      const res = await as(token).post("/api/colors", { hex: "#12AB34" });

      expect(res.status).toBe(201);
      expect(res.body.color).toEqual({ id: expect.any(String), hex: "#12AB34", createdAt: expect.any(String) });
      expect(await listColors(token)).toHaveLength(1);
    });

    it("lo guarda en mayusculas aunque se mande en minusculas", async () => {
      const { token } = await newUser();

      const res = await as(token).post("/api/colors", { hex: "#12ab34" });

      expect(res.body.color.hex).toBe("#12AB34");
    });

    it("guardar dos veces el mismo color no lo duplica y devuelve el que ya habia", async () => {
      const { token } = await newUser();
      const first = await as(token).post("/api/colors", { hex: "#12AB34" });

      const again = await as(token).post("/api/colors", { hex: "#12ab34" });

      expect(first.status).toBe(201);
      expect(again.status).toBe(200);
      expect(again.body.color.id).toBe(first.body.color.id);
      expect(await listColors(token)).toHaveLength(1);
    });

    it("varias peticiones a la vez con el mismo color acaban en una sola fila, sin error", async () => {
      const { token, userId } = await newUser();

      const results = await Promise.all(Array.from({ length: 5 }, () => as(token).post("/api/colors", { hex: "#ABCDEF" })));

      expect(results.every((res) => res.status === 200 || res.status === 201)).toBe(true);
      expect(await prisma.savedColor.count({ where: { userId } })).toBe(1);
    });

    it.each([
      ["sin #", "123456"],
      ["corto", "#12345"],
      ["largo", "#1234567"],
      ["no hexadecimal", "#GGGGGG"],
      ["un nombre", "red"],
      ["vacio", ""],
    ])("rechaza un color %s", async (_name, hex) => {
      const { token } = await newUser();

      const res = await as(token).post("/api/colors", { hex });

      expect(res.status).toBe(400);
      expect(await listColors(token)).toEqual([]);
    });

    it("rechaza una peticion sin color", async () => {
      const { token } = await newUser();

      expect((await as(token).post("/api/colors", {})).status).toBe(400);
    });

    it(`admite hasta ${MAX_SAVED_COLORS} colores y el siguiente se rechaza con un mensaje claro`, async () => {
      const { token, userId } = await newUser();
      await prisma.savedColor.createMany({
        data: Array.from({ length: MAX_SAVED_COLORS }, (_, i) => ({ userId, hex: hexFor(i) })),
      });

      const res = await as(token).post("/api/colors", { hex: "#FFFFFF" });

      expect(res.status).toBe(400);
      expect(res.body.error ?? res.body.message).toContain(String(MAX_SAVED_COLORS));
      expect(await listColors(token)).toHaveLength(MAX_SAVED_COLORS);
    });

    it("con la lista llena, volver a guardar un color que ya esta no falla", async () => {
      const { token, userId } = await newUser();
      await prisma.savedColor.createMany({
        data: Array.from({ length: MAX_SAVED_COLORS }, (_, i) => ({ userId, hex: hexFor(i) })),
      });

      const res = await as(token).post("/api/colors", { hex: hexFor(3).toLowerCase() });

      expect(res.status).toBe(200);
    });

    it("al quitar uno de una lista llena se puede guardar otro", async () => {
      const { token, userId } = await newUser();
      await prisma.savedColor.createMany({
        data: Array.from({ length: MAX_SAVED_COLORS }, (_, i) => ({ userId, hex: hexFor(i) })),
      });
      const [first] = await listColors(token);

      await as(token).del(`/api/colors/${first.id}`);
      const res = await as(token).post("/api/colors", { hex: "#FFFFFF" });

      expect(res.status).toBe(201);
    });
  });

  describe("quitar", () => {
    it("borra el color y deja de salir en la lista", async () => {
      const { token } = await newUser();
      const { body } = await as(token).post("/api/colors", { hex: "#12AB34" });

      const res = await as(token).del(`/api/colors/${body.color.id}`);

      expect(res.status).toBe(204);
      expect(await listColors(token)).toEqual([]);
    });

    it("solo quita el indicado", async () => {
      const { token } = await newUser();
      const a = await as(token).post("/api/colors", { hex: "#AA0000" });
      await as(token).post("/api/colors", { hex: "#00BB00" });

      await as(token).del(`/api/colors/${a.body.color.id}`);

      expect((await listColors(token)).map((color) => color.hex)).toEqual(["#00BB00"]);
    });

    it("un color que no existe da 404", async () => {
      const { token } = await newUser();

      expect((await as(token).del("/api/colors/no-existe")).status).toBe(404);
    });

    it("se puede volver a guardar un color que se quito", async () => {
      const { token } = await newUser();
      const { body } = await as(token).post("/api/colors", { hex: "#12AB34" });
      await as(token).del(`/api/colors/${body.color.id}`);

      const res = await as(token).post("/api/colors", { hex: "#12AB34" });

      expect(res.status).toBe(201);
    });
  });

  describe("aislamiento entre usuarios", () => {
    it("cada usuario solo ve sus colores", async () => {
      const ana = await newUser();
      const luis = await newUser();
      await as(ana.token).post("/api/colors", { hex: "#AA0000" });
      await as(luis.token).post("/api/colors", { hex: "#00BB00" });

      expect((await listColors(ana.token)).map((color) => color.hex)).toEqual(["#AA0000"]);
      expect((await listColors(luis.token)).map((color) => color.hex)).toEqual(["#00BB00"]);
    });

    it("dos usuarios pueden guardar el mismo color, cada uno el suyo", async () => {
      const ana = await newUser();
      const luis = await newUser();

      const a = await as(ana.token).post("/api/colors", { hex: "#AA0000" });
      const b = await as(luis.token).post("/api/colors", { hex: "#AA0000" });

      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.color.id).not.toBe(b.body.color.id);
    });

    it("no se puede quitar el color de otro usuario (404) y sigue estando", async () => {
      const ana = await newUser();
      const luis = await newUser();
      const { body } = await as(ana.token).post("/api/colors", { hex: "#AA0000" });

      const res = await as(luis.token).del(`/api/colors/${body.color.id}`);

      expect(res.status).toBe(404);
      expect(await listColors(ana.token)).toHaveLength(1);
    });

    it("el limite es por usuario", async () => {
      const ana = await newUser();
      const luis = await newUser();
      await prisma.savedColor.createMany({
        data: Array.from({ length: MAX_SAVED_COLORS }, (_, i) => ({ userId: ana.userId, hex: hexFor(i) })),
      });

      expect((await as(luis.token).post("/api/colors", { hex: "#FFFFFF" })).status).toBe(201);
    });
  });
});
