
ALTER TABLE "Partita"
ADD COLUMN "sostitutoCasaId" INTEGER,
ADD COLUMN "sostitutoOspiteId" INTEGER;

CREATE TABLE "RankingAllenatore" (
    "id" SERIAL NOT NULL,
    "partecipanteId" INTEGER NOT NULL,
    "punti" INTEGER NOT NULL DEFAULT 0,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RankingAllenatore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoricoRankingAllenatore" (
    "id" SERIAL NOT NULL,
    "rankingAllenatoreId" INTEGER NOT NULL,
    "partitaId" BIGINT NOT NULL,
    "puntiPrima" INTEGER NOT NULL,
    "variazione" INTEGER NOT NULL,
    "puntiDopo" INTEGER NOT NULL,
    "ruolo" TEXT NOT NULL,
    "fase" TEXT,
    "risultato" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoricoRankingAllenatore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RankingAllenatore_partecipanteId_key"
ON "RankingAllenatore"("partecipanteId");

CREATE INDEX "RankingAllenatore_punti_idx"
ON "RankingAllenatore"("punti");

CREATE INDEX "StoricoRankingAllenatore_partitaId_idx"
ON "StoricoRankingAllenatore"("partitaId");

CREATE UNIQUE INDEX "StoricoRankingAllenatore_rankingAllenatoreId_partitaId_ruol_key"
ON "StoricoRankingAllenatore"("rankingAllenatoreId", "partitaId", "ruolo");

ALTER TABLE "Partita"
ADD CONSTRAINT "Partita_sostitutoCasaId_fkey"
FOREIGN KEY ("sostitutoCasaId") REFERENCES "Partecipante"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Partita"
ADD CONSTRAINT "Partita_sostitutoOspiteId_fkey"
FOREIGN KEY ("sostitutoOspiteId") REFERENCES "Partecipante"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RankingAllenatore"
ADD CONSTRAINT "RankingAllenatore_partecipanteId_fkey"
FOREIGN KEY ("partecipanteId") REFERENCES "Partecipante"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoricoRankingAllenatore"
ADD CONSTRAINT "StoricoRankingAllenatore_rankingAllenatoreId_fkey"
FOREIGN KEY ("rankingAllenatoreId") REFERENCES "RankingAllenatore"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoricoRankingAllenatore"
ADD CONSTRAINT "StoricoRankingAllenatore_partitaId_fkey"
FOREIGN KEY ("partitaId") REFERENCES "Partita"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
