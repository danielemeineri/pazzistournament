import { prisma } from "@/lib/prisma";
import { determinaEsiti } from "@/lib/ranking/formula";

type Esito = "VITTORIA" | "PAREGGIO" | "SCONFITTA";

type StatisticheAllenatoreGlobale = {
  partecipanteId: number;
  nome: string;
  puntiRanking: number;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
  differenzaReti: number;
  percentualeVittorie: number;
  differenzaRetiPerPartita: number;
  titoli: number;
  indiceRanking: number;
  indiceSportivo: number;
  indiceComplessivo: number;
};

type StatisticheSquadraGlobale = {
  squadraId: number;
  nome: string;
  tipo: string;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
  differenzaReti: number;
  percentualeVittorie: number;
};

type StatisticheVideogiocoGlobale = {
  videogioco: string;
  tornei: number;
  partite: number;
  gol: number;
};

type StatisticheGlobali = {
  allenatori: StatisticheAllenatoreGlobale[];
  squadre: StatisticheSquadraGlobale[];
  videogiochi: StatisticheVideogiocoGlobale[];
  tornei: number;
  partite: number;
  gol: number;
  golRegistrati: number;
  allenatoriTotali: number;
  squadreTotali: number;
};

type StatisticheRimonteAllenatore = {
  partecipanteId: number;
  nome: string;
  rimonte: number;
};

type StatisticheGolMinutiFinaliAllenatore = {
  partecipanteId: number;
  nome: string;
  golMinutiFinali: number;
};

type StatisticheRimonteFinaliAllenatore = {
  partecipanteId: number;
  nome: string;
  rimonteFinali: number;
};

type AccumulatoreAllenatore = {
  partecipanteId: number;
  nome: string;
  puntiRanking: number;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
  titoli: number;
};

type AccumulatoreSquadra = {
  squadraId: number;
  nome: string;
  tipo: string;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
};

type EventoGol = {
  id: number;
  squadraId: number;
  minuto: number;
  recupero: number | null;
  periodo: string;
  tipo: string;
};

function arrotonda(numero: number, decimali = 2): number {
  const fattore = 10 ** decimali;
  return Math.round(numero * fattore) / fattore;
}

function percentuale(vittorie: number, partite: number): number {
  return partite > 0 ? arrotonda((vittorie / partite) * 100) : 0;
}

function normalizza(valori: number[], valore: number): number {
  if (valori.length === 0) return 50;

  const minimo = Math.min(...valori);
  const massimo = Math.max(...valori);

  if (massimo === minimo) return 50;

  return arrotonda(((valore - minimo) / (massimo - minimo)) * 100);
}

function aggiungiEsito(
  elemento: {
    partite: number;
    vittorie: number;
    pareggi: number;
    sconfitte: number;
    golFatti: number;
    golSubiti: number;
  },
  esito: Esito,
  golFatti: number,
  golSubiti: number
): void {
  elemento.partite++;
  elemento.golFatti += golFatti;
  elemento.golSubiti += golSubiti;

  if (esito === "VITTORIA") elemento.vittorie++;
  else if (esito === "PAREGGIO") elemento.pareggi++;
  else elemento.sconfitte++;
}

// =========================================================
// ORDINE CRONOLOGICO DEI PERIODI
// =========================================================

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

// =========================================================
// SQUADRA A CUI VIENE ATTRIBUITO IL GOL
// =========================================================

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

// =========================================================
// VERIFICA COMPLETEZZA DEGLI EVENTI GOL
// =========================================================

function eventiGolCoerenti(
  gol: EventoGol[],
  squadraCasaId: number,
  squadraOspiteId: number,
  golCasaFinali: number,
  golOspiteFinali: number
): EventoGol[] | null {
  if (golCasaFinali < 0 || golOspiteFinali < 0) {
    return null;
  }

  if (gol.length !== golCasaFinali + golOspiteFinali) {
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

// =========================================================
// VERIFICA DI UNA RIMONTA VINCENTE
// =========================================================

function verificaRimontaVincente(
  gol: EventoGol[],
  squadraCasaId: number,
  squadraOspiteId: number,
  golCasaFinali: number,
  golOspiteFinali: number
): "CASA" | "OSPITE" | null {
  if (golCasaFinali === golOspiteFinali) {
    return null;
  }

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

// =========================================================
// VERIFICA DI UNA RIMONTA VINCENTE NEI MINUTI FINALI
// =========================================================
//
// La squadra deve:
// 1. Essere stata realmente in svantaggio.
// 2. Passare in vantaggio con un gol dal 76° al 90°.
// 3. Vincere il risultato finale.
// 4. Avere una sequenza di eventi gol completa e coerente.
// =========================================================

function verificaRimontaVincenteNeiMinutiFinali(
  gol: EventoGol[],
  squadraCasaId: number,
  squadraOspiteId: number,
  golCasaFinali: number,
  golOspiteFinali: number
): "CASA" | "OSPITE" | null {
  if (golCasaFinali === golOspiteFinali) {
    return null;
  }

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

    // Verifichiamo lo svantaggio maturato durante la partita.
    if (risultatoCasa < risultatoOspite) {
      casaEraInSvantaggio = true;
    }

    if (risultatoOspite < risultatoCasa) {
      ospiteEraInSvantaggio = true;
    }

    if (!eGolNeiMinutiFinali(evento)) {
      continue;
    }

    // Il gol deve portare la squadra in vantaggio.
    // La squadra deve inoltre essere stata in svantaggio
    // almeno una volta prima di questo sorpasso.
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

// =========================================================
// RECUPERO DEL NOME DEGLI ALLENATORI
// =========================================================

async function caricaNomiAllenatori(
  partecipanteIds: number[]
): Promise<Map<number, string>> {
  const ids = Array.from(new Set(partecipanteIds));

  if (ids.length === 0) {
    return new Map();
  }

  const partecipanti = await prisma.partecipante.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      nome: true,
    },
  });

  return new Map(
    partecipanti.map((partecipante) => [
      partecipante.id,
      partecipante.nome,
    ])
  );
}

// =========================================================
// CLASSIFICA GLOBALE DELLE RIMONTE
// =========================================================

export async function getClassificaRimonteAllenatoriGlobale(): Promise<
  StatisticheRimonteAllenatore[]
> {
  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
      SquadraCasaId: { not: null },
      SquadraOspiteId: { not: null },
      GolCasa: { not: null },
      GolOspite: { not: null },
    },
    select: {
      id: true,
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

  const conteggi = new Map<number, number>();
  const nomi = new Map<number, string>();

  const allenatoreIds: number[] = [];

  for (const partita of partite) {
    if (
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const vincitore = verificaRimontaVincente(
      partita.gol,
      partita.SquadraCasaId,
      partita.SquadraOspiteId,
      partita.GolCasa,
      partita.GolOspite
    );

    if (vincitore === null) continue;

    const partecipazioneCasa = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraCasaId
    );

    const partecipazioneOspite = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraOspiteId
    );

    const allenatoreId =
      vincitore === "CASA"
        ? partita.sostitutoCasaId ?? partecipazioneCasa?.partecipanteId
        : partita.sostitutoOspiteId ?? partecipazioneOspite?.partecipanteId;

    if (allenatoreId == null) continue;

    conteggi.set(allenatoreId, (conteggi.get(allenatoreId) ?? 0) + 1);
    allenatoreIds.push(allenatoreId);
  }

  const nomiAllenatori = await caricaNomiAllenatori(allenatoreIds);

  for (const [id, nome] of nomiAllenatori) {
    nomi.set(id, nome);
  }

  return Array.from(conteggi.entries())
    .filter(([id]) => nomi.has(id))
    .map(([id, rimonte]) => ({
      partecipanteId: id,
      nome: nomi.get(id)!,
      rimonte,
    }))
    .sort(
      (a, b) =>
        b.rimonte - a.rimonte ||
        a.nome.localeCompare(b.nome, "it")
    );
}

// =========================================================
// CLASSIFICA GLOBALE DEI GOL NEI MINUTI FINALI
// =========================================================

export async function getClassificaGolMinutiFinaliAllenatoriGlobale(): Promise<
  StatisticheGolMinutiFinaliAllenatore[]
> {
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

  const conteggi = new Map<number, number>();
  const allenatoreIds: number[] = [];

  for (const partita of partite) {
    if (
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const eventi = eventiGolCoerenti(
      partita.gol,
      partita.SquadraCasaId,
      partita.SquadraOspiteId,
      partita.GolCasa,
      partita.GolOspite
    );

    // Per non attribuire statistiche basate su dati parziali,
    // consideriamo soltanto partite con eventi gol coerenti.
    if (!eventi) continue;

    const partecipazioneCasa = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraCasaId
    );

    const partecipazioneOspite = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraOspiteId
    );

    const allenatoreCasa =
      partita.sostitutoCasaId ?? partecipazioneCasa?.partecipanteId;

    const allenatoreOspite =
      partita.sostitutoOspiteId ?? partecipazioneOspite?.partecipanteId;

    for (const evento of eventi) {
      if (!eGolNeiMinutiFinali(evento)) continue;

      const squadra = squadraCheHaSegnato(
        evento,
        partita.SquadraCasaId,
        partita.SquadraOspiteId
      );

      if (squadra === null) continue;

      const allenatoreId =
        squadra === partita.SquadraCasaId
          ? allenatoreCasa
          : allenatoreOspite;

      if (allenatoreId == null) continue;

      conteggi.set(allenatoreId, (conteggi.get(allenatoreId) ?? 0) + 1);
      allenatoreIds.push(allenatoreId);
    }
  }

  const nomi = await caricaNomiAllenatori(allenatoreIds);

  return Array.from(conteggi.entries())
    .filter(([id]) => nomi.has(id))
    .map(([id, golMinutiFinali]) => ({
      partecipanteId: id,
      nome: nomi.get(id)!,
      golMinutiFinali,
    }))
    .sort(
      (a, b) =>
        b.golMinutiFinali - a.golMinutiFinali ||
        a.nome.localeCompare(b.nome, "it")
    );
}

// =========================================================
// CLASSIFICA GLOBALE DELLE RIMONTE NEI MINUTI FINALI
// =========================================================

export async function getClassificaRimonteMinutiFinaliAllenatoriGlobale(): Promise<
  StatisticheRimonteFinaliAllenatore[]
> {
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

  const conteggi = new Map<number, number>();
  const allenatoreIds: number[] = [];

  for (const partita of partite) {
    if (
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const vincitore = verificaRimontaVincenteNeiMinutiFinali(
      partita.gol,
      partita.SquadraCasaId,
      partita.SquadraOspiteId,
      partita.GolCasa,
      partita.GolOspite
    );

    if (vincitore === null) continue;

    const partecipazioneCasa = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraCasaId
    );

    const partecipazioneOspite = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraOspiteId
    );

    const allenatoreId =
      vincitore === "CASA"
        ? partita.sostitutoCasaId ?? partecipazioneCasa?.partecipanteId
        : partita.sostitutoOspiteId ?? partecipazioneOspite?.partecipanteId;

    if (allenatoreId == null) continue;

    conteggi.set(allenatoreId, (conteggi.get(allenatoreId) ?? 0) + 1);
    allenatoreIds.push(allenatoreId);
  }

  const nomi = await caricaNomiAllenatori(allenatoreIds);

  return Array.from(conteggi.entries())
    .filter(([id]) => nomi.has(id))
    .map(([id, rimonteFinali]) => ({
      partecipanteId: id,
      nome: nomi.get(id)!,
      rimonteFinali,
    }))
    .sort(
      (a, b) =>
        b.rimonteFinali - a.rimonteFinali ||
        a.nome.localeCompare(b.nome, "it")
    );
}

// =========================================================
// CLASSIFICA GLOBALE ALLENATORI
// =========================================================

export async function getClassificaAllenatoriGlobale(): Promise<
  StatisticheAllenatoreGlobale[]
> {
  const [partecipanti, partite, tornei] = await Promise.all([
    prisma.partecipante.findMany({
      select: {
        id: true,
        nome: true,
        rankingAllenatore: {
          select: { punti: true },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.partita.findMany({
      where: {
        Completata: true,
        SquadraCasaId: { not: null },
        SquadraOspiteId: { not: null },
        GolCasa: { not: null },
        GolOspite: { not: null },
      },
      select: {
        id: true,
        TorneoId: true,
        SquadraCasaId: true,
        SquadraOspiteId: true,
        GolCasa: true,
        GolOspite: true,
        AiRigori: true,
        RigoriCasa: true,
        RigoriOspite: true,
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
      },
    }),
    prisma.torneo.findMany({
      select: {
        id: true,
        trofei: {
          where: { tipo: "VINCITORE_TORNEO" },
          select: { squadraVincitriceId: true },
        },
        partecipazioni: {
          select: {
            squadraId: true,
            partecipanteId: true,
          },
        },
      },
    }),
  ]);

  const dati = new Map<number, AccumulatoreAllenatore>();

  for (const partecipante of partecipanti) {
    dati.set(partecipante.id, {
      partecipanteId: partecipante.id,
      nome: partecipante.nome,
      puntiRanking: partecipante.rankingAllenatore?.punti ?? 0,
      partite: 0,
      vittorie: 0,
      pareggi: 0,
      sconfitte: 0,
      golFatti: 0,
      golSubiti: 0,
      titoli: 0,
    });
  }

  // Titoli attribuiti al partecipante titolare della squadra vincitrice.
  for (const torneo of tornei) {
    for (const trofeo of torneo.trofei) {
      if (trofeo.squadraVincitriceId === null) continue;

      const partecipazione = torneo.partecipazioni.find(
        (p) => p.squadraId === trofeo.squadraVincitriceId
      );

      if (partecipazione?.partecipanteId == null) continue;

      const allenatore = dati.get(partecipazione.partecipanteId);
      if (allenatore) allenatore.titoli++;
    }
  }

  for (const partita of partite) {
    if (
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const casa = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraCasaId
    );
    const ospite = partita.torneo.partecipazioni.find(
      (p) => p.squadraId === partita.SquadraOspiteId
    );

    const esiti = determinaEsiti(
      partita.GolCasa,
      partita.GolOspite,
      partita.AiRigori,
      partita.RigoriCasa,
      partita.RigoriOspite
    );

    const assegnazioni: {
      partecipanteId: number | null;
      esito: Esito;
      golFatti: number;
      golSubiti: number;
    }[] = [
      {
        partecipanteId: casa?.partecipanteId ?? null,
        esito: esiti.esitoCasa,
        golFatti: partita.GolCasa,
        golSubiti: partita.GolOspite,
      },
      {
        partecipanteId: partita.sostitutoCasaId,
        esito: esiti.esitoCasa,
        golFatti: partita.GolCasa,
        golSubiti: partita.GolOspite,
      },
      {
        partecipanteId: ospite?.partecipanteId ?? null,
        esito: esiti.esitoOspite,
        golFatti: partita.GolOspite,
        golSubiti: partita.GolCasa,
      },
      {
        partecipanteId: partita.sostitutoOspiteId,
        esito: esiti.esitoOspite,
        golFatti: partita.GolOspite,
        golSubiti: partita.GolCasa,
      },
    ];

    // La stessa persona viene conteggiata una sola volta per partita.
    const elaborati = new Set<number>();

    for (const assegnazione of assegnazioni) {
      const id = assegnazione.partecipanteId;

      if (id === null || elaborati.has(id)) continue;

      const allenatore = dati.get(id);
      if (!allenatore) continue;

      elaborati.add(id);

      aggiungiEsito(
        allenatore,
        assegnazione.esito,
        assegnazione.golFatti,
        assegnazione.golSubiti
      );
    }
  }

  const allenatori = Array.from(dati.values());

  const punteggiRanking = allenatori.map((a) => a.puntiRanking);
  const indiciVittorie = allenatori.map((a) => {
    const grezza = a.partite > 0 ? (a.vittorie / a.partite) * 100 : 0;
    const fiducia = a.partite / (a.partite + 10);
    return 33.333 + (grezza - 33.333) * fiducia;
  });

  const indiciDifferenzaReti = allenatori.map((a) => {
    const grezza =
      a.partite > 0
        ? (a.golFatti - a.golSubiti) / a.partite
        : 0;
    const fiducia = a.partite / (a.partite + 10);
    return grezza * fiducia;
  });

  const indiciTitoli = allenatori.map((a) => a.titoli);

  return allenatori
    .map((a, i) => {
      const differenzaReti = a.golFatti - a.golSubiti;
      const percentualeVittorie = percentuale(a.vittorie, a.partite);
      const differenzaRetiPerPartita =
        a.partite > 0
          ? arrotonda(differenzaReti / a.partite)
          : 0;

      const indiceRanking = normalizza(punteggiRanking, a.puntiRanking);
      const indiceVittorie = normalizza(
        indiciVittorie,
        indiciVittorie[i]
      );
      const indiceDifferenza = normalizza(
        indiciDifferenzaReti,
        indiciDifferenzaReti[i]
      );
      const indiceTitoli = normalizza(indiciTitoli, a.titoli);

      const indiceSportivo = arrotonda(
        indiceVittorie * 0.55 +
        indiceDifferenza * 0.30 +
        indiceTitoli * 0.15
      );

      const indiceComplessivo = arrotonda(
        indiceRanking * 0.60 + indiceSportivo * 0.40
      );

      return {
        ...a,
        differenzaReti,
        percentualeVittorie,
        differenzaRetiPerPartita,
        indiceRanking,
        indiceSportivo,
        indiceComplessivo,
      };
    })
    .sort(
      (a, b) =>
        b.indiceComplessivo - a.indiceComplessivo ||
        b.puntiRanking - a.puntiRanking ||
        b.partite - a.partite ||
        a.nome.localeCompare(b.nome, "it")
    );
}

// =========================================================
// STATISTICHE GLOBALI
// =========================================================

export async function getStatisticheGlobali(): Promise<StatisticheGlobali> {
  const [
    squadreDatabase,
    torneiDatabase,
    videogiochiDatabase,
    partiteDatabase,
    golDatabase,
    classificaAllenatori,
  ] = await Promise.all([
    prisma.squadra.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        partiteCasa: {
          where: {
            Completata: true,
            GolCasa: { not: null },
            GolOspite: { not: null },
          },
          select: {
            GolCasa: true,
            GolOspite: true,
          },
        },
        partiteOspite: {
          where: {
            Completata: true,
            GolCasa: { not: null },
            GolOspite: { not: null },
          },
          select: {
            GolCasa: true,
            GolOspite: true,
          },
        },
      },
    }),
    prisma.torneo.findMany({
      select: { id: true },
    }),
    prisma.videogioco.findMany({
      select: {
        nome: true,
        tornei: {
          select: {
            id: true,
            partite: {
              where: {
                Completata: true,
                GolCasa: { not: null },
                GolOspite: { not: null },
              },
              select: {
                GolCasa: true,
                GolOspite: true,
              },
            },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.partita.findMany({
      where: {
        Completata: true,
        SquadraCasaId: { not: null },
        SquadraOspiteId: { not: null },
        GolCasa: { not: null },
        GolOspite: { not: null },
      },
      select: {
        GolCasa: true,
        GolOspite: true,
      },
    }),
    prisma.gol.count(),
    getClassificaAllenatoriGlobale(),
  ]);

  const squadre: StatisticheSquadraGlobale[] = squadreDatabase
    .map((squadra) => {
      const accumulatore: AccumulatoreSquadra = {
        squadraId: squadra.id,
        nome: squadra.nome,
        tipo: squadra.tipo,
        partite: 0,
        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,
        golFatti: 0,
        golSubiti: 0,
      };

      for (const partita of squadra.partiteCasa) {
        if (partita.GolCasa === null || partita.GolOspite === null) continue;
        aggiungiEsito(
          accumulatore,
          partita.GolCasa > partita.GolOspite
            ? "VITTORIA"
            : partita.GolCasa === partita.GolOspite
              ? "PAREGGIO"
              : "SCONFITTA",
          partita.GolCasa,
          partita.GolOspite
        );
      }

      for (const partita of squadra.partiteOspite) {
        if (partita.GolCasa === null || partita.GolOspite === null) continue;
        aggiungiEsito(
          accumulatore,
          partita.GolOspite > partita.GolCasa
            ? "VITTORIA"
            : partita.GolOspite === partita.GolCasa
              ? "PAREGGIO"
              : "SCONFITTA",
          partita.GolOspite,
          partita.GolCasa
        );
      }

      return {
        ...accumulatore,
        differenzaReti: accumulatore.golFatti - accumulatore.golSubiti,
        percentualeVittorie: percentuale(
          accumulatore.vittorie,
          accumulatore.partite
        ),
      };
    })
    .sort(
      (a, b) =>
        b.percentualeVittorie - a.percentualeVittorie ||
        b.vittorie - a.vittorie ||
        b.partite - a.partite ||
        a.nome.localeCompare(b.nome, "it")
    );

  const videogiochi: StatisticheVideogiocoGlobale[] =
    videogiochiDatabase
      .map((gioco) => {
        const partite = gioco.tornei.flatMap((torneo) => torneo.partite);
        return {
          videogioco: gioco.nome,
          tornei: gioco.tornei.length,
          partite: partite.length,
          gol: partite.reduce(
            (totale, partita) =>
              totale + (partita.GolCasa ?? 0) + (partita.GolOspite ?? 0),
            0
          ),
        };
      })
      .sort(
        (a, b) =>
          b.partite - a.partite ||
          b.tornei - a.tornei ||
          a.videogioco.localeCompare(b.videogioco, "it")
      );

  const golPartiteConcluse = partiteDatabase.reduce(
    (totale, partita) =>
      totale + (partita.GolCasa ?? 0) + (partita.GolOspite ?? 0),
    0
  );

  return {
    allenatori: classificaAllenatori,
    squadre,
    videogiochi,
    tornei: torneiDatabase.length,
    partite: partiteDatabase.length,
    gol: golPartiteConcluse,
    golRegistrati: golDatabase,
    allenatoriTotali: classificaAllenatori.length,
    squadreTotali: squadre.length,
  };
}