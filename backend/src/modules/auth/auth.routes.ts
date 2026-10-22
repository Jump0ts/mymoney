import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { env } from "../../env.js";
import { badRequest, forbidden, unauthorized } from "../../utils/errors.js";
import { hashPassword, signAuthToken, verifyPassword } from "./auth.utils.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { DEFAULT_CATEGORIES } from "../categories/categories.constants.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    if (!env.REGISTRATION_ENABLED) throw forbidden("El registro de cuentas está cerrado");
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw badRequest("Ya existe una cuenta con ese email");
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) },
      },
    });

    const token = signAuthToken({ userId: user.id });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw unauthorized("Email o contraseña incorrectos");
    }

    const token = signAuthToken({ userId: user.id });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  }),
);
