-- CreateTable
CREATE TABLE "SavedColor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedColor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedColor_userId_hex_key" ON "SavedColor"("userId", "hex");

-- AddForeignKey
ALTER TABLE "SavedColor" ADD CONSTRAINT "SavedColor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
