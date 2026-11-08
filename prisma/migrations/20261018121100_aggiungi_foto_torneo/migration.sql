-- CreateTable
CREATE TABLE "FotoTorneo" (
    "id" SERIAL NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "percorso" TEXT NOT NULL,
    "didascalia" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoTorneo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoTorneo_torneoId_creatoIl_idx" ON "FotoTorneo"("torneoId", "creatoIl");

-- AddForeignKey
ALTER TABLE "FotoTorneo" ADD CONSTRAINT "FotoTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
