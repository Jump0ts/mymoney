-- DropIndex
DROP INDEX "Transaction_budgetEntryId_key";

-- AlterTable
ALTER TABLE "BudgetEntry" ADD COLUMN     "envelope" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "envelope" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Transaction_budgetEntryId_idx" ON "Transaction"("budgetEntryId");
