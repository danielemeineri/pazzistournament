import { prisma } from "@/lib/prisma";

export type EsitoSerie = "V" | "N" | "P";

export type LatoSerie = {
  squadraId: number;
  squadraNome: string;
  squadraStemma: string | null;
  partecipanteId: number | null;
  partecipanteNome: string | null;
};

export type PartitaSerie = {
  id: string;
  dataPartita: Date | null;
  oraPartita: Date | null;
  torneoId: number;
  torneoNome: string;
  torneoAnno: number;
  golCasa: number;
  golOspite: number;
  casa: LatoSerie;
  ospite: LatoSerie;
};

export type EventoSerie = {
  esito: EsitoSerie;
  partita: PartitaSerie;
  squadra: LatoSerie;
  avversaria: LatoSerie;
  golFatti: number;
  golSubiti: number;
  allenatoreId: number | null;
  allenatoreNome: string | null;
};

export type SerieCalcolata = {
  recordVittorie: number;
  recordImbattibilita: number;
  vittorieAttuali: number;
  imbattibilitaAttuale: number;
  migliorVittorie: EventoSerie[];
  migliorImbattibilita: EventoSerie[];
  vittorieInCorso: EventoSerie[];
  imbattibilitaInCorso: EventoSerie[];
};

export type EntitaSerie = {
  id: number;
  nome: string;
  tipo?: string;
  stemma?: string | null;
  eventi: EventoSerie[];
  serie: SerieCalcolata;
};

export type SerieGlobali = {
  squadre: EntitaSerie[];
  partecipanti: EntitaSerie[];
};

// =========================================================
// ORDINAMENTO CRONOLOGICO UNICO
// =========================================================

function confrontaPartite(
  a: PartitaSerie,
  b: PartitaSerie,
): number {
  // Se entrambe hanno una data, confrontiamo prima la data.
  if (a.dataPartita && b.dataPartita) {
    const dataA = a.dataPartita.getTime();
    const dataB = b.dataPartita.getTime();

    if (dataA !== dataB) {
      return dataA - dataB;
    }

    // Stessa data: confrontiamo l'orario soltanto
    // se entrambe le partite ne hanno uno.
    if (a.oraPartita && b.oraPartita) {
      const oraA =
        a.oraPartita.getUTCHours() * 3600000 +
        a.oraPartita.getUTCMinutes() * 60000 +
        a.oraPartita.getUTCSeconds() * 1000 +
        a.oraPartita.getUTCMilliseconds();

      const oraB =
        b.oraPartita.getUTCHours() * 3600000 +
        b.oraPartita.getUTCMinutes() * 60000 +
        b.oraPartita.getUTCSeconds() * 1000 +
        b.oraPartita.getUTCMilliseconds();

      if (oraA !== oraB) {
        return oraA - oraB;
      }
    }
  }

  // Se manca una data, oppure uno dei due orari,
  // utilizziamo l'ID come criterio alternativo.
  const idA = BigInt(a.id);
  const idB = BigInt(b.id);

  if (idA < idB) return -1;
  if (idA > idB) return 1;

  return 0;
}

function confrontaEventi(
  a: EventoSerie,
  b: EventoSerie,
): number {
  return confrontaPartite(a.partita, b.partita);
}

// =========================================================
// CALCOLO SERIE
// =========================================================

export function calcolaSerie(
  eventiInput: EventoSerie[],
): SerieCalcolata {
  const eventi = [...eventiInput].sort(confrontaEventi);

  let vittorie: EventoSerie[] = [];
  let imbattibilita: EventoSerie[] = [];

  let migliorVittorie: EventoSerie[] = [];
  let migliorImbattibilita: EventoSerie[] = [];

  for (const evento of eventi) {
    if (evento.esito === "V") {
      vittorie = [...vittorie, evento];
      imbattibilita = [...imbattibilita, evento];
      continue;
    }

    if (vittorie.length > migliorVittorie.length) {
      migliorVittorie = [...vittorie];
    }

    vittorie = [];

    if (evento.esito === "N") {
      imbattibilita = [...imbattibilita, evento];
      continue;
    }

    if (imbattibilita.length > migliorImbattibilita.length) {
      migliorImbattibilita = [...imbattibilita];
    }

    imbattibilita = [];
  }

  return {
    recordVittorie: migliorVittorie.length,
    recordImbattibilita: migliorImbattibilita.length,
    vittorieAttuali: vittorie.length,
    imbattibilitaAttuale: imbattibilita.length,
    migliorVittorie,
    migliorImbattibilita,
    vittorieInCorso: vittorie,
    imbattibilitaInCorso: imbattibilita,
  };
}

// =========================================================
// CALCOLO RISULTATO PARTITA
// =========================================================

function esitoPerCasa(
  golCasa: number,
  golOspite: number,
  aiRigori: boolean,
  rigoriCasa: number | null,
  rigoriOspite: number | null,
): EsitoSerie {
  if (aiRigori) {
    if (
      rigoriCasa === null ||
      rigoriOspite === null ||
      rigoriCasa === rigoriOspite
    ) {
      return "N";
    }

    return rigoriCasa > rigoriOspite ? "V" : "P";
  }

  if (golCasa > golOspite) return "V";
  if (golCasa < golOspite) return "P";

  return "N";
}

// =========================================================
// CREAZIONE LATO PARTITA
// =========================================================

function creaLato(
  squadra: {
    id: number;
    nome: string;
    stemma: string | null;
  },
  partecipanteId: number | null,
  partecipanteNome: string | null,
): LatoSerie {
  return {
    squadraId: squadra.id,
    squadraNome: squadra.nome,
    squadraStemma: squadra.stemma,
    partecipanteId,
    partecipanteNome,
  };
}

// =========================================================
// RECUPERO STATISTICHE GLOBALI
// =========================================================

export async function getSerieGlobali(): Promise<SerieGlobali> {
  const partiteDB = await prisma.partita.findMany({
    where: {
      Completata: true,
      GolCasa: { not: null },
      GolOspite: { not: null },
      SquadraCasaId: { not: null },
      SquadraOspiteId: { not: null },
    },
    include: {
      torneo: {
        select: {
          id: true,
          nome: true,
          anno: true,
        },
      },
      squadraCasa: {
        select: {
          id: true,
          nome: true,
          stemma: true,
          tipo: true,
        },
      },
      squadraOspite: {
        select: {
          id: true,
          nome: true,
          stemma: true,
          tipo: true,
        },
      },
      sostitutoCasa: {
        select: {
          id: true,
          nome: true,
        },
      },
      sostitutoOspite: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  // Non effettuiamo un secondo ordinamento qui.
  // Tutte le serie utilizzeranno confrontaPartite()
  // attraverso confrontaEventi().

  const partiteValide = partiteDB.filter(
    (partita) =>
      partita.squadraCasa !== null &&
      partita.squadraOspite !== null &&
      partita.GolCasa !== null &&
      partita.GolOspite !== null,
  );

  const torneoIds = [
    ...new Set(partiteValide.map((x) => x.TorneoId)),
  ];

  const partecipazioni = torneoIds.length
    ? await prisma.partecipazione.findMany({
        where: {
          torneoId: { in: torneoIds },
        },
        select: {
          torneoId: true,
          squadraId: true,
          partecipanteId: true,
          partecipante: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      })
    : [];

  const partecipantiPerSquadra = new Map<
    string,
    { id: number; nome: string } | null
  >();

  for (const partecipazione of partecipazioni) {
    partecipantiPerSquadra.set(
      `${partecipazione.torneoId}:${partecipazione.squadraId}`,
      partecipazione.partecipante,
    );
  }

  const eventiSquadre = new Map<number, EventoSerie[]>();
  const eventiPartecipanti = new Map<number, EventoSerie[]>();

  const nomiSquadre = new Map<
    number,
    { nome: string; tipo: string; stemma: string | null }
  >();

  const nomiPartecipanti = new Map<number, string>();

  function aggiungiEvento(
    mappa: Map<number, EventoSerie[]>,
    id: number,
    evento: EventoSerie,
  ) {
    const esistenti = mappa.get(id) ?? [];

    esistenti.push(evento);
    mappa.set(id, esistenti);
  }

  // =========================================================
  // COSTRUZIONE EVENTI
  // =========================================================

  for (const partita of partiteValide) {
    const squadraCasa = partita.squadraCasa;
    const squadraOspite = partita.squadraOspite;

    if (
      !squadraCasa ||
      !squadraOspite ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const partecipanteTitCasa =
      partecipantiPerSquadra.get(
        `${partita.TorneoId}:${squadraCasa.id}`,
      ) ?? null;

    const partecipanteTitOspite =
      partecipantiPerSquadra.get(
        `${partita.TorneoId}:${squadraOspite.id}`,
      ) ?? null;

    const partecipanteCasa = partita.sostitutoCasa
      ? {
          id: partita.sostitutoCasa.id,
          nome: partita.sostitutoCasa.nome,
        }
      : partecipanteTitCasa;

    const partecipanteOspite = partita.sostitutoOspite
      ? {
          id: partita.sostitutoOspite.id,
          nome: partita.sostitutoOspite.nome,
        }
      : partecipanteTitOspite;

    const casa = creaLato(
      squadraCasa,
      partecipanteCasa?.id ?? null,
      partecipanteCasa?.nome ?? null,
    );

    const ospite = creaLato(
      squadraOspite,
      partecipanteOspite?.id ?? null,
      partecipanteOspite?.nome ?? null,
    );

    const partitaNormalizzata: PartitaSerie = {
      id: partita.id.toString(),
      dataPartita: partita.dataPartita,
      oraPartita: partita.OraPartita,
      torneoId: partita.TorneoId,
      torneoNome: partita.torneo.nome,
      torneoAnno: partita.torneo.anno,
      golCasa: partita.GolCasa,
      golOspite: partita.GolOspite,
      casa,
      ospite,
    };

    nomiSquadre.set(squadraCasa.id, {
      nome: squadraCasa.nome,
      tipo: squadraCasa.tipo,
      stemma: squadraCasa.stemma,
    });

    nomiSquadre.set(squadraOspite.id, {
      nome: squadraOspite.nome,
      tipo: squadraOspite.tipo,
      stemma: squadraOspite.stemma,
    });

    if (partecipanteCasa) {
      nomiPartecipanti.set(
        partecipanteCasa.id,
        partecipanteCasa.nome,
      );
    }

    if (partecipanteOspite) {
      nomiPartecipanti.set(
        partecipanteOspite.id,
        partecipanteOspite.nome,
      );
    }

    const esitoCasa = esitoPerCasa(
      partita.GolCasa,
      partita.GolOspite,
      partita.AiRigori,
      partita.RigoriCasa,
      partita.RigoriOspite,
    );

    const esitoOspite: EsitoSerie =
      esitoCasa === "V"
        ? "P"
        : esitoCasa === "P"
          ? "V"
          : "N";

    const eventoCasa: EventoSerie = {
      esito: esitoCasa,
      partita: partitaNormalizzata,
      squadra: casa,
      avversaria: ospite,
      golFatti: partita.GolCasa,
      golSubiti: partita.GolOspite,
      allenatoreId: partecipanteCasa?.id ?? null,
      allenatoreNome: partecipanteCasa?.nome ?? null,
    };

    const eventoOspite: EventoSerie = {
      esito: esitoOspite,
      partita: partitaNormalizzata,
      squadra: ospite,
      avversaria: casa,
      golFatti: partita.GolOspite,
      golSubiti: partita.GolCasa,
      allenatoreId: partecipanteOspite?.id ?? null,
      allenatoreNome: partecipanteOspite?.nome ?? null,
    };

    // Le statistiche delle squadre restano separate.
    aggiungiEvento(
      eventiSquadre,
      squadraCasa.id,
      eventoCasa,
    );

    aggiungiEvento(
      eventiSquadre,
      squadraOspite.id,
      eventoOspite,
    );

    // =======================================================
    // STATISTICHE PARTECIPANTI
    // =======================================================

    const stessoPartecipante =
      partecipanteCasa?.id != null &&
      partecipanteCasa.id === partecipanteOspite?.id;

    if (stessoPartecipante && partecipanteCasa) {
      // Una partita tra due squadre dello stesso partecipante
      // viene registrata una sola volta nelle statistiche personali.
      // Il risultato personale segue il lato vincente.

      const eventoPersonale =
        esitoCasa === "V"
          ? eventoCasa
          : esitoCasa === "P"
            ? eventoOspite
            : eventoCasa;

      aggiungiEvento(
        eventiPartecipanti,
        partecipanteCasa.id,
        {
          ...eventoPersonale,
          allenatoreId: partecipanteCasa.id,
          allenatoreNome: partecipanteCasa.nome,
        },
      );
    } else {
      if (partecipanteCasa) {
        aggiungiEvento(
          eventiPartecipanti,
          partecipanteCasa.id,
          eventoCasa,
        );
      }

      if (partecipanteOspite) {
        aggiungiEvento(
          eventiPartecipanti,
          partecipanteOspite.id,
          eventoOspite,
        );
      }
    }
  }

  // =========================================================
  // COSTRUZIONE ENTITÀ FINALI
  // =========================================================

  function costruisciEntita(
    mappaEventi: Map<number, EventoSerie[]>,
    nomi: Map<
      number,
      string | {
        nome: string;
        tipo: string;
        stemma: string | null;
      }
    >,
  ): EntitaSerie[] {
    return [...mappaEventi.entries()].map(([id, eventi]) => {
      const dato = nomi.get(id);

      const nome =
        typeof dato === "string"
          ? dato
          : dato?.nome ?? `#${id}`;

      // Unico ordinamento cronologico condiviso.
      const eventiOrdinati = [...eventi].sort(confrontaEventi);

      return {
        id,
        nome,
        ...(typeof dato === "string" || !dato
          ? {}
          : {
              tipo: dato.tipo,
              stemma: dato.stemma,
            }),
        eventi: eventiOrdinati,
        serie: calcolaSerie(eventiOrdinati),
      };
    });
  }

  return {
    squadre: costruisciEntita(
      eventiSquadre,
      nomiSquadre,
    ),
    partecipanti: costruisciEntita(
      eventiPartecipanti,
      nomiPartecipanti,
    ),
  };
}