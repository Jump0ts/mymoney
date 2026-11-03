-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "budgetEntryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_budgetEntryId_key" ON "Transaction"("budgetEntryId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_budgetEntryId_fkey" FOREIGN KEY ("budgetEntryId") REFERENCES "BudgetEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
