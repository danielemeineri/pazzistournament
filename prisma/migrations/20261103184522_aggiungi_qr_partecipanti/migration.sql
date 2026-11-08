/*
  Warnings:

  - A unique constraint covering the columns `[qrToken]` on the table `Partecipante` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Partecipante" ADD COLUMN     "qrToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Partecipante_qrToken_key" ON "Partecipante"("qrToken");
