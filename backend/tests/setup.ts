import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/prisma.js";

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
