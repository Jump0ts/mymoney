-- Un grupo puede marcarse como el que recibe lo que sobra del sueldo despues de repartir
-- el resto. Su "disponible" se calcula en la app; aqui solo se guarda la marca.

-- AlterTable
ALTER TABLE "BudgetGroup" ADD COLUMN "isRemainder" BOOLEAN NOT NULL DEFAULT false;
