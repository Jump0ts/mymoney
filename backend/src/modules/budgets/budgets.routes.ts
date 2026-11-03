import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import {
  createEntrySchema,
  createGroupSchema,
  createItemSchema,
  entriesOrderParamsSchema,
  monthParamsSchema,
  reorderSchema,
  updateEntrySchema,
  updateGroupSchema,
  updateItemSchema,
  updateMonthSchema,
} from "./budgets.schema.js";
import { compareYearMonth } from "./budgets.utils.js";
import type { YearMonth } from "./budgets.types.js";

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth);

const findOwnedGroup = async (userId: string, groupId: string) => {
  const group = await prisma.budgetGroup.findFirst({ where: { id: groupId, userId } });
  if (!group) throw notFound("Grupo no encontrado");
  return group;
};

const sameIds = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length;

const nextItemPosition =async (userId: string, groupId: string) => {
  const max = await prisma.budgetItem.aggregate({ where: { userId, groupId }, _max: { position: true } });
  return (max._max.position ?? -1) + 1;
};

const nextEntryPosition = async (userId: string, target: YearMonth, groupId: string) => {
  const max = await prisma.budgetEntry.aggregate({
    where: { userId, ...target, groupId },
    _max: { position: true },
  });
  return (max._max.position ?? -1) + 1;
};

// El grupo que recibe lo que sobra no tiene limite propio (su disponible se calcula) y
// solo puede haber uno por usuario. Devuelve los datos a guardar, con el limite quitado
// si el grupo pasa a ser el del sobrante.
const checkRemainder = async <T extends { limit?: number | null; isRemainder?: boolean }>(
  userId: string,
  body: T,
  current?: { id: string; isRemainder: boolean },
): Promise<T> => {
  const willBeRemainder = body.isRemainder ?? current?.isRemainder ?? false;
  if (!willBeRemainder) return body;

  if (body.limit != null) throw badRequest("El grupo que recibe lo que sobra no puede tener límite");
  if (body.isRemainder) {
    const other = await prisma.budgetGroup.findFirst({
      where: { userId, isRemainder: true, ...(current && { id: { not: current.id } }) },
    });
    if (other) throw badRequest(`Ya existe un grupo que recibe lo que sobra: ${other.name}`);
  }
  return { ...body, limit: null };
};

// Abre el presupuesto de un mes: la primera vez lo genera copiando la plantilla
// (con "pagado" en false) y el sueldo del ultimo mes anterior. Devuelve false si
// el mes es anterior al primer presupuesto del usuario: no tiene sentido
// rellenar con la plantilla de hoy meses que ya pasaron.
const openMonth = async (userId: string, target: YearMonth): Promise<boolean> => {
  const existing = await prisma.budgetMonth.findUnique({
    where: { userId_year_month: { userId, ...target } },
  });
  if (existing) return true;

  const earliest = await prisma.budgetMonth.findFirst({
    where: { userId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  if (earliest && compareYearMonth(target, earliest) < 0) return false;

  const previous = await prisma.budgetMonth.findFirst({
    where: {
      userId,
      OR: [{ year: { lt: target.year } }, { year: target.year, month: { lt: target.month } }],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const items = await prisma.budgetItem.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  try {
    await prisma.$transaction([
      prisma.budgetMonth.create({ data: { userId, ...target, income: previous?.income ?? 0 } }),
      prisma.budgetEntry.createMany({
        data: items.map((item) => ({
          userId,
          ...target,
          groupId: item.groupId,
          itemId: item.id,
          name: item.name,
          amount: item.amount,
          position: item.position,
        })),
        skipDuplicates: true,
      }),
    ]);
  } catch (error) {
    // Otra peticion abrio el mismo mes a la vez: ya esta generado, no hay nada que hacer.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return true;
};

const buildMonthResponse = async (userId: string, target: YearMonth) => {
  const month = await prisma.budgetMonth.findUnique({
    where: { userId_year_month: { userId, ...target } },
  });
  const [groups, entries] = await Promise.all([
    prisma.budgetGroup.findMany({ where: { userId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.budgetEntry.findMany({
      where: { userId, ...target },
      // El gasto enlazado (si lo hay) aporta el importe real de la linea.
      include: { transaction: { select: { id: true, amount: true, occurredAt: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    month: month ? { ...target, income: month.income } : null,
    groups: groups.map((group) => ({
      ...group,
      entries: entries.filter((entry) => entry.groupId === group.id),
    })),
  };
};

// ---- Grupos ----

budgetsRouter.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const groups = await prisma.budgetGroup.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    res.json({ groups });
  }),
);

budgetsRouter.post(
  "/groups",
  asyncHandler(async (req, res) => {
    const body = createGroupSchema.parse(req.body);
    const userId = req.auth!.userId;

    const duplicate = await prisma.budgetGroup.findUnique({ where: { userId_name: { userId, name: body.name } } });
    if (duplicate) throw badRequest("Ya existe un grupo con ese nombre");

    const data = await checkRemainder(userId, body);
    const max = await prisma.budgetGroup.aggregate({ where: { userId }, _max: { position: true } });
    const group = await prisma.budgetGroup.create({
      data: { ...data, userId, position: (max._max.position ?? -1) + 1 },
    });
    res.status(201).json({ group });
  }),
);

// Guarda el orden de todos los grupos. Hay que mandarlos todos: asi nunca quedan posiciones repetidas.
budgetsRouter.put(
  "/groups/order",
  asyncHandler(async (req, res) => {
    const { ids } = reorderSchema.parse(req.body);
    const userId = req.auth!.userId;

    const groups = await prisma.budgetGroup.findMany({ where: { userId }, select: { id: true } });
    if (!sameIds(ids, groups.map((group) => group.id))) {
      throw badRequest("El orden debe incluir exactamente todos tus grupos");
    }

    await prisma.$transaction(
      ids.map((id, position) => prisma.budgetGroup.update({ where: { id }, data: { position } })),
    );
    res.status(204).send();
  }),
);

budgetsRouter.patch(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const body = updateGroupSchema.parse(req.body);
    const userId = req.auth!.userId;
    const group = await findOwnedGroup(userId, req.params.id);

    if (body.name && body.name !== group.name) {
      const duplicate = await prisma.budgetGroup.findUnique({ where: { userId_name: { userId, name: body.name } } });
      if (duplicate) throw badRequest("Ya existe un grupo con ese nombre");
    }

    const data = await checkRemainder(userId, body, group);
    const updated = await prisma.budgetGroup.update({ where: { id: group.id }, data });
    res.json({ group: updated });
  }),
);

budgetsRouter.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const group = await findOwnedGroup(req.auth!.userId, req.params.id);

    const [items, entries] = await Promise.all([
      prisma.budgetItem.count({ where: { groupId: group.id } }),
      prisma.budgetEntry.count({ where: { groupId: group.id } }),
    ]);
    if (items > 0 || entries > 0) {
      throw badRequest("No se puede borrar un grupo que tiene líneas, ni siquiera de meses anteriores");
    }

    await prisma.budgetGroup.delete({ where: { id: group.id } });
    res.status(204).send();
  }),
);

// ---- Plantilla recurrente ----

budgetsRouter.get(
  "/items",
  asyncHandler(async (req, res) => {
    const items = await prisma.budgetItem.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    res.json({ items });
  }),
);

budgetsRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    const body = createItemSchema.parse(req.body);
    const userId = req.auth!.userId;
    await findOwnedGroup(userId, body.groupId);

    const item = await prisma.budgetItem.create({
      data: {
        userId,
        groupId: body.groupId,
        name: body.name,
        amount: body.amount,
        position: await nextItemPosition(userId, body.groupId),
      },
    });
    res.status(201).json({ item });
  }),
);

budgetsRouter.patch(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const body = updateItemSchema.parse(req.body);
    const userId = req.auth!.userId;
    const item = await prisma.budgetItem.findFirst({ where: { id: req.params.id, userId } });
    if (!item) throw notFound("Línea no encontrada");

    if (body.groupId) await findOwnedGroup(userId, body.groupId);

    const updated = await prisma.budgetItem.update({ where: { id: item.id }, data: body });
    res.json({ item: updated });
  }),
);

// Quitar una linea de la plantilla no toca los meses ya generados.
budgetsRouter.delete(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.budgetItem.findFirst({ where: { id: req.params.id, userId: req.auth!.userId } });
    if (!item) throw notFound("Línea no encontrada");

    await prisma.budgetItem.delete({ where: { id: item.id } });
    res.status(204).send();
  }),
);

// ---- Presupuesto de un mes ----

// GET que puede crear el mes la primera vez que se abre (idempotente).
budgetsRouter.get(
  "/months/:year/:month",
  asyncHandler(async (req, res) => {
    const target = monthParamsSchema.parse(req.params);
    const userId = req.auth!.userId;

    await openMonth(userId, target);
    res.json(await buildMonthResponse(userId, target));
  }),
);

budgetsRouter.patch(
  "/months/:year/:month",
  asyncHandler(async (req, res) => {
    const target = monthParamsSchema.parse(req.params);
    const body = updateMonthSchema.parse(req.body);
    const userId = req.auth!.userId;

    await openMonth(userId, target);
    await prisma.budgetMonth.upsert({
      where: { userId_year_month: { userId, ...target } },
      update: { income: body.income },
      create: { userId, ...target, income: body.income },
    });
    res.json(await buildMonthResponse(userId, target));
  }),
);

budgetsRouter.post(
  "/months/:year/:month/entries",
  asyncHandler(async (req, res) => {
    const target = monthParamsSchema.parse(req.params);
    const body = createEntrySchema.parse(req.body);
    const userId = req.auth!.userId;
    await findOwnedGroup(userId, body.groupId);

    // Si el mes es anterior al primer presupuesto no se genera con la plantilla,
    // pero editarlo a mano si lo deja existir (solo con sus propias lineas).
    if (!(await openMonth(userId, target))) {
      await prisma.budgetMonth.create({ data: { userId, ...target } });
    }

    const itemId = body.recurring
      ? (
          await prisma.budgetItem.create({
            data: {
              userId,
              groupId: body.groupId,
              name: body.name,
              amount: body.amount,
              position: await nextItemPosition(userId, body.groupId),
            },
          })
        ).id
      : null;

    const entry = await prisma.budgetEntry.create({
      data: {
        userId,
        ...target,
        groupId: body.groupId,
        itemId,
        name: body.name,
        amount: body.amount,
        position: await nextEntryPosition(userId, target, body.groupId),
      },
    });
    res.status(201).json({ entry });
  }),
);

// Guarda el orden de las lineas de un grupo en un mes. Las que vienen de la plantilla tambien
// reordenan su item, para que los meses que se generen despues salgan en el mismo orden.
budgetsRouter.put(
  "/months/:year/:month/groups/:groupId/entries/order",
  asyncHandler(async (req, res) => {
    const { groupId, ...target } = entriesOrderParamsSchema.parse(req.params);
    const { ids } = reorderSchema.parse(req.body);
    const userId = req.auth!.userId;
    await findOwnedGroup(userId, groupId);

    const entries = await prisma.budgetEntry.findMany({ where: { userId, ...target, groupId } });
    if (!sameIds(ids, entries.map((entry) => entry.id))) {
      throw badRequest("El orden debe incluir exactamente las líneas del grupo en este mes");
    }

    const itemIdOf = new Map(entries.map((entry) => [entry.id, entry.itemId]));
    await prisma.$transaction([
      ...ids.map((id, position) => prisma.budgetEntry.update({ where: { id }, data: { position } })),
      ...ids.flatMap((id, position) => {
        const itemId = itemIdOf.get(id);
        return itemId ? [prisma.budgetItem.update({ where: { id: itemId }, data: { position } })] : [];
      }),
    ]);
    res.status(204).send();
  }),
);

budgetsRouter.patch(
  "/entries/:id",
  asyncHandler(async (req, res) => {
    const body = updateEntrySchema.parse(req.body);
    const userId = req.auth!.userId;
    const entry = await prisma.budgetEntry.findFirst({ where: { id: req.params.id, userId } });
    if (!entry) throw notFound("Línea no encontrada");

    if (body.groupId) await findOwnedGroup(userId, body.groupId);

    // Una linea enlazada a un gasto de Movimientos esta pagada por definicion: para cambiarlo se desenlaza el gasto.
    if (body.paid === false || (body.amount !== undefined && body.amount <= 0)) {
      const linked = await prisma.transaction.findFirst({
        where: { budgetEntryId: entry.id, userId },
        select: { id: true },
      });
      if (linked && body.paid === false) {
        throw conflict(
          "Esta línea está enlazada a un movimiento: desenlázalo desde Movimientos para marcarla como no pagada",
        );
      }
      if (linked) throw badRequest("Una línea enlazada a un gasto no puede pasar a reembolso");
    }

    const updated = await prisma.budgetEntry.update({ where: { id: entry.id }, data: body });
    res.json({ entry: updated });
  }),
);

budgetsRouter.delete(
  "/entries/:id",
  asyncHandler(async (req, res) => {
    const entry = await prisma.budgetEntry.findFirst({ where: { id: req.params.id, userId: req.auth!.userId } });
    if (!entry) throw notFound("Línea no encontrada");

    await prisma.budgetEntry.delete({ where: { id: entry.id } });
    res.status(204).send();
  }),
);
