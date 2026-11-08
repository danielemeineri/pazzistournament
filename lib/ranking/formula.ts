import {
  EsitoRanking,
  ModalitaVittoria,
  PesoFase,
} from "./tipi";

// =========================================================
// PARAMETRI PRINCIPALI DEL RANKING
// =========================================================

const K_BASE = 40;

// =========================================================
// LIMITI RATING
// =========================================================
//
// Il rating non può mai diventare negativo.
// =========================================================

export function limitaRating(rating: number): number {
  return Math.max(0, Math.round(rating));
}

// =========================================================
// MOLTIPLICATORE DELLA FASE
// =========================================================
//
// Il peso della partita aumenta con l'importanza della fase.
//
// Girone              1.00
// Playoff             1.10
// Ottavi              1.20
// Quarti              1.35
// 3°/4° posto         1.00
// Semifinale          1.65
// Finale              1.80
//
// ATTENZIONE:
// "Finale 3°/4° posto" deve essere controllata PRIMA
// di "Finale", altrimenti potrebbe essere classificata
// erroneamente come finale.
// =========================================================

export function getMoltiplicatoreFase(
  fase: string | null | undefined
): number {
  if (!fase) {
    return 1;
  }

  const valore = fase
    .trim()
    .toLowerCase();

  // -------------------------------------------------------
  // FINALE 3° / 4° POSTO
  // -------------------------------------------------------

  if (
    valore.includes("3°/4°") ||
    valore.includes("3º/4º") ||
    valore.includes("3°") ||
    valore.includes("3º") ||
    valore.includes("3/4") ||
    valore.includes("terzo") ||
    valore.includes("terza")
  ) {
    return 1.00;
  }

  // -------------------------------------------------------
  // OTTAVI
  // -------------------------------------------------------

  if (
    valore.includes("ottavi") ||
    valore.includes("ottavo")
  ) {
    return 1.2;
  }

  // -------------------------------------------------------
  // QUARTI
  // -------------------------------------------------------

  if (
    valore.includes("quarti") ||
    valore.includes("quarto")
  ) {
    return 1.35;
  }

  // -------------------------------------------------------
  // SEMIFINALE
  // -------------------------------------------------------

  if (
    valore.includes("semifinale") ||
    valore.includes("semifinali")
  ) {
    return 1.65;
  }

  // -------------------------------------------------------
  // FINALE
  // -------------------------------------------------------

  if (
    valore === "finale" ||
    valore === "final" ||
    valore.includes("finalissima")
  ) {
    return 1.8;
  }

  // -------------------------------------------------------
  // PLAYOFF
  // -------------------------------------------------------

  if (
    valore.includes("playoff") ||
    valore.includes("play-off")
  ) {
    return 1.1;
  }

  // -------------------------------------------------------
  // GIRONI
  // -------------------------------------------------------

  if (
    valore.includes("girone") ||
    valore.includes("gruppo")
  ) {
    return 1;
  }

  // -------------------------------------------------------
  // DEFAULT
  // -------------------------------------------------------

  return 1;
}

// =========================================================
// PESI DELLE FASI
// =========================================================

export const PESI_FASI: PesoFase[] = [
  {
    nome: "Girone",
    moltiplicatore: 1,
  },
  {
    nome: "Playoff",
    moltiplicatore: 1.1,
  },
  {
    nome: "Ottavi",
    moltiplicatore: 1.2,
  },
  {
    nome: "Quarti",
    moltiplicatore: 1.35,
  },
  {
    nome: "Finale 3°/4° posto",
    moltiplicatore: 1.00,
  },
  {
    nome: "Semifinale",
    moltiplicatore: 1.65,
  },
  {
    nome: "Finale",
    moltiplicatore: 1.8,
  },
];

// =========================================================
// ESITO DELLA PARTITA
// =========================================================

export function determinaEsiti(
  golCasa: number,
  golOspite: number,
  aiRigori: boolean,
  rigoriCasa: number | null,
  rigoriOspite: number | null
): {
  esitoCasa: EsitoRanking;
  esitoOspite: EsitoRanking;
  modalita: ModalitaVittoria;
} {
  // -------------------------------------------------------
  // RIGORI
  // -------------------------------------------------------

  if (
    aiRigori &&
    rigoriCasa !== null &&
    rigoriOspite !== null &&
    rigoriCasa !== rigoriOspite
  ) {
    if (rigoriCasa > rigoriOspite) {
      return {
        esitoCasa: "VITTORIA",
        esitoOspite: "SCONFITTA",
        modalita: "RIGORI",
      };
    }

    return {
      esitoCasa: "SCONFITTA",
      esitoOspite: "VITTORIA",
      modalita: "RIGORI",
    };
  }

  // -------------------------------------------------------
  // PAREGGIO
  // -------------------------------------------------------

  if (golCasa === golOspite) {
    return {
      esitoCasa: "PAREGGIO",
      esitoOspite: "PAREGGIO",
      modalita: "REGOLAMENTARE",
    };
  }

  // -------------------------------------------------------
  // VITTORIA CASA
  // -------------------------------------------------------

  if (golCasa > golOspite) {
    return {
      esitoCasa: "VITTORIA",
      esitoOspite: "SCONFITTA",
      modalita: "REGOLAMENTARE",
    };
  }

  // -------------------------------------------------------
  // VITTORIA OSPITE
  // -------------------------------------------------------

  return {
    esitoCasa: "SCONFITTA",
    esitoOspite: "VITTORIA",
    modalita: "REGOLAMENTARE",
  };
}

// =========================================================
// MOLTIPLICATORE DELL'ESITO
// =========================================================
//
// Il risultato (1 / 0.5 / 0) viene già utilizzato
// nella formula Elo.
//
// Il moltiplicatore qui serve solamente a ridurre
// l'impatto delle vittorie/sconfitte decise dopo
// supplementari o rigori.
//
// 90 minuti:
//   Vittoria   1.00
//   Pareggio   1.00
//   Sconfitta  1.00
//
// Supplementari:
//   Vittoria   0.90
//   Sconfitta  0.10
//
// Rigori:
//   Vittoria   0.75
//   Sconfitta  0.25
//
// La sconfitta nei 90 minuti DEVE essere 1.00.
// Se fosse 0, una sconfitta non produrrebbe alcuna
// variazione negativa del rating.
// =========================================================

export function getMoltiplicatoreEsito(
  esito: EsitoRanking,
  modalita: ModalitaVittoria
): number {
  if (esito === "PAREGGIO") {
    return 1;
  }

  switch (modalita) {
    case "REGOLAMENTARE":
      return 1;

    case "SUPPLEMENTARI":
      return esito === "VITTORIA"
        ? 0.9
        : 0.1;

    case "RIGORI":
      return esito === "VITTORIA"
        ? 0.75
        : 0.25;

    default:
      return 1;
  }
}

// =========================================================
// VALORE ATTESO
// =========================================================
//
// Formula Elo classica.
//
// E = 1 / (1 + 10 ^ ((R_avversario - R_squadra) / 400))
//
// Se le due squadre hanno lo stesso rating:
// E = 0.5
// =========================================================

export function calcolaAspettativa(
  ratingSquadra: number,
  ratingAvversario: number
): number {
  return (
    1 /
    (
      1 +
      Math.pow(
        10,
        (ratingAvversario - ratingSquadra) / 400
      )
    )
  );
}

// =========================================================
// VALORE RISULTATO
// =========================================================

export function getValoreRisultato(
  esito: EsitoRanking
): number {
  switch (esito) {
    case "VITTORIA":
      return 1;

    case "PAREGGIO":
      return 0.5;

    case "SCONFITTA":
      return 0;
  }
}

// =========================================================
// CALCOLO DELLA VARIAZIONE
// =========================================================
//
// Formula:
//
// Delta = K × (Risultato - Aspettativa)
//         × MoltiplicatoreFase
//         × MoltiplicatoreEsito
//
// La variazione viene arrotondata all'intero più vicino.
// =========================================================

export function calcolaDelta(
  ratingSquadra: number,
  ratingAvversario: number,
  esito: EsitoRanking,
  fase: string | null,
  modalita: ModalitaVittoria
): number {
  const aspettativa =
    calcolaAspettativa(
      ratingSquadra,
      ratingAvversario
    );

  const risultato =
    getValoreRisultato(esito);

  const moltiplicatoreFase =
    getMoltiplicatoreFase(fase);

  const moltiplicatoreEsito =
    getMoltiplicatoreEsito(
      esito,
      modalita
    );

  const delta =
    K_BASE *
    (risultato - aspettativa) *
    moltiplicatoreFase *
    moltiplicatoreEsito;

  return Math.round(delta);
}