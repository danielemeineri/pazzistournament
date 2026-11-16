-- Aggiunta indipendente: non modifica le tabelle esistenti.
BEGIN;
CREATE TABLE "VisitaEsterna" (
  "id" UUID NOT NULL,
  "visitatoreId" UUID NOT NULL,
  "iniziataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimaAttivitaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "secondiAttivi" INTEGER NOT NULL DEFAULT 0,
  "richieste" INTEGER NOT NULL DEFAULT 1,
  "dispositivo" TEXT NOT NULL,
  "primoPercorso" TEXT NOT NULL,
  "ultimoPercorso" TEXT NOT NULL,
  CONSTRAINT "VisitaEsterna_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VisitaEsterna_visitatoreId_iniziataIl_idx" ON "VisitaEsterna"("visitatoreId", "iniziataIl");
CREATE INDEX "VisitaEsterna_iniziataIl_idx" ON "VisitaEsterna"("iniziataIl");
-- Nessuna policy pubblica: letture/scritture solo dal backend Prisma
-- con la connessione server che usa il proprietario o un ruolo BYPASSRLS.
ALTER TABLE "VisitaEsterna" ENABLE ROW LEVEL SECURITY;
COMMIT;
