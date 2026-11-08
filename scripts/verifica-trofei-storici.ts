
import { prisma } from "../lib/prisma";

async function main() {
  console.log("========================================");
  console.log(" PAZZITOURNAMENT - VERIFICA TROFEI");
  console.log("========================================");
  console.log("");

  const trofei = await prisma.trofeo.findMany({
    where: {
      tipo: "VINCITORE_TORNEO",
    },
    include: {
      torneo: {
        include: {
          partecipazioni: {
            include: {
              partecipante: true,
            },
          },
        },
      },
      squadraVincitrice: true,
      partecipanteVincitore: true,
    },
    orderBy: {
      torneoId: "asc",
    },
  });

  let giaAssegnati = 0;
  let recuperabili = 0;
  let daVerificare = 0;

  for (const trofeo of trofei) {
    const torneo = trofeo.torneo;
    const squadra = trofeo.squadraVincitrice;

    console.log("----------------------------------------");
    console.log(`TORNEO: ${torneo.nome} (${torneo.anno})`);
    console.log(`SQUADRA: ${squadra?.nome ?? "Non disponibile"}`);

    if (trofeo.partecipanteVincitoreId !== null) {
      giaAssegnati++;

      console.log(
        `ALLENATORE ASSEGNATO: ${
          trofeo.partecipanteVincitore?.nome ?? "ID non risolto"
        }`
      );

      continue;
    }

    if (!trofeo.squadraVincitriceId) {
      daVerificare++;

      console.log("STATO: squadra vincitrice mancante");
      continue;
    }

    const partecipazione = torneo.partecipazioni.find(
      (elemento) =>
        elemento.squadraId === trofeo.squadraVincitriceId
    );

    if (
      !partecipazione ||
      partecipazione.partecipanteId === null ||
      !partecipazione.partecipante
    ) {
      daVerificare++;

      console.log("STATO: verifica manuale necessaria");
      console.log("MOTIVO: allenatore titolare non trovato");
      continue;
    }

    recuperabili++;

    console.log("STATO: potenzialmente recuperabile");
    console.log(
      `ALLENATORE TITOLARE: ${partecipazione.partecipante.nome}`
    );
    console.log(
      `ID ALLENATORE: ${partecipazione.partecipanteId}`
    );
  }

  console.log("");
  console.log("========================================");
  console.log(" RIEPILOGO");
  console.log("========================================");
  console.log(`Trofei totali: ${trofei.length}`);
  console.log(`Già assegnati: ${giaAssegnati}`);
  console.log(`Potenzialmente recuperabili: ${recuperabili}`);
  console.log(`Da verificare manualmente: ${daVerificare}`);
  console.log("");
  console.log("NESSUNA MODIFICA EFFETTUATA AL DATABASE");
}

main()
  .catch((errore) => {
    console.error("ERRORE:", errore);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
