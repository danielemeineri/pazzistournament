import { prisma } from "@/lib/prisma";
import {
  Prisma,
  TipoRanking,
} from "@prisma/client";

async function main() {
  console.log("");
  console.log("==============================================================");
  console.log(" VERIFICA RISULTATI RANKING");
  console.log("==============================================================");
  console.log("");

  // =========================================================
  // 1. CARICAMENTO RANKING
  // =========================================================

  const ranking =
    await prisma.rankingSquadra.findMany({
      include: {
        squadra: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
        _count: {
          select: {
            storico: true,
          },
        },
      },
      orderBy: [
        {
          tipo: "asc",
        },
        {
          rating: "desc",
        },
      ],
    });

  // =========================================================
  // 2. CONTROLLI GENERALI
  // =========================================================

  const rankingNegativi =
    ranking.filter(
      (record) => record.rating < 0
    );

  const conteggioPerTipo =
    new Map<TipoRanking, number>();

  for (const record of ranking) {
    conteggioPerTipo.set(
      record.tipo,
      (conteggioPerTipo.get(record.tipo) ?? 0) + 1
    );
  }

  console.log("----------------------------------------");
  console.log("RIEPILOGO");
  console.log("----------------------------------------");

  console.log(
    `Record RankingSquadra totali: ${ranking.length}`
  );

  console.log(
    `Ranking NAZIONALE: ${
      conteggioPerTipo.get(
        TipoRanking.NAZIONALE
      ) ?? 0
    }`
  );

  console.log(
    `Ranking CLUB: ${
      conteggioPerTipo.get(
        TipoRanking.CLUB
      ) ?? 0
    }`
  );

  console.log(
    `Ranking MISTO: ${
      conteggioPerTipo.get(
        TipoRanking.MISTO
      ) ?? 0
    }`
  );

  console.log(
    `Rating negativi: ${rankingNegativi.length}`
  );

  console.log("");

  // =========================================================
  // 3. TOP NAZIONALE
  // =========================================================

  stampaTopRanking(
    ranking,
    TipoRanking.NAZIONALE,
    "TOP 20 RANKING NAZIONALE"
  );

  // =========================================================
  // 4. TOP CLUB
  // =========================================================

  stampaTopRanking(
    ranking,
    TipoRanking.CLUB,
    "TOP 20 RANKING CLUB"
  );

  // =========================================================
  // 5. TOP MISTO
  // =========================================================

  stampaTopRanking(
    ranking,
    TipoRanking.MISTO,
    "TOP 20 RANKING MISTO"
  );

  // =========================================================
  // 6. STATISTICHE RATING
  // =========================================================

  for (const tipo of [
    TipoRanking.NAZIONALE,
    TipoRanking.CLUB,
    TipoRanking.MISTO,
  ]) {
    const records =
      ranking.filter(
        (record) =>
          record.tipo === tipo
      );

    if (records.length === 0) {
      continue;
    }

    const ratings =
      records.map(
        (record) => record.rating
      );

    const minimo =
      Math.min(...ratings);

    const massimo =
      Math.max(...ratings);

    const media =
      ratings.reduce(
        (somma, valore) =>
          somma + valore,
        0
      ) / ratings.length;

    console.log("----------------------------------------");
    console.log(
      `STATISTICHE ${tipo}`
    );
    console.log("----------------------------------------");

    console.log(
      `Minimo: ${minimo}`
    );

    console.log(
      `Massimo: ${massimo}`
    );

    console.log(
      `Media: ${media.toFixed(2)}`
    );

    console.log("");
  }

  // =========================================================
  // 7. STORICO
  // =========================================================

  const storico =
    await prisma.storicoRankingSquadra.findMany({
      orderBy: [
        {
          creatoIl: "desc",
        },
      ],
      take: 20,
      include: {
        rankingSquadra: {
          include: {
            squadra: {
              select: {
                nome: true,
                tipo: true,
              },
            },
          },
        },
        partita: {
          select: {
            id: true,
            GolCasa: true,
            GolOspite: true,
            squadraCasa: {
              select: {
                nome: true,
              },
            },
            squadraOspite: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    });

  console.log("----------------------------------------");
  console.log("ULTIME 20 VARIAZIONI STORICHE");
  console.log("----------------------------------------");

  for (const record of storico) {
    const segno =
      record.variazione >= 0
        ? "+"
        : "";

    console.log(
      `${record.rankingSquadra.squadra.nome} | ` +
        `${record.rankingSquadra.tipo} | ` +
        `Partita ${record.partita.id.toString()} | ` +
        `${record.partita.squadraCasa?.nome ?? "?"} ` +
        `${record.partita.GolCasa ?? "?"}-` +
        `${record.partita.GolOspite ?? "?"} ` +
        `${record.partita.squadraOspite?.nome ?? "?"} | ` +
        `${record.ratingPrima} ` +
        `${segno}${record.variazione} ` +
        `→ ${record.ratingDopo} | ` +
        `${record.risultato} | ` +
        `${record.fase ?? "N/D"}`
    );
  }

  console.log("");

  // =========================================================
  // 8. CONTROLLO STORICO
  // =========================================================

  const totaleStorico =
    await prisma.storicoRankingSquadra.count();

  const storicoNegativo =
    await prisma.storicoRankingSquadra.count({
      where: {
        variazione: {
          lt: 0,
        },
      },
    });

  const storicoPositivo =
    await prisma.storicoRankingSquadra.count({
      where: {
        variazione: {
          gt: 0,
        },
      },
    });

  const storicoNullo =
    await prisma.storicoRankingSquadra.count({
      where: {
        variazione: 0,
      },
    });

  console.log("----------------------------------------");
  console.log("CONTROLLO VARIAZIONI");
  console.log("----------------------------------------");

  console.log(
    `Storico totale: ${totaleStorico}`
  );

  console.log(
    `Variazioni positive: ${storicoPositivo}`
  );

  console.log(
    `Variazioni negative: ${storicoNegativo}`
  );

  console.log(
    `Variazioni nulle: ${storicoNullo}`
  );

  console.log("");

  console.log("==============================================================");
  console.log(" VERIFICA COMPLETATA");
  console.log("==============================================================");
  console.log("");

  console.log(
    "Questo script è SOLO in lettura: non modifica il database."
  );
}

// =========================================================
// TIPO DEI RECORD DEL RANKING
// =========================================================

type RankingConDettagli =
  Prisma.RankingSquadraGetPayload<{
    include: {
      squadra: {
        select: {
          id: true;
          nome: true;
          tipo: true;
        };
      };
      _count: {
        select: {
          storico: true;
        };
      };
    };
  }>;

// =========================================================
// STAMPA TOP RANKING
// =========================================================

function stampaTopRanking(
  ranking: RankingConDettagli[],
  tipo: TipoRanking,
  titolo: string
) {
  const records = ranking
    .filter(
      (record) =>
        record.tipo === tipo
    )
    .sort(
      (a, b) =>
        b.rating - a.rating
    )
    .slice(0, 20);

  console.log("----------------------------------------");
  console.log(titolo);
  console.log("----------------------------------------");

  if (records.length === 0) {
    console.log("Nessuna squadra.");
    console.log("");
    return;
  }

  records.forEach(
    (record, index) => {
      console.log(
        `${String(index + 1).padStart(2, " ")}. ` +
          `${record.squadra.nome} | ` +
          `${record.rating} punti | ` +
          `${record._count.storico} variazioni`
      );
    }
  );

  console.log("");
}

main()
  .catch((errore) => {
    console.error("");
    console.error(
      "ERRORE DURANTE LA VERIFICA:"
    );
    console.error(errore);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });