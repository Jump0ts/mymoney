import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  summaryQuerySchema,
  updateTransactionSchema,
} from "../validators/transaction.js";

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
        include: { category: true },
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

    const byMonth = await prisma.$queryRaw<
      Array<{ month: Date; type: "INCOME" | "EXPENSE"; total: Prisma.Decimal }>
    >(Prisma.sql`
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
    const body = createTransactionSchema.parse(req.body);
    const userId = req.auth!.userId;

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, userId },
    });
    if (!category) throw notFound("Categoría no encontrada");

    const transaction = await prisma.transaction.create({
      data: { ...body, userId },
      include: { category: true },
    });
    res.status(201).json({ transaction });
  }),
);

transactionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateTransactionSchema.parse(req.body);
    const userId = req.auth!.userId;

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) throw notFound("Movimiento no encontrado");

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, userId },
      });
      if (!category) throw notFound("Categoría no encontrada");
    }

    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: body,
      include: { category: true },
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

    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);
