import { prisma } from "@/lib/prisma";
import { getMoltiplicatoreFase } from "@/lib/ranking/formula";

async function main() {
  console.log("========================================");
  console.log(" VERIFICA DATI RANKING");
  console.log("========================================");
  console.log("");

  // =========================================================
  // PARTITE COMPLETATE
  // =========================================================

  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
    },
    select: {
      id: true,
      dataPartita: true,
      Fase: true,
      AiRigori: true,
      RigoriCasa: true,
      RigoriOspite: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
    },
    orderBy: [
      {
        dataPartita: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  console.log(`PARTITE COMPLETATE: ${partite.length}`);
  console.log("");

  // =========================================================
  // FASI
  // =========================================================

  const conteggioFasi = new Map<string, number>();

  for (const partita of partite) {
    const fase = partita.Fase?.trim() || "(NULL)";

    conteggioFasi.set(
      fase,
      (conteggioFasi.get(fase) ?? 0) + 1
    );
  }

  console.log("----------------------------------------");
  console.log("FASI TROVATE");
  console.log("----------------------------------------");

  for (const [fase, conteggio] of conteggioFasi) {
    const moltiplicatore = getMoltiplicatoreFase(
      fase === "(NULL)" ? null : fase
    );

    console.log(
      `"${fase}" -> ${conteggio} partite -> moltiplicatore ${moltiplicatore}`
    );
  }

  console.log("");

  // =========================================================
  // DATE MANCANTI
  // =========================================================

  const partiteSenzaData = partite.filter(
    (partita) => partita.dataPartita === null
  );

  console.log("----------------------------------------");
  console.log("DATE");
  console.log("----------------------------------------");

  console.log(
    `Partite completate senza data: ${partiteSenzaData.length}`
  );

  if (partiteSenzaData.length > 0) {
    console.log("");
    console.log("ID partite senza data:");

    for (const partita of partiteSenzaData) {
      console.log(`- ${partita.id.toString()}`);
    }
  }

  console.log("");

  // =========================================================
  // RIGORI
  // =========================================================

  const partiteConRigori = partite.filter(
    (partita) => partita.AiRigori === true
  );

  console.log("----------------------------------------");
  console.log("RIGORI");
  console.log("----------------------------------------");

  console.log(
    `Partite terminate ai rigori: ${partiteConRigori.length}`
  );

  if (partiteConRigori.length > 0) {
    console.log("");

    for (const partita of partiteConRigori) {
      console.log(
        `Partita ${partita.id.toString()}: ` +
          `${partita.GolCasa ?? "?"}-${partita.GolOspite ?? "?"} ` +
          `(${partita.RigoriCasa ?? "?"}-${partita.RigoriOspite ?? "?"} rigori)`
      );
    }
  }

  console.log("");

  // =========================================================
  // GOL / PERIODI
  // =========================================================

  const gol = await prisma.gol.findMany({
    select: {
      id: true,
      periodo: true,
      partitaId: true,
    },
  });

  const conteggioPeriodi = new Map<string, number>();

  for (const record of gol) {
    const periodo = record.periodo || "(NULL)";

    conteggioPeriodi.set(
      periodo,
      (conteggioPeriodi.get(periodo) ?? 0) + 1
    );
  }

  console.log("----------------------------------------");
  console.log("PERIODI DEI GOL");
  console.log("----------------------------------------");

  console.log(`Gol totali nel database: ${gol.length}`);
  console.log("");

  for (const [periodo, conteggio] of conteggioPeriodi) {
    console.log(`"${periodo}" -> ${conteggio} gol`);
  }

  console.log("");

  // =========================================================
  // GOL NEI SUPPLEMENTARI
  // =========================================================

  const golSupplementari = gol.filter(
    (record) => record.periodo === "SUPPLEMENTARI"
  );

  console.log("----------------------------------------");
  console.log("SUPPLEMENTARI");
  console.log("----------------------------------------");

  console.log(
    `Gol registrati nei supplementari: ${golSupplementari.length}`
  );

  if (golSupplementari.length > 0) {
    const partiteSupplementari = new Set(
      golSupplementari.map((gol) =>
        gol.partitaId.toString()
      )
    );

    console.log(
      `Partite con almeno un gol nei supplementari: ${partiteSupplementari.size}`
    );

    console.log("");

    for (const partitaId of partiteSupplementari) {
      console.log(`- Partita ${partitaId}`);
    }
  }

  console.log("");

  // =========================================================
  // TIPI DI SQUADRA
  // =========================================================

  const squadre = await prisma.squadra.findMany({
    select: {
      id: true,
      nome: true,
      tipo: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const conteggioTipiSquadra = new Map<string, number>();

  for (const squadra of squadre) {
    conteggioTipiSquadra.set(
      squadra.tipo,
      (conteggioTipiSquadra.get(squadra.tipo) ?? 0) + 1
    );
  }

  console.log("----------------------------------------");
  console.log("TIPI DI SQUADRA");
  console.log("----------------------------------------");

  for (const [tipo, conteggio] of conteggioTipiSquadra) {
    console.log(`"${tipo}" -> ${conteggio} squadre`);
  }

  console.log("");

  // =========================================================
  // RIEPILOGO
  // =========================================================

  console.log("========================================");
  console.log(" VERIFICA COMPLETATA");
  console.log("========================================");
  console.log("");
  console.log(
    "Questo script è SOLO in lettura: non modifica alcun dato."
  );
}

main()
  .catch((errore) => {
    console.error("");
    console.error("ERRORE DURANTE LA VERIFICA:");
    console.error(errore);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });