/*
  Warnings:

  - You are about to alter the column `embedding` on the `DocumentEmbedding` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "DocumentEmbedding" ALTER COLUMN "embedding" SET DATA TYPE DECIMAL(65,30)[];

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blacklist_tenantId_idx" ON "Blacklist"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_tenantId_phoneNumber_key" ON "Blacklist"("tenantId", "phoneNumber");

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
