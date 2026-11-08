import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL non configurato.");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const risultato = await prisma.profilo.updateMany({
    where: {
      supabaseId:
        "9df38d82-b6f8-4e20-975a-4f5c8decc4ac",
    },
    data: {
      partecipanteId: 1,
    },
  });

  console.log(
    "Profili aggiornati:",
    risultato.count
  );

  const profilo =
    await prisma.profilo.findUnique({
      where: {
        supabaseId:
          "9df38d82-b6f8-4e20-975a-4f5c8decc4ac",
      },
      select: {
        id: true,
        nome: true,
        supabaseId: true,
        partecipanteId: true,
      },
    });

  console.log(
    "Profilo:",
    profilo
  );
}

main()
  .catch((errore) => {
    console.error(
      "ERRORE:",
      errore
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });