-- El limite pasa de ser un tipo de linea ("limite por categoria") a una propiedad del
-- grupo: un tope opcional para la suma de lo previsto en sus lineas.

-- AlterTable
ALTER TABLE "BudgetGroup" ADD COLUMN "limit" DECIMAL(12,2);

-- Las lineas CATEGORY_LIMIT dejan de existir (solo se habian creado en pruebas locales;
-- la migracion anterior no llego a desplegarse en ningun servidor).
DELETE FROM "BudgetEntry" WHERE "kind" = 'CATEGORY_LIMIT';
DELETE FROM "BudgetItem" WHERE "kind" = 'CATEGORY_LIMIT';

-- DropForeignKey
ALTER TABLE "BudgetEntry" DROP CONSTRAINT "BudgetEntry_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetItem" DROP CONSTRAINT "BudgetItem_categoryId_fkey";

-- AlterTable
ALTER TABLE "BudgetEntry" DROP COLUMN "categoryId",
DROP COLUMN "kind";

-- AlterTable
ALTER TABLE "BudgetItem" DROP COLUMN "categoryId",
DROP COLUMN "kind";

-- DropEnum
DROP TYPE "BudgetLineKind";
