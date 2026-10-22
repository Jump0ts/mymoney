import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/prisma.js";
import { assertTestDatabase } from "./dbGuard.js";

// Antes de borrar nada: solo se permite una base de datos de pruebas (ver tests/dbGuard.ts).
assertTestDatabase(process.env.DATABASE_URL);

beforeEach(async () => {
  await prisma.budgetEntry.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.budgetMonth.deleteMany();
  await prisma.budgetGroup.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
