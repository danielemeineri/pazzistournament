import { prisma } from "@/lib/prisma";

async function main() {
  console.log("");
  console.log("================================================");
  console.log(" VERIFICA INTEGRITÀ RANKING");
  console.log("================================================");
  console.log("");

  let errori = 0;

  // ========================================================
  // 1. RANKING ATTUALI
  // ========================================================

  const ranking =
    await prisma.rankingSquadra.findMany({
      select: {
        id: true,
        squadraId: true,
        tipo: true,
        rating: true,
        squadra: {
          select: {
            nome: true,
            tipo: true,
          },
        },
      },
    });

  console.log(
    `RankingSquadra: ${ranking.length}`
  );

  // ========================================================
  // 2. RATING NEGATIVI
  // ========================================================

  const negativi =
    ranking.filter(
      (r) => r.rating < 0
    );

  console.log(
    `Rating negativi: ${negativi.length}`
  );

  if (negativi.length > 0) {
    errori += negativi.length;

    for (const r of negativi) {
      console.log(
        `ERRORE: ${r.squadra.nome} ${r.tipo} = ${r.rating}`
      );
    }
  }

  // ========================================================
  // 3. STORICO
  // ========================================================

  const storico =
    await prisma.storicoRankingSquadra.findMany({
      select: {
        id: true,
        rankingSquadraId: true,
        partitaId: true,
        ratingPrima: true,
        variazione: true,
        ratingDopo: true,
        rankingSquadra: {
          select: {
            rating: true,
            squadra: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

  console.log(
    `StoricoRankingSquadra: ${storico.length}`
  );

  // ========================================================
  // 4. CONTROLLO MATEMATICO
  // ========================================================

  let formuleErrate = 0;

  for (const r of storico) {
    const risultato =
      r.ratingPrima +
      r.variazione;

    if (
      risultato !==
      r.ratingDopo
    ) {
      formuleErrate++;

      console.log(
        `ERRORE FORMULA: ` +
        `${r.rankingSquadra.squadra.nome} | ` +
        `partita ${r.partitaId.toString()} | ` +
        `${r.ratingPrima} + ${r.variazione} != ${r.ratingDopo}`
      );
    }
  }

  console.log(
    `Formule rating errate: ${formuleErrate}`
  );

  errori += formuleErrate;

  // ========================================================
  // 5. RATING ATTUALE VS ULTIMO STORICO
  // ========================================================

  const storicoPerRanking =
    new Map<number, typeof storico>();

  for (const r of storico) {
    const lista =
      storicoPerRanking.get(
        r.rankingSquadraId
      ) ?? [];

    lista.push(r);

    storicoPerRanking.set(
      r.rankingSquadraId,
      lista
    );
  }

  let confronti = 0;
  let incoerenti = 0;

  for (const r of ranking) {
    const lista =
      storicoPerRanking.get(
        r.id
      ) ?? [];

    // Se non ha mai giocato,
    // il rating deve essere 0.
    if (lista.length === 0) {
      if (r.rating !== 0) {
        incoerenti++;

        console.log(
          `ERRORE: ${r.squadra.nome} | ` +
          `${r.tipo} | ` +
          `rating=${r.rating} ma nessuno storico`
        );
      }

      continue;
    }

    confronti++;

    const ultimo =
      lista[lista.length - 1];

    if (
      ultimo.ratingDopo !==
      r.rating
    ) {
      incoerenti++;

      console.log(
        `ERRORE RATING FINALE: ` +
        `${r.squadra.nome} | ` +
        `${r.tipo} | ` +
        `attuale=${r.rating} | ` +
        `ultimo storico=${ultimo.ratingDopo}`
      );
    }
  }

  console.log(
    `Ranking con storico confrontati: ${confronti}`
  );

  console.log(
    `Rating finali incoerenti: ${incoerenti}`
  );

  errori += incoerenti;

  // ========================================================
  // 6. DUPLICATI STORICO
  // ========================================================

  const combinazioni =
    new Map<string, number>();

  for (const r of storico) {
    const chiave =
      `${r.rankingSquadraId}:${r.partitaId.toString()}`;

    combinazioni.set(
      chiave,
      (combinazioni.get(chiave) ?? 0) + 1
    );
  }

  let duplicati = 0;

  for (const [
    chiave,
    conteggio,
  ] of combinazioni) {
    if (conteggio > 1) {
      duplicati++;

      console.log(
        `ERRORE DUPLICATO: ${chiave} x${conteggio}`
      );
    }
  }

  console.log(
    `Duplicati ranking/partita: ${duplicati}`
  );

  errori += duplicati;

  // ========================================================
  // 7. RISULTATO
  // ========================================================

  console.log("");
  console.log("================================================");
  console.log(" RISULTATO");
  console.log("================================================");
  console.log("");

  if (errori === 0) {
    console.log(
      "✅ RANKING INTEGRO"
    );
    console.log("");
    console.log(
      "Nessuna anomalia trovata."
    );
    console.log(
      "Il rating attuale coincide con lo storico."
    );
    console.log(
      "Le formule dello storico sono corrette."
    );
    console.log(
      "Non esistono rating negativi."
    );
    console.log(
      "Non esistono duplicati."
    );
  } else {
    console.log(
      `❌ TROVATI ${errori} PROBLEMI`
    );
  }

  console.log("");
  console.log(
    "Nessuna modifica è stata effettuata al database."
  );
  console.log("");
}

main()
  .catch((errore) => {
    console.error("");
    console.error(
      "ERRORE:",
      errore
    );
    console.error("");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });