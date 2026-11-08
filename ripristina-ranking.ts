
import { prisma } from "./lib/prisma";
import { ricalcolaRankingCompleto } from "./lib/ranking/ricalcola";

async function main() {
  console.log("Avvio ricostruzione completa del ranking...");

  const risultato = await ricalcolaRankingCompleto();

  console.log("\n=== RISULTATO RICALCOLO ===");
  console.log(JSON.stringify(risultato, null, 2));

  const storico615 =
    await prisma.storicoRankingSquadra.findMany({
      where: {
        partitaId: BigInt(615),
      },
      select: {
        partitaId: true,
        ratingPrima: true,
        variazione: true,
        ratingDopo: true,
        risultato: true,
        rankingSquadra: {
          select: {
            squadraId: true,
            tipo: true,
            squadra: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

  const partiteValide = await prisma.partita.count({
    where: {
      Completata: true,
      SquadraCasaId: { not: null },
      SquadraOspiteId: { not: null },
      GolCasa: { not: null },
      GolOspite: { not: null },
    },
  });

  const recordStorico =
    await prisma.storicoRankingSquadra.count();

  console.log("\n=== STORICO PARTITA 615 ===");
  console.log(JSON.stringify(
    storico615.map((r) => ({
      partitaId: r.partitaId.toString(),
      squadra: r.rankingSquadra.squadra.nome,
      squadraId: r.rankingSquadra.squadraId,
      tipoRanking: r.rankingSquadra.tipo,
      ratingPrima: r.ratingPrima,
      variazione: r.variazione,
      ratingDopo: r.ratingDopo,
      risultato: r.risultato,
    })),
    null,
    2
  ));

  console.log("\n=== VERIFICA FINALE ===");
  console.log(JSON.stringify({
    partiteValide,
    recordStorico,
    recordAttesiPartita615: 4,
    recordEffettiviPartita615: storico615.length,
  }, null, 2));
}

main()
  .catch((errore) => {
    console.error("\nERRORE DURANTE IL RICALCOLO:");
    console.error(errore);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
