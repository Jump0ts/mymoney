import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { badRequest, notFound } from "../../utils/errors.js";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  summaryQuerySchema,
  updateTransactionSchema,
} from "./transactions.schema.js";
import type { MonthlyBreakdownRow } from "./transactions.types.js";
import { ensureMonth, findOwnedGroup } from "../budgets/budgets.service.js";
import {
  LINK_EXCLUSIVE,
  GROUP_ONLY_EXPENSE,
  assertLinkable,
  coversEntry,
  createEntryForExpense,
  entryNameFor,
  monthOf,
  releaseEntry,
  setEntryPaid,
  transactionInclude,
} from "./transactions.utils.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listTransactionsQuerySchema.parse(req.query);
    const userId = req.auth!.userId;

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.type && { type: query.type }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        description: { contains: query.search, mode: "insensitive" as const },
      }),
      ...((query.from || query.to) && {
        occurredAt: {
          ...(query.from && { gte: query.from }),
          ...(query.to && { lte: query.to }),
        },
      }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: { occurredAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }),
);

transactionsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const query = summaryQuerySchema.parse(req.query);
    const userId = req.auth!.userId;

    const dateFilter: Prisma.TransactionWhereInput["occurredAt"] = {
      ...(query.from && { gte: query.from }),
      ...(query.to && { lte: query.to }),
    };
    const hasDateFilter = Boolean(query.from || query.to);

    const totalsByType = await prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, ...(hasDateFilter && { occurredAt: dateFilter }) },
      _sum: { amount: true },
    });

    const totalIncome = Number(
      totalsByType.find((t) => t.type === "INCOME")?._sum.amount ?? 0,
    );
    const totalExpense = Number(
      totalsByType.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0,
    );

    const byCategoryRaw = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, ...(hasDateFilter && { occurredAt: dateFilter }) },
      _sum: { amount: true },
    });

    const categories = await prisma.category.findMany({
      where: { id: { in: byCategoryRaw.map((c) => c.categoryId) } },
    });

    const byCategory = byCategoryRaw
      .map((row) => {
        const category = categories.find((c) => c.id === row.categoryId)!;
        return {
          categoryId: category.id,
          categoryName: category.name,
          color: category.color,
          type: category.type,
          total: Number(row._sum.amount ?? 0),
        };
      })
      .sort((a, b) => b.total - a.total);

    const byMonth = await prisma.$queryRaw<MonthlyBreakdownRow[]>(Prisma.sql`
      SELECT date_trunc('month', "occurredAt") AS month, "type", SUM("amount") AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
      ${query.from ? Prisma.sql`AND "occurredAt" >= ${query.from}` : Prisma.empty}
      ${query.to ? Prisma.sql`AND "occurredAt" <= ${query.to}` : Prisma.empty}
      GROUP BY month, "type"
      ORDER BY month ASC
    `);

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategory,
      byMonth: byMonth.map((row) => ({
        month: row.month.toISOString().slice(0, 7),
        type: row.type,
        total: Number(row.total),
      })),
    });
  }),
);

transactionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { budgetEntryId, budgetGroupId, ...body } = createTransactionSchema.parse(req.body);
    const userId = req.auth!.userId;

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, userId },
    });
    if (!category) throw notFound("Categoría no encontrada");
    if (budgetGroupId && body.type !== "EXPENSE") throw badRequest(GROUP_ONLY_EXPENSE);
    if (budgetEntryId && budgetGroupId) throw badRequest(LINK_EXCLUSIVE);

    // Con grupo, el gasto crea su propia linea puntual: el mes se guarda antes (puede generarse desde la plantilla).
    const month = monthOf(body.occurredAt);
    if (budgetGroupId) {
      await findOwnedGroup(userId, budgetGroupId);
      await ensureMonth(userId, month);
    }

    const transaction = await prisma.$transaction(async (db) => {
      let linkId = budgetEntryId ?? null;
      let linkedToEnvelope = false;
      if (budgetGroupId) {
        const entry = await createEntryForExpense(db, userId, {
          groupId: budgetGroupId,
          name: entryNameFor(body.description, category.name),
          amount: body.amount,
          month,
        });
        linkId = entry.id;
      } else if (linkId) {
        linkedToEnvelope = (await assertLinkable(db, userId, linkId, body.type)).envelope;
      }
      const created = await db.transaction.create({
        data: { ...body, userId, budgetEntryId: linkId },
        include: transactionInclude,
      });
      if (linkId && !budgetGroupId && !linkedToEnvelope) await setEntryPaid(db, linkId, true);
      return created;
    });
    res.status(201).json({ transaction });
  }),
);

transactionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { budgetEntryId: requestedLink, budgetGroupId, ...body } = updateTransactionSchema.parse(req.body);
    const userId = req.auth!.userId;

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId },
      include: {
        budgetEntry: { select: { id: true, fromTransaction: true, groupId: true, year: true, month: true, amount: true } },
      },
    });
    if (!existing) throw notFound("Movimiento no encontrado");

    const type = body.type ?? existing.type;
    const amount = body.amount ?? Number(existing.amount);
    const description = body.description !== undefined ? body.description : existing.description;
    const occurredAt = body.occurredAt ?? existing.occurredAt;
    if (budgetGroupId && requestedLink) throw badRequest(LINK_EXCLUSIVE);
    if (budgetGroupId && type !== "EXPENSE") throw badRequest(GROUP_ONLY_EXPENSE);

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId ?? existing.categoryId, userId },
    });
    if (!category) throw notFound("Categoría no encontrada");

    // undefined = no tocar el enlace; null = quitarlo. Si el movimiento cambia de tipo y ya no encaja con su
    // linea (un gasto que pasa a ingreso, o al reves), pierde el enlace; un enlace pedido se valida al guardar.
    let nextLink = requestedLink !== undefined ? requestedLink : existing.budgetEntryId;
    if (requestedLink === undefined && existing.budgetEntry && !coversEntry(type, existing.budgetEntry.amount)) {
      nextLink = null;
    }

    // Una linea creada con este gasto vive en el mes del gasto: si la fecha cambia de mes, se rehace en el nuevo
    // (mismo grupo) en vez de dejarla en un mes que ya no le corresponde.
    const own = existing.budgetEntry;
    const month = monthOf(occurredAt);
    let newGroupId = budgetGroupId;
    if (!newGroupId && own?.fromTransaction && nextLink === own.id) {
      if (month.year !== own.year || month.month !== own.month) newGroupId = own.groupId;
    }
    if (newGroupId) {
      await findOwnedGroup(userId, newGroupId);
      await ensureMonth(userId, month);
    }

    const transaction = await prisma.$transaction(async (db) => {
      let linkId = nextLink;
      let linkedToEnvelope = false;
      if (newGroupId) {
        const entry = await createEntryForExpense(db, userId, {
          groupId: newGroupId,
          name: entryNameFor(description, category.name),
          amount,
          month,
        });
        linkId = entry.id;
      } else if (linkId && linkId !== existing.budgetEntryId) {
        linkedToEnvelope = (await assertLinkable(db, userId, linkId, type, existing.id)).envelope;
      }

      await db.transaction.update({
        where: { id: existing.id },
        data: { ...body, budgetEntryId: linkId },
      });

      const linkChanged = linkId !== existing.budgetEntryId;
      if (linkChanged && existing.budgetEntryId) await releaseEntry(db, existing.budgetEntryId);
      if (linkChanged && linkId && !newGroupId && !linkedToEnvelope) await setEntryPaid(db, linkId, true);
      // La linea que nacio con el gasto sigue a su gasto: mismo importe y nombre.
      if (!linkChanged && own?.fromTransaction) {
        await db.budgetEntry.update({
          where: { id: own.id },
          data: { amount, name: entryNameFor(description, category.name) },
        });
      }
      return db.transaction.findUniqueOrThrow({ where: { id: existing.id }, include: transactionInclude });
    });
    res.json({ transaction });
  }),
);

transactionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.auth!.userId },
    });
    if (!existing) throw notFound("Movimiento no encontrado");

    await prisma.$transaction(async (db) => {
      await db.transaction.delete({ where: { id: existing.id } });
      // Sin el gasto, la linea del presupuesto vuelve a estar sin pagar (o se borra, si nacio con el gasto).
      if (existing.budgetEntryId) await releaseEntry(db, existing.budgetEntryId);
    });
    res.status(204).send();
  }),
);
