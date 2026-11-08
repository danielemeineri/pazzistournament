import { prisma } from "@/lib/prisma";
import { TipoRanking } from "@prisma/client";

const PARTITA_ID = BigInt(601);

async function main() {
  console.log("\n==============================================================");
  console.log(" DIAGNOSTICA PARTITA 601");
  console.log("==============================================================\n");

  // ==========================================================
  // PARTITA
  // ==========================================================

  const partita = await prisma.partita.findUnique({
    where: {
      id: PARTITA_ID,
    },
    select: {
      id: true,
      TorneoId: true,
      dataPartita: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
      Completata: true,
      Fase: true,
      AiRigori: true,
      RigoriCasa: true,
      RigoriOspite: true,

      squadraCasa: {
        select: {
          id: true,
          nome: true,
          tipo: true,
        },
      },

      squadraOspite: {
        select: {
          id: true,
          nome: true,
          tipo: true,
        },
      },

      torneo: {
        select: {
          id: true,
          nome: true,
          anno: true,
        },
      },

      gol: {
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          minuto: true,
          periodo: true,
          squadraId: true,
          tipo: true,
          calciatoreTorneoId: true,
          recupero: true,
          periodo_temp: true,
        },
      },
    },
  });

  if (!partita) {
    console.log("❌ Partita 601 non trovata.");
    return;
  }

  console.log("----------------------------------------");
  console.log("DATI PARTITA");
  console.log("----------------------------------------");

  console.log(`ID: ${partita.id.toString()}`);
  console.log(`Torneo ID: ${partita.TorneoId}`);
  console.log(`Torneo: ${partita.torneo?.nome ?? "N/D"}`);
  console.log(`Anno: ${partita.torneo?.anno ?? "N/D"}`);

  console.log(
    `Data: ${
      partita.dataPartita
        ? partita.dataPartita.toISOString()
        : "NULL"
    }`
  );

  console.log(
    `Casa: ${
      partita.squadraCasa
        ? `${partita.squadraCasa.nome} (ID ${partita.squadraCasa.id})`
        : "NULL"
    }`
  );

  console.log(
    `Tipo casa: ${partita.squadraCasa?.tipo ?? "NULL"}`
  );

  console.log(
    `Ospite: ${
      partita.squadraOspite
        ? `${partita.squadraOspite.nome} (ID ${partita.squadraOspite.id})`
        : "NULL"
    }`
  );

  console.log(
    `Tipo ospite: ${partita.squadraOspite?.tipo ?? "NULL"}`
  );

  console.log(`GolCasa: ${partita.GolCasa}`);
  console.log(`GolOspite: ${partita.GolOspite}`);
  console.log(`Completata: ${partita.Completata}`);
  console.log(`Fase: ${partita.Fase ?? "NULL"}`);
  console.log(`AiRigori: ${partita.AiRigori}`);
  console.log(`RigoriCasa: ${partita.RigoriCasa}`);
  console.log(`RigoriOspite: ${partita.RigoriOspite}`);

  // ==========================================================
  // GOL
  // ==========================================================

  console.log("\n----------------------------------------");
  console.log("GOL ASSOCIATI ALLA PARTITA");
  console.log("----------------------------------------");

  if (partita.gol.length === 0) {
    console.log("Nessun gol associato.");
  } else {
    for (const gol of partita.gol) {
      console.log(
        [
          `Gol ID: ${gol.id}`,
          `minuto: ${gol.minuto ?? "N/D"}`,
          `periodo: ${gol.periodo ?? "NULL"}`,
          `periodo_temp: ${gol.periodo_temp ?? "NULL"}`,
          `squadraId: ${gol.squadraId ?? "NULL"}`,
          `tipo: ${gol.tipo ?? "NULL"}`,
          `calciatoreTorneoId: ${
            gol.calciatoreTorneoId ?? "NULL"
          }`,
          `recupero: ${gol.recupero ?? "NULL"}`,
        ].join(" | ")
      );
    }
  }

  // ==========================================================
  // STORICO RANKING DELLA PARTITA
  // ==========================================================

  console.log("\n----------------------------------------");
  console.log("STORICO RANKING DELLA PARTITA 601");
  console.log("----------------------------------------");

  const storico =
    await prisma.storicoRankingSquadra.findMany({
      where: {
        partitaId: PARTITA_ID,
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        rankingSquadraId: true,
        partitaId: true,
        ratingPrima: true,
        variazione: true,
        ratingDopo: true,
        fase: true,
        risultato: true,

        rankingSquadra: {
          select: {
            id: true,
            tipo: true,
            rating: true,

            squadra: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },
          },
        },
      },
    });

  if (storico.length === 0) {
    console.log(
      "❌ Nessun record storico trovato per la partita 601."
    );
  } else {
    for (const record of storico) {
      console.log(
        [
          `ID storico: ${record.id}`,
          `Squadra: ${record.rankingSquadra.squadra.nome}`,
          `Ranking: ${record.rankingSquadra.tipo}`,
          `Prima: ${record.ratingPrima}`,
          `Variazione: ${
            record.variazione >= 0 ? "+" : ""
          }${record.variazione}`,
          `Dopo: ${record.ratingDopo}`,
          `Risultato: ${record.risultato}`,
          `Fase: ${record.fase ?? "NULL"}`,
          `Rating attuale: ${record.rankingSquadra.rating}`,
        ].join(" | ")
      );
    }
  }

  // ==========================================================
  // URUGUAY
  // ==========================================================

  console.log("\n----------------------------------------");
  console.log("RICERCA URUGUAY");
  console.log("----------------------------------------");

  const uruguay =
    await prisma.squadra.findFirst({
      where: {
        nome: {
          equals: "Uruguay",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        nome: true,
        tipo: true,

        ranking: {
          orderBy: {
            tipo: "asc",
          },
          select: {
            id: true,
            tipo: true,
            rating: true,
          },
        },
      },
    });

  if (!uruguay) {
    console.log("Uruguay non trovato.");
  } else {
    console.log(
      `Uruguay ID: ${uruguay.id} | Tipo: ${uruguay.tipo}`
    );

    for (const ranking of uruguay.ranking) {
      console.log(
        `  ${ranking.tipo}: ${ranking.rating} punti | Ranking ID ${ranking.id}`
      );
    }
  }

  // ==========================================================
  // INGHILTERRA
  // ==========================================================

  console.log("\n----------------------------------------");
  console.log("RICERCA INGHILTERRA");
  console.log("----------------------------------------");

  const inghilterra =
    await prisma.squadra.findFirst({
      where: {
        nome: {
          equals: "Inghilterra",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        nome: true,
        tipo: true,

        ranking: {
          orderBy: {
            tipo: "asc",
          },
          select: {
            id: true,
            tipo: true,
            rating: true,
          },
        },
      },
    });

  if (!inghilterra) {
    console.log("Inghilterra non trovata.");
  } else {
    console.log(
      `Inghilterra ID: ${inghilterra.id} | Tipo: ${inghilterra.tipo}`
    );

    for (const ranking of inghilterra.ranking) {
      console.log(
        `  ${ranking.tipo}: ${ranking.rating} punti | Ranking ID ${ranking.id}`
      );
    }
  }

  // ==========================================================
  // RIEPILOGO RANKING DELLA PARTITA
  // ==========================================================

  console.log("\n----------------------------------------");
  console.log("CONTROLLO RANKING PARTITA 601");
  console.log("----------------------------------------");

  const rankingPartita =
    storico.reduce(
      (acc, record) => {
        const tipo =
          record.rankingSquadra.tipo;

        if (!acc[tipo]) {
          acc[tipo] = [];
        }

        acc[tipo].push({
          squadra:
            record.rankingSquadra.squadra.nome,
          prima: record.ratingPrima,
          variazione: record.variazione,
          dopo: record.ratingDopo,
          risultato: record.risultato,
        });

        return acc;
      },
      {} as Record<
        string,
        {
          squadra: string;
          prima: number;
          variazione: number;
          dopo: number;
          risultato: string;
        }[]
      >
    );

  for (const tipo of Object.values(TipoRanking)) {
    const records =
      rankingPartita[tipo] ?? [];

    if (records.length === 0) {
      console.log(`${tipo}: nessun record`);
      continue;
    }

    console.log(`\n${tipo}:`);

    for (const record of records) {
      console.log(
        `  ${record.squadra}: ${record.prima} ${
          record.variazione >= 0 ? "+" : ""
        }${record.variazione} → ${
          record.dopo
        } | ${record.risultato}`
      );
    }
  }

  console.log("\n==============================================================");
  console.log(" FINE DIAGNOSTICA");
  console.log("==============================================================\n");
}

main()
  .catch((error) => {
    console.error("\n❌ ERRORE:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });