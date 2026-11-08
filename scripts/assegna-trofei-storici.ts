
import { prisma } from "../lib/prisma";

type Assegnazione = {
  torneoId: number;
  torneoNome: string;
  squadraNome: string;
  allenatoreNome: string;
  allenatoreId: number;
};

async function main() {
  console.log("========================================");
  console.log(" PAZZITOURNAMENT - ASSEGNAZIONE TROFEI");
  console.log("========================================");

  const trofei = await prisma.trofeo.findMany({
    where: {
      tipo: "VINCITORE_TORNEO",
      partecipanteVincitoreId: null,
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
    },
  });

  const assegnazioni: Assegnazione[] = [];

  for (const trofeo of trofei) {
    if (!trofeo.squadraVincitriceId) {
      throw new Error(
        `Trofeo ${trofeo.id}: squadra vincitrice mancante`
      );
    }

    const partecipazione = trofeo.torneo.partecipazioni.find(
      (elemento) =>
        elemento.squadraId === trofeo.squadraVincitriceId
    );

    if (
      !partecipazione ||
      !partecipazione.partecipanteId ||
      !partecipazione.partecipante
    ) {
      throw new Error(
        `Trofeo ${trofeo.id}: allenatore titolare non trovato`
      );
    }

    assegnazioni.push({
      torneoId: trofeo.torneoId,
      torneoNome: trofeo.torneo.nome,
      squadraNome:
        trofeo.squadraVincitrice?.nome ?? "Sconosciuta",
      allenatoreNome: partecipazione.partecipante.nome,
      allenatoreId: partecipazione.partecipanteId,
    });
  }

  console.log("");
  console.log("Assegnazioni da effettuare:");
  console.log("");

  for (const assegnazione of assegnazioni) {
    console.log(
      `${assegnazione.torneoNome} | ` +
      `${assegnazione.squadraNome} | ` +
      `${assegnazione.allenatoreNome}`
    );
  }

  console.log("");
  console.log(`Totale: ${assegnazioni.length}`);

  if (assegnazioni.length === 0) {
    console.log("Nessun titolo da aggiornare.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const assegnazione of assegnazioni) {
      const risultato = await tx.trofeo.updateMany({
        where: {
          torneoId: assegnazione.torneoId,
          tipo: "VINCITORE_TORNEO",
          partecipanteVincitoreId: null,
        },
        data: {
          partecipanteVincitoreId:
            assegnazione.allenatoreId,
        },
      });

      if (risultato.count !== 1) {
        throw new Error(
          `Aggiornamento non riuscito per ${assegnazione.torneoNome}`
        );
      }
    }
  });

  console.log("");
  console.log("========================================");
  console.log(" ASSEGNAZIONE COMPLETATA");
  console.log("========================================");
  console.log(`${assegnazioni.length} titoli aggiornati.`);
}

main()
  .catch((errore) => {
    console.error("ERRORE:", errore);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
