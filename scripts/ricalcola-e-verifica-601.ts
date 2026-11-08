import { prisma } from "@/lib/prisma";
import { ricalcolaRankingCompleto } from "@/lib/ranking/ricalcola";

async function main() {
  console.log("Avvio ricostruzione completa del ranking...");

  const risultato = await ricalcolaRankingCompleto();
  console.log("Risultato ricalcolo:", risultato);

  const partita = await prisma.partita.findUnique({
    where: { id: BigInt(601) },
    select: {
      id: true,
      GolCasa: true,
      GolOspite: true,
      Completata: true,
      Fase: true,
    },
  });

  const storico = await prisma.storicoRankingSquadra.findMany({
    where: { partitaId: BigInt(601) },
    include: {
      rankingSquadra: {
        include: {
          squadra: {
            select: { nome: true },
          },
        },
      },
    },
    orderBy: [
      { rankingSquadra: { tipo: "asc" } },
      { rankingSquadra: { squadra: { nome: "asc" } } },
    ],
  });

  console.log("\nPARTITA 601 DOPO IL RICALCOLO");
  console.log(partita);

  console.log("\nSTORICO DELLA PARTITA 601");
  for (const riga of storico) {
    console.log({
      squadra: riga.rankingSquadra.squadra.nome,
      tipo: riga.rankingSquadra.tipo,
      ratingPrima: riga.ratingPrima,
      variazione: riga.variazione,
      ratingDopo: riga.ratingDopo,
      risultato: riga.risultato,
      fase: riga.fase,
    });
  }
}

main()
  .catch((errore) => {
    console.error("ERRORE:", errore);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });