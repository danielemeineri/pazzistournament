
import { prisma } from "@/lib/prisma";

type EventoGol = {
  id: number;
  squadraId: number;
  minuto: number;
  recupero: number | null;
  periodo: string;
  tipo: string;
};

type EsitoRimonta = "CASA" | "OSPITE" | null;

export type StatisticheRimontePartecipante = {
  rimonteVinte: number;
  rimonteVinteMinutiFinali: number;
};

function ordinePeriodo(periodo: string): number {
  switch (periodo) {
    case "PT":
    case "PRIMO_TEMPO":
      return 1;
    case "ST":
    case "SECONDO_TEMPO":
      return 2;
    case "SUPPLEMENTARI":
      return 3;
    default:
      return 4;
  }
}

function ordinaEventiGol(gol: EventoGol[]): EventoGol[] {
  return [...gol].sort(
    (a, b) =>
      ordinePeriodo(a.periodo) - ordinePeriodo(b.periodo) ||
      a.minuto - b.minuto ||
      (a.recupero ?? 0) - (b.recupero ?? 0) ||
      a.id - b.id
  );
}

function squadraCheHaSegnato(
  evento: EventoGol,
  squadraCasaId: number,
  squadraOspiteId: number
): number | null {
  if (evento.tipo === "AUTOGOL") {
    if (evento.squadraId === squadraCasaId) {
      return squadraOspiteId;
    }

    if (evento.squadraId === squadraOspiteId) {
      return squadraCasaId;
    }

    return null;
  }

  if (
    evento.squadraId !== squadraCasaId &&
    evento.squadraId !== squadraOspiteId
  ) {
    return null;
  }

  return evento.squadraId;
}

function eventiGolCoerenti(
  gol: EventoGol[],
  squadraCasaId: number,
  squadraOspiteId: number,
  golCasaFinali: number,
  golOspiteFinali: number
): EventoGol[] | null {
  if (
    golCasaFinali < 0 ||
    golOspiteFinali < 0 ||
    gol.length !== golCasaFinali + golOspiteFinali
  ) {
    return null;
  }

  const eventi = ordinaEventiGol(gol);

  let risultatoCasa = 0;
  let risultatoOspite = 0;

  for (const evento of eventi) {
    const squadra = squadraCheHaSegnato(
      evento,
      squadraCasaId,
      squadraOspiteId
    );

    if (squadra === null) return null;

    if (squadra === squadraCasaId) {
      risultatoCasa++;
    } else {
      risultatoOspite++;
    }
  }

  if (
    risultatoCasa !== golCasaFinali ||
    risultatoOspite !== golOspiteFinali
  ) {
    return null;
  }

  return eventi;
}

function eGolNeiMinutiFinali(evento: EventoGol): boolean {
  return (
    (evento.periodo === "ST" ||
      evento.periodo === "SECONDO_TEMPO") &&
    evento.minuto >= 76 &&
    evento.minuto <= 90
  );
}

function verificaRimontaVincente(
  gol: EventoGol[],
  squadraCasaId: number,
  squadraOspiteId: number,
  golCasaFinali: number,
  golOspiteFinali: number
): EsitoRimonta {
  if (golCasaFinali === golOspiteFinali) return null;

  const eventi = eventiGolCoerenti(
    gol,
    squadraCasaId,
    squadraOspiteId,
    golCasaFinali,
    golOspiteFinali
  );

  if (!eventi) return null;

  let risultatoCasa = 0;
  let risultatoOspite = 0;

  let casaEraInSvantaggio = false;
  let ospiteEraInSvantaggio = false;

  for (const evento of eventi) {
    const squadra = squadraCheHaSegnato(
      evento,
      squadraCasaId,
      squadraOspiteId
    );

    if (squadra === squadraCasaId) {
      risultatoCasa++;
    } else if (squadra === squadraOspiteId) {
      risultatoOspite++;
    } else {
      return null;
    }

    if (risultatoCasa < risultatoOspite) {
      casaEraInSvantaggio = true;
    }

    if (risultatoOspite < risultatoCasa) {
      ospiteEraInSvantaggio = true;
    }
  }

  if (golCasaFinali > golOspiteFinali && casaEraInSvantaggio) {
    return "CASA";
  }

  if (golOspiteFinali > golCasaFinali && ospiteEraInSvantaggio) {
    return "OSPITE";
  }

  return null;
}

function verificaRimontaVincenteNeiMinutiFinali(
  gol: EventoGol[],
  squadraCasaId: number,
  squadraOspiteId: number,
  golCasaFinali: number,
  golOspiteFinali: number
): EsitoRimonta {
  if (golCasaFinali === golOspiteFinali) return null;

  const eventi = eventiGolCoerenti(
    gol,
    squadraCasaId,
    squadraOspiteId,
    golCasaFinali,
    golOspiteFinali
  );

  if (!eventi) return null;

  let risultatoCasa = 0;
  let risultatoOspite = 0;

  let casaEraInSvantaggio = false;
  let ospiteEraInSvantaggio = false;

  let casaHaCompletatoRimontaNelFinale = false;
  let ospiteHaCompletatoRimontaNelFinale = false;

  for (const evento of eventi) {
    const risultatoPrimaCasa = risultatoCasa;
    const risultatoPrimaOspite = risultatoOspite;

    const squadra = squadraCheHaSegnato(
      evento,
      squadraCasaId,
      squadraOspiteId
    );

    if (squadra === squadraCasaId) {
      risultatoCasa++;
    } else if (squadra === squadraOspiteId) {
      risultatoOspite++;
    } else {
      return null;
    }

    if (risultatoCasa < risultatoOspite) {
      casaEraInSvantaggio = true;
    }

    if (risultatoOspite < risultatoCasa) {
      ospiteEraInSvantaggio = true;
    }

    if (!eGolNeiMinutiFinali(evento)) continue;

    if (
      squadra === squadraCasaId &&
      risultatoPrimaCasa <= risultatoPrimaOspite &&
      risultatoCasa > risultatoOspite &&
      casaEraInSvantaggio
    ) {
      casaHaCompletatoRimontaNelFinale = true;
    }

    if (
      squadra === squadraOspiteId &&
      risultatoPrimaOspite <= risultatoPrimaCasa &&
      risultatoOspite > risultatoCasa &&
      ospiteEraInSvantaggio
    ) {
      ospiteHaCompletatoRimontaNelFinale = true;
    }
  }

  if (
    golCasaFinali > golOspiteFinali &&
    casaHaCompletatoRimontaNelFinale
  ) {
    return "CASA";
  }

  if (
    golOspiteFinali > golCasaFinali &&
    ospiteHaCompletatoRimontaNelFinale
  ) {
    return "OSPITE";
  }

  return null;
}

export async function getStatisticheRimontePartecipante(
  partecipanteId: number
): Promise<StatisticheRimontePartecipante> {
  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
      SquadraCasaId: { not: null },
      SquadraOspiteId: { not: null },
      GolCasa: { not: null },
      GolOspite: { not: null },
    },
    select: {
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
      sostitutoCasaId: true,
      sostitutoOspiteId: true,
      torneo: {
        select: {
          partecipazioni: {
            select: {
              squadraId: true,
              partecipanteId: true,
            },
          },
        },
      },
      gol: {
        select: {
          id: true,
          squadraId: true,
          minuto: true,
          recupero: true,
          periodo: true,
          tipo: true,
        },
      },
    },
  });

  let rimonteVinte = 0;
  let rimonteVinteMinutiFinali = 0;

  for (const partita of partite) {
    const squadraCasaId = partita.SquadraCasaId;
    const squadraOspiteId = partita.SquadraOspiteId;
    const golCasa = partita.GolCasa;
    const golOspite = partita.GolOspite;

    if (
      squadraCasaId === null ||
      squadraOspiteId === null ||
      golCasa === null ||
      golOspite === null
    ) {
      continue;
    }

    const partecipazioneCasa = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === squadraCasaId
    );

    const partecipazioneOspite = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === squadraOspiteId
    );

    // Il sostituto ha precedenza sul partecipante titolare,
    // esattamente come nella classifica globale.
    const allenatoreCasa =
      partita.sostitutoCasaId ??
      partecipazioneCasa?.partecipanteId;

    const allenatoreOspite =
      partita.sostitutoOspiteId ??
      partecipazioneOspite?.partecipanteId;

    const vincitore = verificaRimontaVincente(
      partita.gol,
      squadraCasaId,
      squadraOspiteId,
      golCasa,
      golOspite
    );

    if (vincitore !== null) {
      const allenatoreVincitore =
        vincitore === "CASA" ? allenatoreCasa : allenatoreOspite;

      if (allenatoreVincitore === partecipanteId) {
        rimonteVinte++;
      }
    }

    const vincitoreFinale =
      verificaRimontaVincenteNeiMinutiFinali(
        partita.gol,
        squadraCasaId,
        squadraOspiteId,
        golCasa,
        golOspite
      );

    if (vincitoreFinale !== null) {
      const allenatoreVincitore =
        vincitoreFinale === "CASA"
          ? allenatoreCasa
          : allenatoreOspite;

      if (allenatoreVincitore === partecipanteId) {
        rimonteVinteMinutiFinali++;
      }
    }
  }

  return {
    rimonteVinte,
    rimonteVinteMinutiFinali,
  };
}
