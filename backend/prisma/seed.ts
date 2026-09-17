import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";
import { DEFAULT_CATEGORIES } from "../src/constants/defaultCategories.js";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@mymoney.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Ya existe el usuario de ejemplo, no se hace nada.");
    return;
  }

  const passwordHash = await hashPassword("demo12345");

  const user = await prisma.user.create({
    data: {
      name: "Demo",
      email,
      passwordHash,
      categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) },
    },
  });

  console.log(`Usuario de ejemplo creado (${user.name}). Login: ${email} / demo12345`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
