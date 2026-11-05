import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, conflict, notFound } from "../../utils/errors.js";
import {
  ENVELOPE_REFUND,
  createEntrySchema,
  createGroupSchema,
  deleteEntryQuerySchema,
  createItemSchema,
  entriesOrderParamsSchema,
  monthParamsSchema,
  reorderSchema,
  updateEntrySchema,
  updateGroupSchema,
  updateItemSchema,
  updateMonthSchema,
} from "./budgets.schema.js";
import {
  afterMonth,
  compareYearMonth,
  isFutureMonth,
  isTooFarAhead,
  MAX_MONTHS_AHEAD,
  PREVIEW_ENTRY_PREFIX,
} from "./budgets.utils.js";
import {
  findOwnedGroup,
  findPreviousMonth,
  lastCategoryByItem,
  nextEntryPosition,
  openMonth,
} from "./budgets.service.js";
import type { YearMonth } from "./budgets.types.js";

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth);

const sameIds = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length;

const nextItemPosition =async (userId: string, groupId: string) => {
  const max = await prisma.budgetItem.aggregate({ where: { userId, groupId }, _max: { position: true } });
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

const buildMonthResponse = async (userId: string, target: YearMonth) => {
  const month = await prisma.budgetMonth.findUnique({
    where: { userId_year_month: { userId, ...target } },
  });
  const [groups, entries] = await Promise.all([
    prisma.budgetGroup.findMany({ where: { userId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.budgetEntry.findMany({
      where: { userId, ...target },
      // Los gastos enlazados (uno en una linea normal, los que sean en un sobre) aportan el importe real de la linea.
      include: { transactions: { select: { id: true, amount: true, occurredAt: true }, orderBy: { occurredAt: "asc" } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // Solo las lineas sin pagar de plantilla necesitan la categoria sugerida (son las que se van a pagar).
  const suggestions = await lastCategoryByItem(
    userId,
    entries.flatMap((entry) => (!entry.paid && entry.itemId ? [entry.itemId] : [])),
  );

  return {
    preview: false,
    month: month ? { ...target, income: month.income } : null,
    groups: groups.map((group) => ({
      ...group,
      entries: entries
        .filter((entry) => entry.groupId === group.id)
        .map((entry) => ({
          ...entry,
          suggestedCategoryId: (!entry.paid && entry.itemId && suggestions.get(entry.itemId)) || null,
        })),
    })),
  };
};

// Lo que tendria un mes futuro si se abriera ahora (plantilla + ultimo sueldo), sin guardar nada: asi mirar
// meses por delante no los congela con la plantilla de hoy. Sus lineas llevan un id provisional.
const buildPreviewResponse = async (userId: string, target: YearMonth) => {
  const [previous, groups, items] = await Promise.all([
    findPreviousMonth(userId, target),
    prisma.budgetGroup.findMany({ where: { userId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.budgetItem.findMany({ where: { userId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ]);

  return {
    preview: true,
    month: { ...target, income: previous?.income ?? new Prisma.Decimal(0) },
    groups: groups.map((group) => ({
      ...group,
      entries: items
        .filter((item) => item.groupId === group.id)
        .map((item) => ({
          id: `${PREVIEW_ENTRY_PREFIX}${item.id}`,
          year: target.year,
          month: target.month,
          groupId: item.groupId,
          itemId: item.id,
          name: item.name,
          amount: item.amount,
          envelope: item.envelope,
          paid: false,
          position: item.position,
          transactions: [],
        })),
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
        envelope: body.envelope,
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
    if ((body.envelope ?? item.envelope) && (body.amount ?? Number(item.amount)) <= 0) throw badRequest(ENVELOPE_REFUND);

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

// GET de un mes. Un mes actual o pasado se genera la primera vez que se abre (idempotente); uno futuro que
// aun no existe se devuelve como vista previa, sin guardarlo, hasta que se escribe algo en el.
budgetsRouter.get(
  "/months/:year/:month",
  asyncHandler(async (req, res) => {
    const target = monthParamsSchema.parse(req.params);
    const userId = req.auth!.userId;

    if (isFutureMonth(target)) {
      if (isTooFarAhead(target)) {
        throw badRequest(`Solo se pueden preparar presupuestos hasta ${MAX_MONTHS_AHEAD} meses por delante`);
      }
      const [existing, earliest] = await Promise.all([
        prisma.budgetMonth.findUnique({ where: { userId_year_month: { userId, ...target } } }),
        prisma.budgetMonth.findFirst({ where: { userId }, orderBy: [{ year: "asc" }, { month: "asc" }] }),
      ]);
      // Un mes anterior al primero guardado no se rellena con la plantilla: sigue el camino de siempre (sin mes).
      if (!existing && (!earliest || compareYearMonth(target, earliest) >= 0)) {
        res.json(await buildPreviewResponse(userId, target));
        return;
      }
    }

    await openMonth(userId, target);
    res.json(await buildMonthResponse(userId, target));
  }),
);

// Guarda de verdad un mes (generandolo desde la plantilla si hace falta), por ejemplo antes de marcar
// como pagada una linea de un mes que solo se estaba viendo. Idempotente.
budgetsRouter.post(
  "/months/:year/:month/open",
  asyncHandler(async (req, res) => {
    const target = monthParamsSchema.parse(req.params);
    const userId = req.auth!.userId;

    if (!(await openMonth(userId, target))) {
      await prisma.budgetMonth.upsert({
        where: { userId_year_month: { userId, ...target } },
        update: {},
        create: { userId, ...target },
      });
    }
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

    const [itemPosition, entryPosition] = await Promise.all([
      nextItemPosition(userId, body.groupId),
      nextEntryPosition(prisma, userId, target, body.groupId),
    ]);

    const entry = await prisma.$transaction(async (tx) => {
      const item = body.recurring
        ? await tx.budgetItem.create({
            data: {
              userId,
              groupId: body.groupId,
              name: body.name,
              amount: body.amount,
              envelope: body.envelope,
              position: itemPosition,
            },
          })
        : null;

      const created = await tx.budgetEntry.create({
        data: {
          userId,
          ...target,
          groupId: body.groupId,
          itemId: item?.id ?? null,
          name: body.name,
          amount: body.amount,
          envelope: body.envelope,
          position: entryPosition,
        },
      });

      // Una linea recurrente vale tambien para los meses posteriores que ya estan guardados (los que solo
      // se han visto y los que se abran mas adelante la recogen de la plantilla).
      if (item) {
        const later = await tx.budgetMonth.findMany({
          where: { userId, ...afterMonth(target) },
          select: { year: true, month: true },
        });
        await tx.budgetEntry.createMany({
          data: later.map((month) => ({
            userId,
            year: month.year,
            month: month.month,
            groupId: item.groupId,
            itemId: item.id,
            name: item.name,
            amount: item.amount,
            envelope: item.envelope,
            position: item.position,
          })),
          skipDuplicates: true,
        });
      }
      return created;
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
    const { scope, ...body } = updateEntrySchema.parse(req.body);
    const userId = req.auth!.userId;
    const entry = await prisma.budgetEntry.findFirst({ where: { id: req.params.id, userId } });
    if (!entry) throw notFound("Línea no encontrada");

    if (body.groupId) await findOwnedGroup(userId, body.groupId);

    const linkedCount = await prisma.transaction.count({ where: { budgetEntryId: entry.id, userId } });
    const nextEnvelope = body.envelope ?? entry.envelope;
    const nextAmount = body.amount ?? Number(entry.amount);

    // Una linea con un gasto enlazado (no un sobre) esta pagada por definicion: para cambiarlo se desenlaza el gasto.
    if (body.paid === false && linkedCount > 0 && !entry.envelope) {
      throw conflict(
        "Esta línea está enlazada a un movimiento: desenlázalo desde Movimientos para marcarla como no pagada",
      );
    }
    if (nextAmount <= 0 && linkedCount > 0) throw badRequest("Una línea enlazada a un gasto no puede pasar a reembolso");

    // Un sobre solo recibe gastos: no es un reembolso, no nace de un gasto (esa linea sigue a su gasto) y no se
    // marca como pagado (lo gastado es la suma de sus gastos).
    if (nextEnvelope && nextAmount <= 0) throw badRequest(ENVELOPE_REFUND);
    if (nextEnvelope && entry.fromTransaction) {
      throw badRequest("Una línea creada con un gasto no puede ser un sobre");
    }
    if (nextEnvelope && body.paid === true) throw badRequest("Un sobre no se marca como pagado");

    // Cambiar entre linea normal y sobre: el sobre nunca esta "pagado"; una linea normal lo esta si tiene su gasto.
    const switching = body.envelope !== undefined && body.envelope !== entry.envelope;
    if (switching && !body.envelope && linkedCount > 1) {
      throw badRequest(
        `Esta línea tiene ${linkedCount} movimientos enlazados: desenlázalos hasta que quede uno para volver a una línea normal`,
      );
    }
    const data = {
      ...body,
      ...(switching && { paid: !body.envelope && linkedCount === 1 }),
    };

    // Lo que comparte con la plantilla: nombre, importe, grupo y si es un sobre.
    const shared = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.groupId !== undefined && { groupId: body.groupId }),
      ...(body.envelope !== undefined && { envelope: body.envelope }),
    };

    if (scope === "template" && entry.itemId && Object.keys(shared).length > 0) {
      // "Este y los siguientes": cambia la plantilla y los meses posteriores ya guardados, salvo las lineas
      // pagadas, enlazadas a un gasto o editadas a mano solo para su mes. Esta linea vuelve a seguir la plantilla.
      const itemId = entry.itemId;
      const updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.budgetEntry.update({ where: { id: entry.id }, data: { ...data, edited: false } });
        await tx.budgetItem.updateMany({ where: { id: itemId, userId }, data: shared });
        await tx.budgetEntry.updateMany({
          where: { userId, itemId, paid: false, edited: false, transactions: { none: {} }, ...afterMonth(entry) },
          data: shared,
        });
        return saved;
      });
      res.json({ entry: updated });
      return;
    }

    // Solo este mes: si cambia lo que viene de la plantilla, la linea queda marcada como editada a mano.
    const changesTemplateValues =
      (body.name !== undefined && body.name !== entry.name) ||
      (body.amount !== undefined && !entry.amount.equals(body.amount)) ||
      (body.groupId !== undefined && body.groupId !== entry.groupId) ||
      switching;
    const updated = await prisma.budgetEntry.update({
      where: { id: entry.id },
      data: { ...data, ...(entry.itemId && changesTemplateValues && { edited: true }) },
    });
    res.json({ entry: updated });
  }),
);

budgetsRouter.delete(
  "/entries/:id",
  asyncHandler(async (req, res) => {
    const { scope } = deleteEntryQuerySchema.parse(req.query);
    const userId = req.auth!.userId;
    const entry = await prisma.budgetEntry.findFirst({ where: { id: req.params.id, userId } });
    if (!entry) throw notFound("Línea no encontrada");

    if (scope === "template" && entry.itemId) {
      // Quitarla de la plantilla tambien la quita de los meses posteriores ya guardados, salvo las lineas
      // pagadas, enlazadas a un gasto o editadas a mano: esas se quedan como lineas sueltas de su mes.
      const itemId = entry.itemId;
      await prisma.$transaction([
        prisma.budgetEntry.deleteMany({
          where: { userId, itemId, paid: false, edited: false, transactions: { none: {} }, ...afterMonth(entry) },
        }),
        prisma.budgetEntry.delete({ where: { id: entry.id } }),
        prisma.budgetItem.deleteMany({ where: { id: itemId, userId } }),
      ]);
    } else {
      await prisma.budgetEntry.delete({ where: { id: entry.id } });
    }
    res.status(204).send();
  }),
);
