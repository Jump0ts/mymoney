import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { createSavedColorSchema, MAX_SAVED_COLORS } from "./colors.schema.js";

export const colorsRouter = Router();
colorsRouter.use(requireAuth);

// Los colores propios del usuario, del mas antiguo al mas nuevo.
colorsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const colors = await prisma.savedColor.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, hex: true, createdAt: true },
    });
    res.json({ colors });
  }),
);

// Guardar un color es idempotente: si ya estaba guardado (aunque se escriba en minusculas) devuelve el que hay.
colorsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { hex } = createSavedColorSchema.parse(req.body);
    const userId = req.auth!.userId;
    const select = { id: true, hex: true, createdAt: true };

    const existing = await prisma.savedColor.findUnique({ where: { userId_hex: { userId, hex } }, select });
    if (existing) {
      res.json({ color: existing });
      return;
    }

    const count = await prisma.savedColor.count({ where: { userId } });
    if (count >= MAX_SAVED_COLORS) {
      throw badRequest(`Ya tienes ${MAX_SAVED_COLORS} colores guardados: quita alguno para guardar otro`);
    }

    // upsert y no create: dos peticiones a la vez con el mismo color acaban en uno solo, sin error.
    const color = await prisma.savedColor.upsert({
      where: { userId_hex: { userId, hex } },
      create: { userId, hex },
      update: {},
      select,
    });
    res.status(201).json({ color });
  }),
);

colorsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const color = await prisma.savedColor.findFirst({ where: { id: req.params.id, userId: req.auth!.userId } });
    if (!color) throw notFound("Color no encontrado");

    await prisma.savedColor.delete({ where: { id: color.id } });
    res.status(204).send();
  }),
);
