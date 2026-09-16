import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";
import { DEFAULT_CATEGORIES } from "../src/constants/defaultCategories.js";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@mymoney.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Ya existe la familia de ejemplo, no se hace nada.");
    return;
  }

  const passwordHash = await hashPassword("demo12345");

  const family = await prisma.family.create({
    data: {
      name: "Familia Demo",
      categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) },
      users: {
        create: { name: "Demo", email, passwordHash, role: "OWNER" },
      },
    },
  });

  console.log(`Familia de ejemplo creada (${family.name}). Login: ${email} / demo12345`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
