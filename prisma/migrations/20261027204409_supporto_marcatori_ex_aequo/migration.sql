-- CreateTable
CREATE TABLE "TrofeoCalciatoreVincitore" (
    "id" SERIAL NOT NULL,
    "trofeoId" INTEGER NOT NULL,
    "calciatoreTorneoId" INTEGER NOT NULL,

    CONSTRAINT "TrofeoCalciatoreVincitore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrofeoCalciatoreVincitore_calciatoreTorneoId_idx" ON "TrofeoCalciatoreVincitore"("calciatoreTorneoId");

-- CreateIndex
CREATE UNIQUE INDEX "TrofeoCalciatoreVincitore_trofeoId_calciatoreTorneoId_key" ON "TrofeoCalciatoreVincitore"("trofeoId", "calciatoreTorneoId");

-- AddForeignKey
ALTER TABLE "TrofeoCalciatoreVincitore" ADD CONSTRAINT "TrofeoCalciatoreVincitore_trofeoId_fkey" FOREIGN KEY ("trofeoId") REFERENCES "Trofeo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrofeoCalciatoreVincitore" ADD CONSTRAINT "TrofeoCalciatoreVincitore_calciatoreTorneoId_fkey" FOREIGN KEY ("calciatoreTorneoId") REFERENCES "CalciatoreTorneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
