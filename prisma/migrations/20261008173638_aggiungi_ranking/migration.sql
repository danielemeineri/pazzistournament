-- CreateEnum
CREATE TYPE "TipoRanking" AS ENUM ('NAZIONALE', 'CLUB', 'MISTO');

-- CreateTable
CREATE TABLE "RankingSquadra" (
    "id" SERIAL NOT NULL,
    "squadraId" INTEGER NOT NULL,
    "tipo" "TipoRanking" NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingSquadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoricoRankingSquadra" (
    "id" SERIAL NOT NULL,
    "rankingSquadraId" INTEGER NOT NULL,
    "partitaId" BIGINT NOT NULL,
    "ratingPrima" INTEGER NOT NULL,
    "variazione" INTEGER NOT NULL,
    "ratingDopo" INTEGER NOT NULL,
    "fase" TEXT,
    "risultato" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoricoRankingSquadra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingSquadra_tipo_rating_idx" ON "RankingSquadra"("tipo", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSquadra_squadraId_tipo_key" ON "RankingSquadra"("squadraId", "tipo");

-- CreateIndex
CREATE INDEX "StoricoRankingSquadra_partitaId_idx" ON "StoricoRankingSquadra"("partitaId");

-- CreateIndex
CREATE UNIQUE INDEX "StoricoRankingSquadra_rankingSquadraId_partitaId_key" ON "StoricoRankingSquadra"("rankingSquadraId", "partitaId");

-- AddForeignKey
ALTER TABLE "RankingSquadra" ADD CONSTRAINT "RankingSquadra_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "Squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoricoRankingSquadra" ADD CONSTRAINT "StoricoRankingSquadra_rankingSquadraId_fkey" FOREIGN KEY ("rankingSquadraId") REFERENCES "RankingSquadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoricoRankingSquadra" ADD CONSTRAINT "StoricoRankingSquadra_partitaId_fkey" FOREIGN KEY ("partitaId") REFERENCES "Partita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
