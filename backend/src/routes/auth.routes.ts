import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, forbidden, unauthorized } from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAuthToken } from "../utils/jwt.js";
import { inviteMemberSchema, loginSchema, registerFamilySchema } from "../validators/auth.js";
import { DEFAULT_CATEGORIES } from "../constants/defaultCategories.js";

export const authRouter = Router();

authRouter.post(
  "/register-family",
  asyncHandler(async (req, res) => {
    const body = registerFamilySchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw badRequest("Ya existe un usuario con ese email");
    }

    const passwordHash = await hashPassword(body.password);

    const family = await prisma.family.create({
      data: {
        name: body.familyName,
        categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) },
        users: {
          create: {
            name: body.name,
            email: body.email,
            passwordHash,
            role: "OWNER",
          },
        },
      },
      include: { users: true },
    });

    const owner = family.users[0];
    const token = signAuthToken({ userId: owner.id, familyId: family.id });

    res.status(201).json({
      token,
      user: { id: owner.id, name: owner.name, email: owner.email, role: owner.role },
      family: { id: family.id, name: family.name },
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

    const token = signAuthToken({ userId: user.id, familyId: user.familyId });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }),
);

authRouter.post(
  "/invite-member",
  requireAuth,
  asyncHandler(async (req, res) => {
    const requester = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    if (requester.role !== "OWNER") {
      throw forbidden("Solo el propietario de la familia puede invitar miembros");
    }

    const body = inviteMemberSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw badRequest("Ya existe un usuario con ese email");
    }

    const passwordHash = await hashPassword(body.password);
    const member = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: "MEMBER",
        familyId: requester.familyId,
      },
    });

    res.status(201).json({
      user: { id: member.id, name: member.name, email: member.email, role: member.role },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }),
);
