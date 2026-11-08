import { TipoRanking } from "@prisma/client";

// =========================================================
// TIPI RANKING
// =========================================================

export { TipoRanking };

// =========================================================
// RISULTATO PARTITA
// =========================================================

export type EsitoRanking =
  | "VITTORIA"
  | "PAREGGIO"
  | "SCONFITTA";

// =========================================================
// TIPO ESITO
// =========================================================
//
// 90 minuti
// supplementari
// rigori
//
// Il vincitore ai rigori viene comunque considerato
// vincitore della partita, ma con un peso inferiore.
// =========================================================

export type ModalitaVittoria =
  | "REGOLAMENTARE"
  | "SUPPLEMENTARI"
  | "RIGORI";

// =========================================================
// DATI PARTITA PER IL RANKING
// =========================================================

export type PartitaRanking = {
  id: bigint;

  dataPartita: Date | null;

  SquadraCasaId: number | null;
  SquadraOspiteId: number | null;

  GolCasa: number | null;
  GolOspite: number | null;

  Completata: boolean | null;

  Fase: string | null;

  AiRigori: boolean;

  RigoriCasa: number | null;
  RigoriOspite: number | null;

  gol?: {
    periodo: string;
  }[];
};

// =========================================================
// VARIAZIONE RANKING
// =========================================================

export type CalcoloRanking = {
  tipo: TipoRanking;

  squadraCasaId: number;
  squadraOspiteId: number;

  ratingCasaPrima: number;
  ratingOspitePrima: number;

  ratingCasaDopo: number;
  ratingOspiteDopo: number;

  variazioneCasa: number;
  variazioneOspite: number;

  esitoCasa: EsitoRanking;
  esitoOspite: EsitoRanking;

  modalita: ModalitaVittoria;

  fase: string | null;
};

// =========================================================
// PESO FASE
// =========================================================

export type PesoFase = {
  nome: string;
  moltiplicatore: number;
};