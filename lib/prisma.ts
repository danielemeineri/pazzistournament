import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// =========================================================
// PRISMA - CONFIGURAZIONE CONNESSIONI
// =========================================================
//
// Ottimizzata per:
// - Next.js 16
// - Prisma 7
// - PostgreSQL Supabase
// - Vercel Serverless
//
// Obiettivo:
// limitare le connessioni simultanee per istanza
// ed evitare la creazione di pool duplicati.
// =========================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

// =========================================================
// DATABASE URL
// =========================================================

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL non è stata trovata. Controlla le variabili d'ambiente."
  );
}

// =========================================================
// POOL POSTGRESQL
// =========================================================

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: databaseUrl,

    // Massimo 2 connessioni per istanza serverless.
    max: 2,

    // Non mantenere connessioni minime obbligatorie.
    min: 0,

    // Attesa massima per ottenere una connessione.
    connectionTimeoutMillis: 10000,

    // Chiude le connessioni inattive dopo 10 secondi.
    idleTimeoutMillis: 10000,

    // Consente al processo di terminare senza
    // aspettare connessioni inattive.
    allowExitOnIdle: true,
  });

// =========================================================
// ADAPTER PRISMA
// =========================================================

const adapter = new PrismaPg(pool);

// =========================================================
// PRISMA CLIENT SINGLETON
// =========================================================

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

// =========================================================
// CACHE GLOBALE
// =========================================================

globalForPrisma.prisma = prisma;
globalForPrisma.prismaPool = pool;