import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, notFound } from "../../utils/errors.js";
import { createCategorySchema, updateCategorySchema } from "./categories.schema.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    res.json({ categories });
  }),
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createCategorySchema.parse(req.body);

    const duplicate = await prisma.category.findUnique({
      where: {
        userId_name_type: { userId: req.auth!.userId, name: body.name, type: body.type },
      },
    });
    if (duplicate) {
      throw badRequest("Ya existe una categoría con ese nombre y tipo");
    }

    const category = await prisma.category.create({
      data: { ...body, userId: req.auth!.userId },
    });
    res.status(201).json({ category });
  }),
);

categoriesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateCategorySchema.parse(req.body);
    const userId = req.auth!.userId;

    const category = await prisma.category.findFirst({ where: { id: req.params.id, userId } });
    if (!category) throw notFound("Categoría no encontrada");

    const name = body.name ?? category.name;
    const type = body.type ?? category.type;

    // El nombre es unico por usuario y tipo: renombrar a uno que ya existe se rechaza con un mensaje claro
    // (la propia categoria con su mismo nombre no cuenta como repetida).
    if (name !== category.name || type !== category.type) {
      const duplicate = await prisma.category.findUnique({ where: { userId_name_type: { userId, name, type } } });
      if (duplicate && duplicate.id !== category.id) {
        throw badRequest("Ya existe una categoría con ese nombre y tipo");
      }
    }

    // Pasar de gasto a ingreso (o al reves) con movimientos asociados los dejaria en una categoria del otro tipo.
    if (type !== category.type) {
      const usageCount = await prisma.transaction.count({ where: { categoryId: category.id } });
      if (usageCount > 0) {
        throw badRequest("No se puede cambiar el tipo de una categoría con movimientos asociados");
      }
    }

    try {
      const updated = await prisma.category.update({ where: { id: category.id }, data: body });
      res.json({ category: updated });
    } catch (error) {
      // Dos peticiones a la vez con el mismo nombre nuevo: la base de datos rechaza la segunda.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw badRequest("Ya existe una categoría con ese nombre y tipo");
      }
      throw error;
    }
  }),
);

categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.auth!.userId },
    });
    if (!category) throw notFound("Categoría no encontrada");

    const usageCount = await prisma.transaction.count({ where: { categoryId: category.id } });
    if (usageCount > 0) {
      throw badRequest("No se puede borrar una categoría con movimientos asociados");
    }

    await prisma.category.delete({ where: { id: category.id } });
    res.status(204).send();
  }),
);
