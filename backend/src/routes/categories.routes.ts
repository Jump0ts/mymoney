import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/errors.js";
import { createCategorySchema, updateCategorySchema } from "../validators/category.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { familyId: req.auth!.familyId },
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
        familyId_name_type: { familyId: req.auth!.familyId, name: body.name, type: body.type },
      },
    });
    if (duplicate) {
      throw badRequest("Ya existe una categoría con ese nombre y tipo");
    }

    const category = await prisma.category.create({
      data: { ...body, familyId: req.auth!.familyId },
    });
    res.status(201).json({ category });
  }),
);

categoriesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateCategorySchema.parse(req.body);

    const category = await prisma.category.findFirst({
      where: { id: req.params.id, familyId: req.auth!.familyId },
    });
    if (!category) throw notFound("Categoría no encontrada");

    const updated = await prisma.category.update({ where: { id: category.id }, data: body });
    res.json({ category: updated });
  }),
);

categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, familyId: req.auth!.familyId },
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
