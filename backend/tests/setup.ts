import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/prisma.js";

beforeEach(async () => {
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.family.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
