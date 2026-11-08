import { TipoRanking } from "@prisma/client";

import {
  calcolaDelta,
  determinaEsiti,
  getMoltiplicatoreFase,
  limitaRating,
} from "./formula";

import {
  CalcoloRanking,
  ModalitaVittoria,
} from "./tipi";

// =========================================================
// TIPO SQUADRA
// =========================================================

export type TipoSquadraRanking =
  | "Club"
  | "Nazionale"
  | string;

// =========================================================
// RANKING COMPATIBILI CON UNA SQUADRA
// =========================================================

export function getTipiRankingSquadra(
  tipoSquadra: TipoSquadraRanking
): TipoRanking[] {
  if (
    tipoSquadra === "Nazionale"
  ) {
    return [
      TipoRanking.NAZIONALE,
      TipoRanking.MISTO,
    ];
  }

  if (
    tipoSquadra === "Club"
  ) {
    return [
      TipoRanking.CLUB,
      TipoRanking.MISTO,
    ];
  }

  /*
   * Per sicurezza, se una squadra esistente
   * ha un valore tipo diverso da Club/Nazionale,
   * non la facciamo entrare nei ranking specifici.
   *
   * Potrà comunque entrare nel ranking misto
   * solo se esplicitamente gestita in futuro.
   */

  return [];
}

// =========================================================
// RANKING CONDIVISI DA DUE SQUADRE
// =========================================================

export function getTipiRankingPartita(
  tipoCasa: TipoSquadraRanking,
  tipoOspite: TipoSquadraRanking
): TipoRanking[] {
  const rankingCasa =
    getTipiRankingSquadra(
      tipoCasa
    );

  const rankingOspite =
    getTipiRankingSquadra(
      tipoOspite
    );

  return rankingCasa.filter(
    (tipo) =>
      rankingOspite.includes(
        tipo
      )
  );
}

// =========================================================
// MODALITÀ SUPPLEMENTARI
// =========================================================

export function determinaModalitaConSupplementari(
  golCasa: number,
  golOspite: number,
  aiRigori: boolean,
  rigoriCasa: number | null,
  rigoriOspite: number | null,
  presenzaSupplementari: boolean
): {
  esitoCasa: "VITTORIA" | "PAREGGIO" | "SCONFITTA";
  esitoOspite:
    | "VITTORIA"
    | "PAREGGIO"
    | "SCONFITTA";
  modalita: ModalitaVittoria;
} {
  const risultato =
    determinaEsiti(
      golCasa,
      golOspite,
      aiRigori,
      rigoriCasa,
      rigoriOspite
    );

  /*
   * Se ci sono i rigori, i rigori hanno sempre
   * la precedenza.
   */

  if (
    risultato.modalita ===
    "RIGORI"
  ) {
    return risultato;
  }

  /*
   * Se il risultato è deciso e abbiamo almeno
   * un gol registrato nei supplementari,
   * consideriamo la partita vinta ai supplementari.
   */

  if (
    presenzaSupplementari &&
    risultato.esitoCasa !==
      "PAREGGIO"
  ) {
    return {
      ...risultato,
      modalita:
        "SUPPLEMENTARI",
    };
  }

  return risultato;
}

// =========================================================
// CALCOLO RANKING
// =========================================================

export function calcolaRankingPartita({
  tipo,
  squadraCasaId,
  squadraOspiteId,
  tipoSquadraCasa,
  tipoSquadraOspite,
  ratingCasa,
  ratingOspite,
  golCasa,
  golOspite,
  aiRigori,
  rigoriCasa,
  rigoriOspite,
  fase,
  presenzaSupplementari,
}: {
  tipo: TipoRanking;

  squadraCasaId: number;
  squadraOspiteId: number;

  tipoSquadraCasa: TipoSquadraRanking;
  tipoSquadraOspite: TipoSquadraRanking;

  ratingCasa: number;
  ratingOspite: number;

  golCasa: number;
  golOspite: number;

  aiRigori: boolean;
  rigoriCasa: number | null;
  rigoriOspite: number | null;

  fase: string | null;

  presenzaSupplementari: boolean;
}): CalcoloRanking | null {
  // ========================================================
  // CONTROLLO RANKING
  // ========================================================

  const rankingValidi =
    getTipiRankingPartita(
      tipoSquadraCasa,
      tipoSquadraOspite
    );

  if (
    !rankingValidi.includes(
      tipo
    )
  ) {
    return null;
  }

  // ========================================================
  // ESITO
  // ========================================================

  const risultato =
    determinaModalitaConSupplementari(
      golCasa,
      golOspite,
      aiRigori,
      rigoriCasa,
      rigoriOspite,
      presenzaSupplementari
    );

  // ========================================================
  // DELTA CASA
  // ========================================================

  const deltaCasa =
    calcolaDelta(
      ratingCasa,
      ratingOspite,
      risultato.esitoCasa,
      fase,
      risultato.modalita
    );

  // ========================================================
  // DELTA OSPITE
  // ========================================================

  const deltaOspite =
    calcolaDelta(
      ratingOspite,
      ratingCasa,
      risultato.esitoOspite,
      fase,
      risultato.modalita
    );

  // ========================================================
  // RATING DOPO
  // ========================================================

  const ratingCasaDopo =
    limitaRating(
      ratingCasa +
        deltaCasa
    );

  const ratingOspiteDopo =
    limitaRating(
      ratingOspite +
        deltaOspite
    );

  /*
   * Se una squadra è già a 0 e perde,
   * il suo delta teorico può essere negativo.
   *
   * Lo storico deve comunque registrare la
   * variazione reale del rating, non quella
   * teorica.
   *
   * Esempio:
   *
   * rating = 0
   * delta teorico = -20
   * rating finale = 0
   *
   * variazione reale = 0
   */

  const variazioneCasa =
    ratingCasaDopo -
    ratingCasa;

  const variazioneOspite =
    ratingOspiteDopo -
    ratingOspite;

  return {
    tipo,

    squadraCasaId,
    squadraOspiteId,

    ratingCasaPrima:
      ratingCasa,

    ratingOspitePrima:
      ratingOspite,

    ratingCasaDopo,
    ratingOspiteDopo,

    variazioneCasa,
    variazioneOspite,

    esitoCasa:
      risultato.esitoCasa,

    esitoOspite:
      risultato.esitoOspite,

    modalita:
      risultato.modalita,

    fase,

  };
}

// =========================================================
// ETICHETTA RISULTATO
// =========================================================

export function getEtichettaRisultato(
  esito:
    | "VITTORIA"
    | "PAREGGIO"
    | "SCONFITTA"
): string {
  switch (esito) {
    case "VITTORIA":
      return "VITTORIA";

    case "SCONFITTA":
      return "SCONFITTA";

    case "PAREGGIO":
      return "PAREGGIO";
  }
}

// =========================================================
// MOLTIPLICATORE FASE ESPORTATO
// =========================================================

export {
  getMoltiplicatoreFase,
};