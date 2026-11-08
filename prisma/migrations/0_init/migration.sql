-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."PeriodoPartita" AS ENUM ('PT', 'ST', 'PTS', 'STS');

-- CreateEnum
CREATE TYPE "public"."Ruolo" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."TempoPartita" AS ENUM ('PT', 'ST', 'SUPPLEMENTARI', 'PRIMO_TEMPO', 'SECONDO_TEMPO');

-- CreateEnum
CREATE TYPE "public"."TipoGol" AS ENUM ('NORMALE', 'RIGORE', 'AUTOGOL');

-- CreateEnum
CREATE TYPE "public"."TipoTrofeo" AS ENUM ('VINCITORE_TORNEO', 'MIGLIOR_MARCATORE', 'MIGLIOR_ASSISTMAN', 'MIGLIOR_PORTIERE', 'MVP', 'SQUADRA_SORPRESA', 'MIGLIOR_MOMENTO');

-- CreateTable
CREATE TABLE "public"."Calciatore" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calciatore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalciatoreTorneo" (
    "id" SERIAL NOT NULL,
    "calciatoreId" INTEGER NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "squadraId" INTEGER NOT NULL,

    CONSTRAINT "CalciatoreTorneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartellinoRosso" (
    "id" SERIAL NOT NULL,
    "partitaId" BIGINT NOT NULL,
    "calciatoreTorneoId" INTEGER,
    "squadraId" INTEGER NOT NULL,
    "minuto" INTEGER,

    CONSTRAINT "CartellinoRosso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Girone" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "torneoId" INTEGER NOT NULL,

    CONSTRAINT "Girone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Gol" (
    "id" SERIAL NOT NULL,
    "partitaId" BIGINT NOT NULL,
    "squadraId" INTEGER NOT NULL,
    "minuto" INTEGER NOT NULL,
    "tipo" "public"."TipoGol" NOT NULL DEFAULT 'NORMALE',
    "calciatoreTorneoId" INTEGER NOT NULL,
    "periodo" "public"."TempoPartita" NOT NULL DEFAULT 'ST',
    "recupero" INTEGER DEFAULT 0,
    "periodo_temp" "public"."TempoPartita",

    CONSTRAINT "Gol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Partecipante" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partecipante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Partecipazione" (
    "id" SERIAL NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "squadraId" INTEGER NOT NULL,
    "partecipanteId" INTEGER,
    "gironeId" INTEGER,

    CONSTRAINT "Partecipazione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Partita" (
    "id" BIGSERIAL NOT NULL,
    "TorneoId" INTEGER NOT NULL,
    "SquadraCasaId" INTEGER,
    "SquadraOspiteId" INTEGER,
    "dataPartita" DATE,
    "OraPartita" TIME(6),
    "Fase" TEXT,
    "GolCasa" INTEGER,
    "GolOspite" INTEGER,
    "Completata" BOOLEAN DEFAULT false,
    "NumeroGara" INTEGER NOT NULL DEFAULT 1,
    "giornata" INTEGER,
    "gironeId" INTEGER,
    "AiRigori" BOOLEAN NOT NULL DEFAULT false,
    "RigoriCasa" INTEGER,
    "RigoriOspite" INTEGER,

    CONSTRAINT "Partita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profilo" (
    "id" SERIAL NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ruolo" "public"."Ruolo" NOT NULL DEFAULT 'USER',
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partecipanteId" INTEGER,

    CONSTRAINT "Profilo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Squadra" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nazione" TEXT,
    "stemma" TEXT,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "bandiera" TEXT,

    CONSTRAINT "Squadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Torneo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "anno" INTEGER NOT NULL,
    "squadre" INTEGER NOT NULL,
    "formula" TEXT NOT NULL,
    "andataRitorno" BOOLEAN NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videogioco" TEXT,
    "videogiocoId" INTEGER,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trofeo" (
    "id" SERIAL NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "tipo" "public"."TipoTrofeo" NOT NULL,
    "valore" INTEGER,
    "nota" TEXT,
    "squadraVincitriceId" INTEGER,
    "calciatoreVincitoreId" INTEGER,

    CONSTRAINT "Trofeo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValutazioneSquadraGioco" (
    "id" SERIAL NOT NULL,
    "videogiocoId" INTEGER NOT NULL,
    "squadraId" INTEGER NOT NULL,
    "valutazione" INTEGER NOT NULL,

    CONSTRAINT "ValutazioneSquadraGioco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Videogioco" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "anno" INTEGER,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Videogioco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Calciatore_nome_key" ON "public"."Calciatore"("nome" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CalciatoreTorneo_calciatoreId_torneoId_squadraId_key" ON "public"."CalciatoreTorneo"("calciatoreId" ASC, "torneoId" ASC, "squadraId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Girone_torneoId_nome_key" ON "public"."Girone"("torneoId" ASC, "nome" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Partecipante_nome_key" ON "public"."Partecipante"("nome" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Partecipazione_torneoId_squadraId_key" ON "public"."Partecipazione"("torneoId" ASC, "squadraId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Profilo_partecipanteId_key" ON "public"."Profilo"("partecipanteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Profilo_supabaseId_key" ON "public"."Profilo"("supabaseId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Trofeo_torneoId_tipo_key" ON "public"."Trofeo"("torneoId" ASC, "tipo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ValutazioneSquadraGioco_videogiocoId_squadraId_key" ON "public"."ValutazioneSquadraGioco"("videogiocoId" ASC, "squadraId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Videogioco_nome_key" ON "public"."Videogioco"("nome" ASC);

-- AddForeignKey
ALTER TABLE "public"."CalciatoreTorneo" ADD CONSTRAINT "CalciatoreTorneo_calciatoreId_fkey" FOREIGN KEY ("calciatoreId") REFERENCES "public"."Calciatore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalciatoreTorneo" ADD CONSTRAINT "CalciatoreTorneo_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "public"."Squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalciatoreTorneo" ADD CONSTRAINT "CalciatoreTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "public"."Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartellinoRosso" ADD CONSTRAINT "CartellinoRosso_calciatoreTorneoId_fkey" FOREIGN KEY ("calciatoreTorneoId") REFERENCES "public"."CalciatoreTorneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartellinoRosso" ADD CONSTRAINT "CartellinoRosso_partitaId_fkey" FOREIGN KEY ("partitaId") REFERENCES "public"."Partita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartellinoRosso" ADD CONSTRAINT "CartellinoRosso_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "public"."Squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Girone" ADD CONSTRAINT "Girone_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "public"."Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gol" ADD CONSTRAINT "Gol_calciatoreTorneoId_fkey" FOREIGN KEY ("calciatoreTorneoId") REFERENCES "public"."CalciatoreTorneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gol" ADD CONSTRAINT "Gol_partitaId_fkey" FOREIGN KEY ("partitaId") REFERENCES "public"."Partita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gol" ADD CONSTRAINT "Gol_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "public"."Squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partecipazione" ADD CONSTRAINT "Partecipazione_gironeId_fkey" FOREIGN KEY ("gironeId") REFERENCES "public"."Girone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partecipazione" ADD CONSTRAINT "Partecipazione_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES "public"."Partecipante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partecipazione" ADD CONSTRAINT "Partecipazione_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "public"."Squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partecipazione" ADD CONSTRAINT "Partecipazione_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "public"."Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partita" ADD CONSTRAINT "Partita_SquadraCasaId_fkey" FOREIGN KEY ("SquadraCasaId") REFERENCES "public"."Squadra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partita" ADD CONSTRAINT "Partita_SquadraOspiteId_fkey" FOREIGN KEY ("SquadraOspiteId") REFERENCES "public"."Squadra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partita" ADD CONSTRAINT "Partita_TorneoId_fkey" FOREIGN KEY ("TorneoId") REFERENCES "public"."Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Partita" ADD CONSTRAINT "Partita_gironeId_fkey" FOREIGN KEY ("gironeId") REFERENCES "public"."Girone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Profilo" ADD CONSTRAINT "Profilo_partecipanteId_fkey" FOREIGN KEY ("partecipanteId") REFERENCES "public"."Partecipante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Torneo" ADD CONSTRAINT "Torneo_videogiocoId_fkey" FOREIGN KEY ("videogiocoId") REFERENCES "public"."Videogioco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trofeo" ADD CONSTRAINT "Trofeo_calciatoreVincitoreId_fkey" FOREIGN KEY ("calciatoreVincitoreId") REFERENCES "public"."CalciatoreTorneo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trofeo" ADD CONSTRAINT "Trofeo_squadraVincitriceId_fkey" FOREIGN KEY ("squadraVincitriceId") REFERENCES "public"."Squadra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trofeo" ADD CONSTRAINT "Trofeo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "public"."Torneo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValutazioneSquadraGioco" ADD CONSTRAINT "ValutazioneSquadraGioco_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "public"."Squadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValutazioneSquadraGioco" ADD CONSTRAINT "ValutazioneSquadraGioco_videogiocoId_fkey" FOREIGN KEY ("videogiocoId") REFERENCES "public"."Videogioco"("id") ON DELETE CASCADE ON UPDATE CASCADE;
