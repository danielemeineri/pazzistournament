-- AlterTable
ALTER TABLE "Trofeo" ADD COLUMN     "partecipanteVincitoreId" INTEGER;

-- CreateIndex
CREATE INDEX "Trofeo_partecipanteVincitoreId_idx" ON "Trofeo"("partecipanteVincitoreId");

-- AddForeignKey
ALTER TABLE "Trofeo" ADD CONSTRAINT "Trofeo_partecipanteVincitoreId_fkey" FOREIGN KEY ("partecipanteVincitoreId") REFERENCES "Partecipante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
