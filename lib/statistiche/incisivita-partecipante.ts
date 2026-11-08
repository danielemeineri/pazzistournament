
import { prisma } from "@/lib/prisma";
import {
  determinaFasciaIncisivita,
  nuoveFasceIncisivita,
  type FasciaIncisivita,
} from "@/lib/statistiche/incisivita";

export type IncisivitaPartecipante = {
  partiteAnalizzate: number;
  golFatti: number;
  golSubiti: number;
  fasce: (FasciaIncisivita & {
    percentualeGolFatti: number;
    percentualeGolSubiti: number;
  })[];
};

function percentuale(
  valore: number,
  totale: number
): number {
  if (totale === 0) return 0;

  return Number(((valore / totale) * 100).toFixed(1));
}

export async function getIncisivitaPartecipante(
  partecipanteId: number
): Promise<IncisivitaPartecipante> {
  const partecipazioni = await prisma.partecipazione.findMany({
    where: {
      partecipanteId,
    },
    select: {
      torneoId: true,
      squadraId: true,
    },
  });

  const torneoIds = [
    ...new Set(partecipazioni.map((p) => p.torneoId)),
  ];

  const squadraIds = [
    ...new Set(partecipazioni.map((p) => p.squadraId)),
  ];

  const condizioniPartite: Record<string, unknown>[] = [
    {
      sostitutoCasaId: partecipanteId,
    },
    {
      sostitutoOspiteId: partecipanteId,
    },
  ];

  if (torneoIds.length > 0 && squadraIds.length > 0) {
    condizioniPartite.push({
      AND: [
        {
          TorneoId: {
            in: torneoIds,
          },
        },
        {
          OR: [
            {
              SquadraCasaId: {
                in: squadraIds,
              },
            },
            {
              SquadraOspiteId: {
                in: squadraIds,
              },
            },
          ],
        },
      ],
    });
  }

  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
      GolCasa: {
        not: null,
      },
      GolOspite: {
        not: null,
      },
      OR: condizioniPartite,
    },
    select: {
      id: true,
      TorneoId: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      sostitutoCasaId: true,
      sostitutoOspiteId: true,
      gol: {
        select: {
          minuto: true,
          recupero: true,
          periodo: true,
          tipo: true,
          squadraId: true,
        },
      },
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

  const fasce = nuoveFasceIncisivita();

  const fascePerChiave = new Map(
    fasce.map((fascia) => [fascia.chiave, fascia])
  );

  const partiteConSquadre = partite.filter(
    (partita) =>
      partita.SquadraCasaId !== null &&
      partita.SquadraOspiteId !== null
  );

  const torneoIdsPartite = [
    ...new Set(
      partiteConSquadre.map((partita) => partita.TorneoId)
    ),
  ];

  const partecipazioniTornei =
    torneoIdsPartite.length > 0
      ? await prisma.partecipazione.findMany({
          where: {
            torneoId: {
              in: torneoIdsPartite,
            },
            partecipanteId: {
              not: null,
            },
          },
          select: {
            torneoId: true,
            squadraId: true,
            partecipanteId: true,
          },
        })
      : [];

  const partecipantePerSquadraETorneo = new Map<
    string,
    number
  >();

  for (const partecipazione of partecipazioniTornei) {
    if (partecipazione.partecipanteId === null) {
      continue;
    }

    partecipantePerSquadraETorneo.set(
      `${partecipazione.torneoId}:${partecipazione.squadraId}`,
      partecipazione.partecipanteId
    );
  }

  let partiteAnalizzate = 0;
  let golFatti = 0;
  let golSubiti = 0;

  for (const partita of partiteConSquadre) {
    const squadraCasaId = partita.SquadraCasaId!;
    const squadraOspiteId = partita.SquadraOspiteId!;

    const partecipanteCasa =
      partita.sostitutoCasaId ??
      partecipantePerSquadraETorneo.get(
        `${partita.TorneoId}:${squadraCasaId}`
      ) ??
      null;

    const partecipanteOspite =
      partita.sostitutoOspiteId ??
      partecipantePerSquadraETorneo.get(
        `${partita.TorneoId}:${squadraOspiteId}`
      ) ??
      null;

    const giocaInCasa =
      partecipanteCasa === partecipanteId;

    const giocaInTrasferta =
      partecipanteOspite === partecipanteId;

    // Una partita conta solo se il partecipante è effettivamente
    // associato a una delle due squadre per quella partita.
    if (giocaInCasa === giocaInTrasferta) {
      continue;
    }

    partiteAnalizzate += 1;

    for (const evento of partita.gol) {
      const chiaveFascia = determinaFasciaIncisivita({
        minuto: evento.minuto,
        recupero: evento.recupero,
        periodo: evento.periodo,
      });

      if (!chiaveFascia) {
        continue;
      }

      let squadraCheSegna = evento.squadraId;

      // Il campo squadraId identifica la squadra del calciatore
      // che ha commesso l'autogol: la rete va assegnata all'avversario.
      if (evento.tipo === "AUTOGOL") {
        if (evento.squadraId === squadraCasaId) {
          squadraCheSegna = squadraOspiteId;
        } else if (evento.squadraId === squadraOspiteId) {
          squadraCheSegna = squadraCasaId;
        } else {
          continue;
        }
      }

      if (
        squadraCheSegna !== squadraCasaId &&
        squadraCheSegna !== squadraOspiteId
      ) {
        continue;
      }

      const fascia = fascePerChiave.get(chiaveFascia);

      if (!fascia) {
        continue;
      }

      const squadraPartecipanteId = giocaInCasa
        ? squadraCasaId
        : squadraOspiteId;

      if (squadraCheSegna === squadraPartecipanteId) {
        fascia.golFatti += 1;
        golFatti += 1;
      } else {
        fascia.golSubiti += 1;
        golSubiti += 1;
      }
    }
  }

  return {
    partiteAnalizzate,
    golFatti,
    golSubiti,
    fasce: fasce.map((fascia) => ({
      ...fascia,
      percentualeGolFatti: percentuale(
        fascia.golFatti,
        golFatti
      ),
      percentualeGolSubiti: percentuale(
        fascia.golSubiti,
        golSubiti
      ),
    })),
  };
}
