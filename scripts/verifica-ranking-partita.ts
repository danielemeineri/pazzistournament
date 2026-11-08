
import { prisma } from "../lib/prisma";

async function main() {
  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
      SquadraCasaId: { not: null },
      SquadraOspiteId: { not: null },
      GolCasa: { not: null },
      GolOspite: { not: null },
    },
    select: {
      id: true,
      dataPartita: true,
      Fase: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
      squadraCasa: {
        select: { nome: true, tipo: true },
      },
      squadraOspite: {
        select: { nome: true, tipo: true },
      },
    },
    orderBy: [
      { dataPartita: "asc" },
      { id: "asc" },
    ],
  });

  const storico = await prisma.storicoRankingSquadra.findMany({
    select: {
      partitaId: true,
      rankingSquadra: {
        select: {
          squadraId: true,
          tipo: true,
        },
      },
    },
  });

  const partiteConStorico = new Set(
    storico.map((r) => r.partitaId.toString())
  );

  const senzaStorico = partite.filter(
    (p) => !partiteConStorico.has(p.id.toString())
  );

  console.log("\n=== PARTITE VALIDE SENZA STORICO ===");
  console.log(
    JSON.stringify(
      senzaStorico.map((p) => ({
        id: p.id.toString(),
        data: p.dataPartita?.toISOString() ?? null,
        fase: p.Fase,
        casa: p.squadraCasa?.nome ?? null,
        tipoCasa: p.squadraCasa?.tipo ?? null,
        golCasa: p.GolCasa,
        ospite: p.squadraOspite?.nome ?? null,
        tipoOspite: p.squadraOspite?.tipo ?? null,
        golOspite: p.GolOspite,
      })),
      null,
      2
    )
  );

  console.log("\n=== STORICO DELLA PARTITA 615 ===");
  console.log(
    JSON.stringify(
      storico.filter((r) => r.partitaId.toString() === "615"),
      null,
      2
    )
  );

  console.log("\n=== RIEPILOGO ===");
  console.log(
    JSON.stringify(
      {
        partiteValide: partite.length,
        recordStorico: storico.length,
        partiteDistinteNelloStorico: partiteConStorico.size,
        partiteSenzaStorico: senzaStorico.length,
        partita615HaStorico: partiteConStorico.has("615"),
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
