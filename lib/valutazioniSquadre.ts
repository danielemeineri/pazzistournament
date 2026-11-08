/**
 * ============================================================
 * PAZZITOURNAMENT
 * VALUTAZIONI STORICHE DELLE SQUADRE
 * ============================================================
 *
 * Le valutazioni sono specifiche per videogioco.
 *
 * IMPORTANTE:
 * - NON utilizziamo più 75 come valore di default.
 * - Se una squadra non è presente nel database storico,
 *   la valutazione viene considerata NON DISPONIBILE.
 * - Il database può essere esteso progressivamente.
 *
 * Fonte iniziale:
 * FIFA Index - database storico delle squadre.
 *
 * ============================================================
 */

export type GiocoValutazioni =
  | "FIFA_17"
  | "FIFA_18"
  | "FIFA_19"
  | "FIFA_20"
  | "FIFA_21"
  | "FIFA_22"
  | "FIFA_23"
  | "EA_FC_24"
  | "EA_FC_25"
  | "EA_FC_26"
  | "PES_2017"
  | "PES_2018"
  | "PES_2019"
  | "PES_2020"
  | "PES_2021"
  | "FIFA_WORLD_CUP_2010"
  | "FIFA_WORLD_CUP_2014"
  | "EFOOTBALL"
  | "SCONOSCIUTO";

export type ValutazioneStorica = {
  nome: string;
  valutazione: number;
};

/**
 * ============================================================
 * NORMALIZZAZIONE NOMI
 * ============================================================
 */

function normalizzaNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * ============================================================
 * ALIAS
 * ============================================================
 *
 * Permettono di riconoscere nomi differenti della stessa squadra.
 */

const ALIAS_SQUADRE: Record<string, string[]> = {
  "real madrid": [
    "real madrid",
    "real madrid cf",
  ],

  "barcellona": [
    "barcellona",
    "fc barcelona",
    "barcelona",
    "fc barcellona",
  ],

  "bayern monaco": [
    "bayern monaco",
    "bayern munchen",
    "bayern munich",
    "fc bayern",
  ],

  "juventus": [
    "juventus",
    "juventus fc",
    "juve",
  ],

  "inter": [
    "inter",
    "inter milan",
    "internazionale",
    "fc internazionale",
    "internazionale milano",
  ],

  "milan": [
    "milan",
    "ac milan",
  ],

  "roma": [
    "roma",
    "as roma",
  ],

  "napoli": [
    "napoli",
    "ssc napoli",
  ],

  "lazio": [
    "lazio",
    "ss lazio",
  ],

  "manchester city": [
    "manchester city",
    "man city",
  ],

  "manchester united": [
    "manchester united",
    "man united",
    "man utd",
  ],

  "liverpool": [
    "liverpool",
    "liverpool fc",
  ],

  "arsenal": [
    "arsenal",
    "arsenal fc",
  ],

  "chelsea": [
    "chelsea",
    "chelsea fc",
  ],

  "tottenham": [
    "tottenham",
    "tottenham hotspur",
    "spurs",
  ],

  "paris saint germain": [
    "paris saint germain",
    "paris saint-germain",
    "psg",
  ],

  "atletico madrid": [
    "atletico madrid",
    "atletico de madrid",
  ],

  "borussia dortmund": [
    "borussia dortmund",
    "dortmund",
    "bvb",
  ],

  "porto": [
    "porto",
    "fc porto",
  ],

  "benfica": [
    "benfica",
    "sl benfica",
  ],

  "sporting cp": [
    "sporting cp",
    "sporting lisbona",
    "sporting",
  ],
};

/**
 * ============================================================
 * DATABASE FIFA 17
 * ============================================================
 *
 * Valori verificati sul database storico FIFA Index.
 *
 * Per ora inseriamo le squadre principali.
 * Il database verrà esteso progressivamente.
 */

const FIFA_17: ValutazioneStorica[] = [
  {
    nome: "Real Madrid",
    valutazione: 86,
  },
  {
    nome: "Juventus",
    valutazione: 85,
  },
  {
    nome: "FC Barcelona",
    valutazione: 85,
  },
  {
    nome: "Bayern München",
    valutazione: 85,
  },
  {
    nome: "Paris Saint-Germain",
    valutazione: 83,
  },
  {
    nome: "Atlético de Madrid",
    valutazione: 83,
  },
  {
    nome: "Arsenal",
    valutazione: 83,
  },
  {
    nome: "Chelsea",
    valutazione: 83,
  },
  {
    nome: "Manchester City",
    valutazione: 83,
  },
  {
    nome: "Manchester United",
    valutazione: 83,
  },
  {
    nome: "Borussia Dortmund",
    valutazione: 82,
  },
  {
    nome: "Roma",
    valutazione: 81,
  },
  {
    nome: "Napoli",
    valutazione: 81,
  },
  {
    nome: "Inter",
    valutazione: 81,
  },
  {
    nome: "Liverpool",
    valutazione: 81,
  },
  {
    nome: "Sevilla FC",
    valutazione: 81,
  },
  {
    nome: "Tottenham Hotspur",
    valutazione: 81,
  },
  {
    nome: "Bayer 04 Leverkusen",
    valutazione: 80,
  },
  {
    nome: "Everton",
    valutazione: 80,
  },
  {
    nome: "Villarreal CF",
    valutazione: 80,
  },
  {
    nome: "AS Monaco",
    valutazione: 79,
  },
  {
    nome: "SL Benfica",
    valutazione: 79,
  },
  {
    nome: "Milan",
    valutazione: 79,
  },
  {
    nome: "Athletic Club de Bilbao",
    valutazione: 79,
  },
  {
    nome: "Lazio",
    valutazione: 79,
  },
  {
    nome: "FC Porto",
    valutazione: 79,
  },
  {
    nome: "VfL Wolfsburg",
    valutazione: 79,
  },
  {
    nome: "FC Schalke 04",
    valutazione: 79,
  },
  {
    nome: "Borussia M'gladbach",
    valutazione: 79,
  },
  {
    nome: "Olympique Lyonnais",
    valutazione: 78,
  },
  {
    nome: "Southampton",
    valutazione: 78,
  },
  {
    nome: "Leicester City",
    valutazione: 78,
  },
  {
    nome: "Fiorentina",
    valutazione: 78,
  },
  {
    nome: "OGC Nice",
    valutazione: 78,
  },
  {
    nome: "West Ham United",
    valutazione: 78,
  },
];

/**
 * ============================================================
 * DATABASE FIFA 18
 * ============================================================
 */

const FIFA_18: ValutazioneStorica[] = [
  {
    nome: "Real Madrid",
    valutazione: 86,
  },
  {
    nome: "Bayern München",
    valutazione: 86,
  },
  {
    nome: "Juventus",
    valutazione: 85,
  },
  {
    nome: "FC Barcelona",
    valutazione: 85,
  },
  {
    nome: "Manchester City",
    valutazione: 84,
  },
  {
    nome: "Manchester United",
    valutazione: 83,
  },
  {
    nome: "Atlético de Madrid",
    valutazione: 83,
  },
  {
    nome: "Tottenham Hotspur",
    valutazione: 83,
  },
  {
    nome: "Paris Saint-Germain",
    valutazione: 83,
  },
  {
    nome: "Chelsea",
    valutazione: 83,
  },
  {
    nome: "Arsenal",
    valutazione: 82,
  },
  {
    nome: "Roma",
    valutazione: 81,
  },
  {
    nome: "Borussia Dortmund",
    valutazione: 81,
  },
  {
    nome: "Napoli",
    valutazione: 81,
  },
  {
    nome: "Liverpool",
    valutazione: 81,
  },
  {
    nome: "Inter",
    valutazione: 80,
  },
  {
    nome: "Valencia CF",
    valutazione: 80,
  },
  {
    nome: "Lazio",
    valutazione: 80,
  },
  {
    nome: "AS Monaco",
    valutazione: 80,
  },
  {
    nome: "FC Porto",
    valutazione: 80,
  },
  {
    nome: "Bayer 04 Leverkusen",
    valutazione: 79,
  },
  {
    nome: "Sevilla FC",
    valutazione: 79,
  },
  {
    nome: "FC Schalke 04",
    valutazione: 79,
  },
  {
    nome: "Milan",
    valutazione: 79,
  },
  {
    nome: "Beşiktaş",
    valutazione: 79,
  },
  {
    nome: "Athletic Club de Bilbao",
    valutazione: 79,
  },
  {
    nome: "Sporting CP",
    valutazione: 79,
  },
  {
    nome: "Everton",
    valutazione: 79,
  },
  {
    nome: "Villarreal CF",
    valutazione: 79,
  },
  {
    nome: "RB Leipzig",
    valutazione: 78,
  },
  {
    nome: "Real Betis Balompié",
    valutazione: 78,
  },
  {
    nome: "RCD Espanyol",
    valutazione: 78,
  },
  {
    nome: "Real Sociedad",
    valutazione: 78,
  },
  {
    nome: "Borussia M'gladbach",
    valutazione: 78,
  },
  {
    nome: "Olympique de Marseille",
    valutazione: 78,
  },
  {
    nome: "SL Benfica",
    valutazione: 78,
  },
  {
    nome: "Olympique Lyonnais",
    valutazione: 78,
  },
  {
    nome: "Leicester City",
    valutazione: 78,
  },
];

/**
 * ============================================================
 * DATABASE FIFA 19
 * ============================================================
 */

const FIFA_19: ValutazioneStorica[] = [
  {
    nome: "Real Madrid",
    valutazione: 86,
  },
  {
    nome: "FC Barcelona",
    valutazione: 86,
  },
  {
    nome: "Bayern München",
    valutazione: 85,
  },
  {
    nome: "Juventus",
    valutazione: 85,
  },
  {
    nome: "Manchester City",
    valutazione: 85,
  },
  {
    nome: "Paris Saint-Germain",
    valutazione: 84,
  },
  {
    nome: "Atlético de Madrid",
    valutazione: 84,
  },
  {
    nome: "Tottenham Hotspur",
    valutazione: 83,
  },
  {
    nome: "Liverpool",
    valutazione: 83,
  },
  {
    nome: "Chelsea",
    valutazione: 83,
  },
  {
    nome: "Inter",
    valutazione: 82,
  },
  {
    nome: "Napoli",
    valutazione: 82,
  },
  {
    nome: "Arsenal",
    valutazione: 82,
  },
  {
    nome: "Manchester United",
    valutazione: 82,
  },
  {
    nome: "Borussia Dortmund",
    valutazione: 81,
  },
  {
    nome: "Bayer 04 Leverkusen",
    valutazione: 80,
  },
  {
    nome: "Lazio",
    valutazione: 80,
  },
  {
    nome: "Real Betis Balompié",
    valutazione: 80,
  },
  {
    nome: "Ajax",
    valutazione: 80,
  },
  {
    nome: "Valencia CF",
    valutazione: 80,
  },
  {
    nome: "Sevilla FC",
    valutazione: 80,
  },
  {
    nome: "Roma",
    valutazione: 80,
  },
  {
    nome: "FC Porto",
    valutazione: 80,
  },
  {
    nome: "Milan",
    valutazione: 80,
  },
  {
    nome: "Athletic Club de Bilbao",
    valutazione: 79,
  },
  {
    nome: "Olympique Lyonnais",
    valutazione: 79,
  },
  {
    nome: "AS Monaco",
    valutazione: 79,
  },
  {
    nome: "SL Benfica",
    valutazione: 79,
  },
  {
    nome: "RB Leipzig",
    valutazione: 79,
  },
  {
    nome: "Everton",
    valutazione: 79,
  },
  {
    nome: "Borussia M'gladbach",
    valutazione: 79,
  },
  {
    nome: "Villarreal CF",
    valutazione: 79,
  },
  {
    nome: "Sporting CP",
    valutazione: 78,
  },
  {
    nome: "Leicester City",
    valutazione: 78,
  },
];

/**
 * ============================================================
 * DATABASE FIFA 20
 * ============================================================
 */

const FIFA_20: ValutazioneStorica[] = [
  {
    nome: "FC Barcelona",
    valutazione: 86,
  },
  {
    nome: "Real Madrid",
    valutazione: 86,
  },
  {
    nome: "Liverpool",
    valutazione: 85,
  },
  {
    nome: "Juventus",
    valutazione: 85,
  },
  {
    nome: "Manchester City",
    valutazione: 85,
  },
  {
    nome: "Paris Saint-Germain",
    valutazione: 85,
  },
  {
    nome: "Bayern München",
    valutazione: 84,
  },
  {
    nome: "Atlético de Madrid",
    valutazione: 83,
  },
  {
    nome: "Borussia Dortmund",
    valutazione: 82,
  },
  {
    nome: "Tottenham Hotspur",
    valutazione: 82,
  },
  {
    nome: "Inter",
    valutazione: 82,
  },
  {
    nome: "Napoli",
    valutazione: 82,
  },
  {
    nome: "Chelsea",
    valutazione: 81,
  },
  {
    nome: "Valencia CF",
    valutazione: 81,
  },
  {
    nome: "Lazio",
    valutazione: 81,
  },
  {
    nome: "Manchester United",
    valutazione: 81,
  },
  {
    nome: "RB Leipzig",
    valutazione: 80,
  },
  {
    nome: "Real Betis Balompié",
    valutazione: 80,
  },
  {
    nome: "Bayer 04 Leverkusen",
    valutazione: 80,
  },
  {
    nome: "Sevilla FC",
    valutazione: 80,
  },
  {
    nome: "Arsenal",
    valutazione: 80,
  },
  {
    nome: "Ajax",
    valutazione: 80,
  },
  {
    nome: "SL Benfica",
    valutazione: 79,
  },
  {
    nome: "Leicester City",
    valutazione: 79,
  },
  {
    nome: "Roma",
    valutazione: 79,
  },
  {
    nome: "Olympique Lyonnais",
    valutazione: 79,
  },
  {
    nome: "Real Sociedad",
    valutazione: 79,
  },
  {
    nome: "Atalanta",
    valutazione: 79,
  },
  {
    nome: "Villarreal CF",
    valutazione: 79,
  },
  {
    nome: "Borussia M'gladbach",
    valutazione: 79,
  },
  {
    nome: "FC Porto",
    valutazione: 79,
  },
  {
    nome: "Athletic Club de Bilbao",
    valutazione: 79,
  },
  {
    nome: "Milan",
    valutazione: 79,
  },
  {
    nome: "Everton",
    valutazione: 78,
  },
  {
    nome: "Wolverhampton Wanderers",
    valutazione: 78,
  },
  {
    nome: "AS Monaco",
    valutazione: 78,
  },
  {
    nome: "West Ham United",
    valutazione: 78,
  },
  {
    nome: "Olympique de Marseille",
    valutazione: 78,
  },
  {
    nome: "Getafe CF",
    valutazione: 78,
  },
];

/**
 * ============================================================
 * DATABASE COMPLETI
 * ============================================================
 */

const DATABASE: Record<
  GiocoValutazioni,
  ValutazioneStorica[]
> = {
  FIFA_17,
  FIFA_18,
  FIFA_19,
  FIFA_20,

  FIFA_21: [],
  FIFA_22: [],
  FIFA_23: [],

  EA_FC_24: [],
  EA_FC_25: [],
  EA_FC_26: [],

  PES_2017: [],
  PES_2018: [],
  PES_2019: [],
  PES_2020: [],
  PES_2021: [],

  FIFA_WORLD_CUP_2010: [],
  FIFA_WORLD_CUP_2014: [],

  EFOOTBALL: [],
  SCONOSCIUTO: [],
};

/**
 * ============================================================
 * RISOLUZIONE ALIAS
 * ============================================================
 */

function trovaNomeCanonico(
  nomeSquadra: string
): string | null {
  const normalizzato =
    normalizzaNome(nomeSquadra);

  for (
    const [
      canonico,
      alias
    ] of Object.entries(
      ALIAS_SQUADRE
    )
  ) {
    if (
      alias.some(
        (nome) =>
          normalizzaNome(nome) ===
          normalizzato
      )
    ) {
      return canonico;
    }
  }

  return normalizzato;
}

/**
 * ============================================================
 * RECUPERA VALUTAZIONE
 * ============================================================
 */

export function recuperaValutazioneSquadra(
  videogioco: string | null | undefined,
  nomeSquadra: string
): number | null {
  if (!videogioco) {
    return null;
  }

  const gioco =
    videogioco as GiocoValutazioni;

  const database =
    DATABASE[gioco];

  if (!database) {
    return null;
  }

  if (database.length === 0) {
    return null;
  }

  const canonico =
    trovaNomeCanonico(
      nomeSquadra
    );

  if (!canonico) {
    return null;
  }

  const risultato =
    database.find(
      (squadra) => {
        const nomeDatabase =
          normalizzaNome(
            squadra.nome
          );

        return (
          nomeDatabase ===
            canonico ||
          trovaNomeCanonico(
            squadra.nome
          ) === canonico
        );
      }
    );

  return risultato?.valutazione ?? null;
}

/**
 * ============================================================
 * RECUPERA VALUTAZIONI PER UN GRUPPO DI SQUADRE
 * ============================================================
 */

export function recuperaValutazioniStoriche(
  videogioco: string | null | undefined,
  squadre: {
    id: number;
    nome: string;
  }[]
) {
  return squadre.map(
    (squadra) => ({
      squadraId: squadra.id,
      nome: squadra.nome,
      valutazione:
        recuperaValutazioneSquadra(
          videogioco,
          squadra.nome
        ),
    })
  );
}