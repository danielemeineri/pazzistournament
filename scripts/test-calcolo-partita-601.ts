import { TipoRanking } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  calcolaRankingPartita,
  getTipiRankingPartita,
} from "@/lib/ranking/calcola";

const PARTITA_ID = BigInt(601);

async function main() {
  console.log("");
  console.log("==============================================================");
  console.log(" TEST CICLO RICALCOLO PARTITA 601");
  console.log("==============================================================");
  console.log("");

  const partita = await prisma.partita.findUnique({
    where: {
      id: PARTITA_ID,
    },
    select: {
      id: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
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

      gol: {
        select: {
          id: true,
          periodo: true,
        },
      },
    },
  });

  if (!partita) {
    throw new Error("Partita 601 non trovata.");
  }

  console.log("----------------------------------------");
  console.log("DATI LETTI DA PRISMA");
  console.log("----------------------------------------");

  console.log("ID:", partita.id.toString());
  console.log(
    "Casa:",
    partita.squadraCasa?.nome,
    "| ID:",
    partita.SquadraCasaId,
    "| Tipo:",
    partita.squadraCasa?.tipo
  );

  console.log(
    "Ospite:",
    partita.squadraOspite?.nome,
    "| ID:",
    partita.SquadraOspiteId,
    "| Tipo:",
    partita.squadraOspite?.tipo
  );

  console.log("GolCasa:", partita.GolCasa);
  console.log("GolOspite:", partita.GolOspite);
  console.log("Fase:", partita.Fase);
  console.log("AiRigori:", partita.AiRigori);
  console.log("RigoriCasa:", partita.RigoriCasa);
  console.log("RigoriOspite:", partita.RigoriOspite);

  console.log("");
  console.log("Gol associati:");

  for (const gol of partita.gol) {
    console.log(
      `  Gol ${gol.id} | periodo: ${gol.periodo}`
    );
  }

  if (
    partita.SquadraCasaId === null ||
    partita.SquadraOspiteId === null ||
    partita.GolCasa === null ||
    partita.GolOspite === null ||
    !partita.squadraCasa ||
    !partita.squadraOspite
  ) {
    throw new Error(
      "Dati insufficienti per calcolare il ranking."
    );
  }

  const tipi = getTipiRankingPartita(
    partita.squadraCasa.tipo,
    partita.squadraOspite.tipo
  );

  console.log("");
  console.log("----------------------------------------");
  console.log("TIPI RANKING");
  console.log("----------------------------------------");

  console.log(tipi);

  const presenzaSupplementari =
    partita.gol.some(
      (gol) =>
        gol.periodo === "SUPPLEMENTARI"
    );

  console.log(
    "Presenza supplementari:",
    presenzaSupplementari
  );

  console.log("");
  console.log("----------------------------------------");
  console.log("CALCOLO ESATTO DEL RICALCOLO");
  console.log("----------------------------------------");

  for (const tipo of tipi) {
    console.log("");
    console.log("RANKING:", tipo);

    const calcolo = calcolaRankingPartita({
      tipo,

      squadraCasaId:
        partita.SquadraCasaId,

      squadraOspiteId:
        partita.SquadraOspiteId,

      tipoSquadraCasa:
        partita.squadraCasa.tipo,

      tipoSquadraOspite:
        partita.squadraOspite.tipo,

      /*
       * ATTENZIONE:
       * usiamo volutamente gli stessi rating
       * che risultano attualmente nel database.
       */
      ratingCasa: 231,
      ratingOspite: 226,

      golCasa: partita.GolCasa,
      golOspite: partita.GolOspite,

      aiRigori: partita.AiRigori,
      rigoriCasa: partita.RigoriCasa,
      rigoriOspite: partita.RigoriOspite,

      fase: partita.Fase,

      presenzaSupplementari,
    });

    if (!calcolo) {
      console.log("CALCOLO = NULL");
      continue;
    }

    console.log(
      "Casa:",
      calcolo.ratingCasaPrima,
      "+",
      calcolo.variazioneCasa,
      "→",
      calcolo.ratingCasaDopo,
      "|",
      calcolo.esitoCasa
    );

    console.log(
      "Ospite:",
      calcolo.ratingOspitePrima,
      "+",
      calcolo.variazioneOspite,
      "→",
      calcolo.ratingOspiteDopo,
      "|",
      calcolo.esitoOspite
    );

    console.log(
      "Modalità:",
      calcolo.modalita
    );

    console.log(
      "Fase:",
      calcolo.fase
    );
  }

  console.log("");
  console.log("==============================================================");
  console.log(" FINE TEST");
  console.log("==============================================================");
}

main()
  .catch((error) => {
    console.error("");
    console.error("ERRORE:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });