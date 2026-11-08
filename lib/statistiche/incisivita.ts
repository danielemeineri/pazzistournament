export type FasciaIncisivita = {
  chiave: string;
  etichetta: string;
  golFatti: number;
  golSubiti: number;
};

export type GolPerIncisivita = {
  minuto: number;
  recupero: number | null;
  periodo: string;
  tipo: string;
  squadraId: number;
};

export type SquadraIncisivita = {
  squadraId: number;
  golFatti: number;
  golSubiti: number;
  fasce: FasciaIncisivita[];
};

const DEFINIZIONE_FASCE = [
  { chiave: "minuti_0_10", etichetta: "0–10′" },
  { chiave: "minuti_11_20", etichetta: "11–20′" },
  { chiave: "minuti_21_30", etichetta: "21–30′" },
  { chiave: "minuti_31_40", etichetta: "31–40′" },
  { chiave: "minuti_41_45", etichetta: "41–45′" },
  { chiave: "recupero_primo_tempo", etichetta: "Recupero 1º tempo" },
  { chiave: "minuti_46_50", etichetta: "46–50′" },
  { chiave: "minuti_51_60", etichetta: "51–60′" },
  { chiave: "minuti_61_70", etichetta: "61–70′" },
  { chiave: "minuti_71_80", etichetta: "71–80′" },
  { chiave: "minuti_81_90", etichetta: "81–90′" },
  { chiave: "recupero_secondo_tempo", etichetta: "Recupero 2º tempo" },
  { chiave: "supplementari", etichetta: "Supplementari" },
  {
    chiave: "recupero_supplementari",
    etichetta: "Recupero supplementari",
  },
] as const;

export type ChiaveFasciaIncisivita =
  (typeof DEFINIZIONE_FASCE)[number]["chiave"];

export function nuoveFasceIncisivita(): FasciaIncisivita[] {
  return DEFINIZIONE_FASCE.map((fascia) => ({
    chiave: fascia.chiave,
    etichetta: fascia.etichetta,
    golFatti: 0,
    golSubiti: 0,
  }));
}

type PeriodoNormalizzato = "PT" | "ST" | "SUPPLEMENTARI" | null;

function normalizzaPeriodo(periodo: string): PeriodoNormalizzato {
  const valore = periodo.trim().toUpperCase();

  if (valore === "PT" || valore === "PRIMO_TEMPO") {
    return "PT";
  }

  if (valore === "ST" || valore === "SECONDO_TEMPO") {
    return "ST";
  }

  if (valore === "SUPPLEMENTARI") {
    return "SUPPLEMENTARI";
  }

  return null;
}

export function determinaFasciaIncisivita(
  gol: Pick<GolPerIncisivita, "minuto" | "recupero" | "periodo">
): ChiaveFasciaIncisivita | null {
  const { minuto, recupero } = gol;
  const periodo = normalizzaPeriodo(gol.periodo);

  if (
    !Number.isFinite(minuto) ||
    minuto < 0 ||
    periodo === null
  ) {
    return null;
  }

  const minutiDiRecupero = recupero ?? 0;

  if (
    !Number.isFinite(minutiDiRecupero) ||
    minutiDiRecupero < 0
  ) {
    return null;
  }

  // Il periodo registrato determina la fase della partita.
  // Il recupero esplicitamente inserito determina la fascia
  // di recupero, senza dedurre la fase dal minuto.

  if (periodo === "SUPPLEMENTARI") {
    return minutiDiRecupero > 0
      ? "recupero_supplementari"
      : "supplementari";
  }

  if (minutiDiRecupero > 0) {
    return periodo === "PT"
      ? "recupero_primo_tempo"
      : "recupero_secondo_tempo";
  }

  if (periodo === "PT") {
    if (minuto <= 10) return "minuti_0_10";
    if (minuto <= 20) return "minuti_11_20";
    if (minuto <= 30) return "minuti_21_30";
    if (minuto <= 40) return "minuti_31_40";
    if (minuto <= 45) return "minuti_41_45";

    return null;
  }

  if (minuto <= 50) return "minuti_46_50";
  if (minuto <= 60) return "minuti_51_60";
  if (minuto <= 70) return "minuti_61_70";
  if (minuto <= 80) return "minuti_71_80";
  if (minuto <= 90) return "minuti_81_90";

  return null;
}

export function calcolaIncisivitaSquadra({
  gol,
  squadraId,
  squadraCasaId,
  squadraOspiteId,
}: {
  gol: GolPerIncisivita[];
  squadraId: number;
  squadraCasaId: number;
  squadraOspiteId: number;
}): SquadraIncisivita {
  const fasce = nuoveFasceIncisivita();

  const fascePerChiave = new Map(
    fasce.map((fascia) => [fascia.chiave, fascia])
  );

  let golFatti = 0;
  let golSubiti = 0;

  for (const evento of gol) {
    const chiaveFascia = determinaFasciaIncisivita(evento);

    if (!chiaveFascia) {
      continue;
    }

    let squadraCheSegna = evento.squadraId;

    // In caso di autogol, la rete viene assegnata all'avversario.
    if (evento.tipo.trim().toUpperCase() === "AUTOGOL") {
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

    if (squadraCheSegna === squadraId) {
      fascia.golFatti += 1;
      golFatti += 1;
    } else {
      fascia.golSubiti += 1;
      golSubiti += 1;
    }
  }

  return {
    squadraId,
    golFatti,
    golSubiti,
    fasce,
  };
}