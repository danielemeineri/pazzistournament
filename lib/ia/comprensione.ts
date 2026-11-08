/*
|--------------------------------------------------------------------------
| PAZZITOURNAMENT AI
| COMPRENSIONE DELLA DOMANDA
|--------------------------------------------------------------------------
|
| Questo file NON usa modelli AI esterni.
|
| Trasforma una domanda naturale in una struttura che il motore
| statistico interno può analizzare.
|
|--------------------------------------------------------------------------
*/

export type IntentoIA =
  | "statistiche_generali"
  | "punti_forza"
  | "punti_deboli"
  | "carriera"
  | "squadre"
  | "miglior_squadra"
  | "squadra_piu_utilizzata"
  | "videogiochi"
  | "miglior_videogioco"
  | "tornei"
  | "titoli"
  | "avversari"
  | "miglior_avversario"
  | "record"
  | "serie_vittorie"
  | "serie_sconfitte"
  | "confronto"
  | "sconosciuto";

export type DimensioneIA =
  | "carriera"
  | "squadra"
  | "videogioco"
  | "torneo"
  | "avversario"
  | "generale";

export type OperazioneIA =
  | "valore"
  | "elenco"
  | "migliore"
  | "peggiore"
  | "massimo"
  | "minimo"
  | "confronto"
  | "conteggio"
  | "media"
  | "analisi"
  | "classifica";

export type MetricaIA =
  | "partite"
  | "vittorie"
  | "pareggi"
  | "sconfitte"
  | "percentuale_vittorie"
  | "gol_fatti"
  | "gol_subiti"
  | "differenza_reti"
  | "gol_per_partita"
  | "gol_subiti_per_partita"
  | "titoli"
  | "serie_vittorie"
  | "serie_sconfitte"
  | "squadre"
  | "videogiochi"
  | "tornei"
  | "avversari"
  | "generale";

export type FiltroIA = {
  anno?: number | null;
  anni?: number[];
  videogioco?: string | null;
  videogiochi?: string[];
  squadra?: string | null;
  squadre?: string[];
  torneo?: string | null;
  tornei?: string[];
  avversario?: string | null;
  avversari?: string[];
};

export type ComprensioneIA = {
  intento: IntentoIA;
  domandaOriginale: string;
  domandaNormalizzata: string;
  dimensione: DimensioneIA;
  operazione: OperazioneIA;
  metrica: MetricaIA;
  filtro: FiltroIA;
  confronto: string[];
  classificaAscendente: boolean;
  limite: number | null;
  confidenza: number;
  paroleChiave: string[];
};

/*
|--------------------------------------------------------------------------
| NORMALIZZAZIONE
|--------------------------------------------------------------------------
*/

export function normalizzaDomanda(
  testo: string
): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[?!.,;:()[\]{}"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
|--------------------------------------------------------------------------
| UTILITÀ
|--------------------------------------------------------------------------
*/

function contieneUnoDi(
  testo: string,
  valori: string[]
): boolean {
  return valori.some((valore) =>
    testo.includes(valore)
  );
}

function estraiAnno(
  testo: string
): number | null {
  const risultati =
    testo.match(/\b(20\d{2})\b/g);

  if (!risultati?.length) {
    return null;
  }

  return Number(
    risultati[risultati.length - 1]
  );
}

function estraiLimite(
  testo: string
): number | null {
  const match = testo.match(
    /\b(?:top|prime|primi|ultime|ultimi)\s+(\d{1,2})\b/
  );

  if (!match) {
    return null;
  }

  const numero = Number(match[1]);

  return Number.isFinite(numero)
    ? numero
    : null;
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO METRICA
|--------------------------------------------------------------------------
*/

function riconosciMetrica(
  testo: string
): {
  metrica: MetricaIA;
  punteggio: number;
} {
  const candidati: {
    metrica: MetricaIA;
    parole: string[];
    peso: number;
  }[] = [
    {
      metrica: "gol_fatti",
      parole: [
        "gol fatti",
        "gol segnati",
        "reti fatte",
        "reti segnate",
        "quanto segno",
        "quanti gol ho fatto",
        "quanti gol ho segnato",
      ],
      peso: 10,
    },

    {
      metrica: "gol_subiti",
      parole: [
        "gol subiti",
        "reti subite",
        "quanto subisco",
        "quanti gol ho subito",
      ],
      peso: 10,
    },

    {
      metrica: "differenza_reti",
      parole: [
        "differenza reti",
        "differenza gol",
        "bilancio reti",
        "saldo reti",
      ],
      peso: 10,
    },

    {
      metrica: "percentuale_vittorie",
      parole: [
        "percentuale di vittorie",
        "percentuale vittorie",
        "percentuale",
        "percentuale vincente",
        "rendimento",
        "rendimento migliore",
        "rendimento peggiore",
        "come vado",
        "come sono andato",
        "come sono andata",
        "quanto sono forte",
      ],
      peso: 8,
    },

    {
      metrica: "vittorie",
      parole: [
        "vittorie",
        "vittoria",
        "quante ne ho vinte",
        "quante ho vinto",
        "partite vinte",
        "vinte",
      ],
      peso: 8,
    },

    {
      metrica: "sconfitte",
      parole: [
        "sconfitte",
        "sconfitta",
        "quante ne ho perse",
        "quante ho perso",
        "partite perse",
        "perse",
      ],
      peso: 8,
    },

    {
      metrica: "pareggi",
      parole: [
        "pareggi",
        "pareggio",
        "partite pareggiate",
      ],
      peso: 8,
    },

    {
      metrica: "partite",
      parole: [
        "partite",
        "incontri",
        "match",
        "gare",
        "giocate",
        "giocato",
      ],
      peso: 7,
    },

    {
      metrica: "titoli",
      parole: [
        "titoli",
        "trofei",
        "tornei vinti",
        "tornei conquistati",
        "campionati vinti",
      ],
      peso: 10,
    },

    {
      metrica: "serie_vittorie",
      parole: [
        "vittorie consecutive",
        "serie vincente",
        "striscia vincente",
        "serie di vittorie",
      ],
      peso: 10,
    },

    {
      metrica: "serie_sconfitte",
      parole: [
        "sconfitte consecutive",
        "serie negativa",
        "striscia negativa",
        "serie di sconfitte",
      ],
      peso: 10,
    },

    {
      metrica: "squadre",
      parole: [
        "squadre",
        "squadra",
      ],
      peso: 5,
    },

    {
      metrica: "videogiochi",
      parole: [
        "videogiochi",
        "videogioco",
        "giochi",
        "gioco",
        "fifa",
        "pes",
        "fc",
      ],
      peso: 5,
    },

    {
      metrica: "tornei",
      parole: [
        "tornei",
        "torneo",
        "competizioni",
        "campionati",
      ],
      peso: 5,
    },

    {
      metrica: "avversari",
      parole: [
        "avversari",
        "avversario",
        "contro chi",
        "contro quale",
        "contro quali",
        "sfidato",
        "avversari affrontati",
      ],
      peso: 8,
    },
  ];

  let migliore: MetricaIA =
    "generale";

  let punteggioMigliore = 0;

  for (const candidato of candidati) {
    let punteggio = 0;

    for (const parola of candidato.parole) {
      if (testo.includes(parola)) {
        punteggio += candidato.peso;
      }
    }

    if (punteggio > punteggioMigliore) {
      punteggioMigliore =
        punteggio;

      migliore =
        candidato.metrica;
    }
  }

  return {
    metrica: migliore,
    punteggio: punteggioMigliore,
  };
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO DIMENSIONE
|--------------------------------------------------------------------------
*/

function riconosciDimensione(
  testo: string
): {
  dimensione: DimensioneIA;
  punteggio: number;
} {
  const punteggi: Record<
    DimensioneIA,
    number
  > = {
    carriera: 0,
    squadra: 0,
    videogioco: 0,
    torneo: 0,
    avversario: 0,
    generale: 0,
  };

  const assegna = (
    dimensione: DimensioneIA,
    parole: string[],
    peso: number
  ) => {
    for (const parola of parole) {
      if (testo.includes(parola)) {
        punteggi[dimensione] += peso;
      }
    }
  };

  assegna(
    "avversario",
    [
      "avversario",
      "avversari",
      "contro chi",
      "contro quale",
      "contro quali",
      "sfidato",
      "giocato contro",
      "bilancio contro",
      "rendimento contro",
      "chi mi ha battuto",
      "chi ho battuto",
    ],
    12
  );

  assegna(
    "squadra",
    [
      "squadra",
      "squadre",
      "con quale squadra",
      "con che squadra",
      "squadra migliore",
      "squadra peggiore",
      "squadra piu usata",
      "squadra piu utilizzata",
    ],
    11
  );

  assegna(
    "videogioco",
    [
      "videogioco",
      "videogiochi",
      "gioco",
      "giochi",
      "fifa",
      "pes",
      "fc",
    ],
    11
  );

  assegna(
    "torneo",
    [
      "torneo",
      "tornei",
      "competizione",
      "competizioni",
      "campionato",
      "campionati",
    ],
    10
  );

  assegna(
    "carriera",
    [
      "carriera",
      "storico",
      "storia",
      "percorso",
      "complessivamente",
      "generale",
      "in totale",
      "totale",
    ],
    6
  );

  let migliore: DimensioneIA =
    "generale";

  let punteggioMigliore = 0;

  for (const [
    dimensione,
    punteggio,
  ] of Object.entries(
    punteggi
  ) as [DimensioneIA, number][]) {
    if (
      punteggio >
      punteggioMigliore
    ) {
      migliore =
        dimensione;

      punteggioMigliore =
        punteggio;
    }
  }

  return {
    dimensione: migliore,
    punteggio:
      punteggioMigliore,
  };
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO OPERAZIONE
|--------------------------------------------------------------------------
*/

function riconosciOperazione(
  testo: string
): OperazioneIA {
  if (
    contieneUnoDi(testo, [
      "confronta",
      "confrontare",
      "confronto",
      "chi e meglio",
      "chi è meglio",
      "quale e meglio",
      "quale è meglio",
      "sono piu forte",
      "sono più forte",
      "meglio tra",
      "meglio fra",
      "differenza tra",
    ])
  ) {
    return "confronto";
  }

  if (
    contieneUnoDi(testo, [
      "elenco",
      "lista",
      "tutte le",
      "tutti i",
      "quali sono",
      "quali",
      "chi sono",
    ])
  ) {
    return "elenco";
  }

  if (
    contieneUnoDi(testo, [
      "migliore",
      "miglior",
      "piu forte",
      "più forte",
      "vado meglio",
      "rendo meglio",
      "rendimento migliore",
      "best",
    ])
  ) {
    return "migliore";
  }

  if (
    contieneUnoDi(testo, [
      "peggiore",
      "peggior",
      "piu debole",
      "più debole",
      "vado peggio",
      "rendo peggio",
      "rendimento peggiore",
    ])
  ) {
    return "peggiore";
  }

  if (
    contieneUnoDi(testo, [
      "piu volte",
      "più volte",
      "di piu",
      "di più",
      "maggior numero",
      "maggiore numero",
      "massimo",
      "piu partite",
      "più partite",
    ])
  ) {
    return "massimo";
  }

  if (
    contieneUnoDi(testo, [
      "meno volte",
      "di meno",
      "minimo",
      "minor numero",
      "meno partite",
    ])
  ) {
    return "minimo";
  }

  if (
    contieneUnoDi(testo, [
      "media",
      "mediamente",
      "in media",
      "media per partita",
    ])
  ) {
    return "media";
  }

  if (
    contieneUnoDi(testo, [
      "analizza",
      "analisi",
      "come sono andato",
      "come sto andando",
      "punti di forza",
      "punti deboli",
      "cosa devo migliorare",
      "come e andata",
      "come è andata",
    ])
  ) {
    return "analisi";
  }

  if (
    contieneUnoDi(testo, [
      "quanti",
      "quante",
      "numero di",
      "numero",
      "conteggio",
    ])
  ) {
    return "conteggio";
  }

  return "valore";
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO VIDEOGIOCHI
|--------------------------------------------------------------------------
*/

function riconosciVideogiochi(
  testo: string
): string[] {
  const risultati: string[] = [];

  const videogiochi = [
    "fifa",
    "pes",
    "efootball",
    "fc",
    "fc 24",
    "fc 25",
    "fc 26",
    "fifa 23",
    "fifa 24",
    "fifa 25",
    "fifa 26",
    "pes 2021",
    "pes 2020",
    "efootball 2024",
    "efootball 2025",
    "efootball 2026",
  ];

  for (const gioco of videogiochi) {
    if (
      testo.includes(
        normalizzaDomanda(gioco)
      )
    ) {
      risultati.push(gioco);
    }
  }

  return [
    ...new Set(risultati),
  ];
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO ANNI
|--------------------------------------------------------------------------
*/

function riconosciAnni(
  testo: string
): number[] {
  const risultati =
    testo.match(/\b20\d{2}\b/g) ?? [];

  return [
    ...new Set(
      risultati.map(Number)
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO CONFRONTI
|--------------------------------------------------------------------------
*/

function riconosciConfronti(
  testo: string
): string[] {
  const elementi: string[] = [];

  const videogiochi =
    riconosciVideogiochi(
      testo
    );

  elementi.push(
    ...videogiochi
  );

  const match = testo.match(
    /\b([a-z0-9]+(?:\s+[a-z0-9]+)?)\s+(?:o|oppure|vs|contro)\s+([a-z0-9]+(?:\s+[a-z0-9]+)?)\b/
  );

  if (match) {
    elementi.push(
      match[1].trim(),
      match[2].trim()
    );
  }

  return [
    ...new Set(
      elementi.filter(Boolean)
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO FILTRI
|--------------------------------------------------------------------------
*/

function riconosciFiltri(
  testo: string
): FiltroIA {
  const anno =
    estraiAnno(testo);

  const anni =
    riconosciAnni(testo);

  const videogiochi =
    riconosciVideogiochi(
      testo
    );

  const filtro: FiltroIA = {
    anno,
    anni,
    videogioco:
      videogiochi.length === 1
        ? videogiochi[0]
        : null,
    videogiochi,
  };

  /*
  |--------------------------------------------------------------------------
  | PAROLE CHE INDICANO UN TORNEO
  |--------------------------------------------------------------------------
  |
  | Il nome esatto del torneo viene risolto successivamente confrontando
  | il testo con i dati reali restituiti dal database.
  |
  | Qui non inventiamo mai nomi.
  |--------------------------------------------------------------------------
  */

  return filtro;
}

/*
|--------------------------------------------------------------------------
| ESTRAZIONE PAROLE CHIAVE
|--------------------------------------------------------------------------
*/

function estraiParoleChiave(
  testo: string
): string[] {
  const parole =
    testo
      .split(" ")
      .map((parola) =>
        parola.trim()
      )
      .filter(
        (parola) =>
          parola.length >= 3
      );

  const stopWords =
    new Set([
      "con",
      "come",
      "sono",
      "che",
      "chi",
      "cosa",
      "dove",
      "quando",
      "quale",
      "quali",
      "quanto",
      "quanti",
      "quante",
      "della",
      "delle",
      "degli",
      "dello",
      "nella",
      "nelle",
      "negli",
      "per",
      "tra",
      "fra",
      "piu",
      "più",
      "meno",
      "una",
      "uno",
      "nel",
      "del",
      "dei",
      "mia",
      "mio",
      "mie",
      "miei",
      "ho",
      "hai",
      "in",
      "il",
      "la",
      "le",
      "lo",
      "un",
      "e",
      "o",
      "di",
      "a",
      "da",
    ]);

  return [
    ...new Set(
      parole.filter(
        (parola) =>
          !stopWords.has(parola)
      )
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| RICONOSCIMENTO INTENTO
|--------------------------------------------------------------------------
|
| L'intento rappresenta COSA vuole realmente sapere l'utente.
|
| È separato da dimensione / operazione / metrica.
|
|--------------------------------------------------------------------------
*/

function riconosciIntento(
  testo: string,
  dimensione: DimensioneIA,
  operazione: OperazioneIA,
  metrica: MetricaIA
): IntentoIA {

  /*
  |--------------------------------------------------------------------------
  | CONFRONTO
  |--------------------------------------------------------------------------
  */

  if (
    operazione === "confronto"
  ) {
    return "confronto";
  }

  /*
  |--------------------------------------------------------------------------
  | CARRIERA
  |--------------------------------------------------------------------------
  */

  if (
    contieneUnoDi(testo, [
      "carriera",
      "storico",
      "storia",
      "percorso",
      "complessivamente",
      "in totale",
      "totale",
    ])
  ) {
    return "carriera";
  }

  /*
  |--------------------------------------------------------------------------
  | SQUADRA MIGLIORE
  |--------------------------------------------------------------------------
  */

  if (
    dimensione === "squadra" &&
    (
      operazione === "migliore" ||
      contieneUnoDi(testo, [
        "con quale squadra vado meglio",
        "con quale squadra sono piu forte",
        "con quale squadra sono più forte",
        "squadra migliore",
        "squadra con cui vado meglio",
      ])
    )
  ) {
    return "miglior_squadra";
  }

  /*
  |--------------------------------------------------------------------------
  | SQUADRA PIÙ UTILIZZATA
  |--------------------------------------------------------------------------
  */

  if (
    contieneUnoDi(testo, [
      "squadra piu usata",
      "squadra più usata",
      "squadra piu utilizzata",
      "squadra più utilizzata",
      "quale squadra uso di piu",
      "quale squadra uso di più",
      "quale squadra utilizzo di piu",
      "quale squadra utilizzo di più",
      "squadra utilizzata",
      "squadra usata",
    ])
  ) {
    return "squadra_piu_utilizzata";
  }

  /*
  |--------------------------------------------------------------------------
  | VIDEOGIOCO MIGLIORE
  |--------------------------------------------------------------------------
  */

  if (
    dimensione === "videogioco" &&
    (
      operazione === "migliore"
    )
  ) {
    return "miglior_videogioco";
  }

  /*
  |--------------------------------------------------------------------------
  | TORNEI VINTI / TITOLI
  |--------------------------------------------------------------------------
  */

  if (
    metrica === "titoli" ||
    contieneUnoDi(testo, [
      "tornei vinti",
      "torneo vinto",
      "trofei",
      "titoli",
      "campionati vinti",
      "quanti tornei ho vinto",
    ])
  ) {
    return "titoli";
  }

  /*
  |--------------------------------------------------------------------------
  | SERIE VITTORIE
  |--------------------------------------------------------------------------
  */

  if (
    metrica === "serie_vittorie" ||
    contieneUnoDi(testo, [
      "serie vincente",
      "striscia vincente",
      "vittorie consecutive",
      "serie di vittorie",
    ])
  ) {
    return "serie_vittorie";
  }

  /*
  |--------------------------------------------------------------------------
  | SERIE SCONFITTE
  |--------------------------------------------------------------------------
  */

  if (
    metrica === "serie_sconfitte" ||
    contieneUnoDi(testo, [
      "serie negativa",
      "striscia negativa",
      "sconfitte consecutive",
      "serie di sconfitte",
    ])
  ) {
    return "serie_sconfitte";
  }

  /*
  |--------------------------------------------------------------------------
  | RECORD
  |--------------------------------------------------------------------------
  */

  if (
    contieneUnoDi(testo, [
      "record",
      "record personale",
      "record personali",
      "miglior serie",
      "serie piu lunga",
      "serie più lunga",
      "massimo consecutivo",
      "massima serie",
    ])
  ) {
    return "record";
  }

  /*
  |--------------------------------------------------------------------------
  | PUNTI DI FORZA
  |--------------------------------------------------------------------------
  */

  if (
    contieneUnoDi(testo, [
      "punti di forza",
      "punto di forza",
      "sono forte",
      "sono piu forte",
      "sono più forte",
      "quanto sono forte",
      "vado bene",
      "vado meglio",
      "dove sono forte",
    ])
  ) {
    return "punti_forza";
  }

  /*
  |--------------------------------------------------------------------------
  | PUNTI DEBOLI
  |--------------------------------------------------------------------------
  */

  if (
    contieneUnoDi(testo, [
      "punti deboli",
      "punto debole",
      "sono debole",
      "piu debole",
      "più debole",
      "dove vado peggio",
      "cosa devo migliorare",
      "devo migliorare",
      "dove sono scarso",
    ])
  ) {
    return "punti_deboli";
  }

  /*
  |--------------------------------------------------------------------------
  | AVVERSARI
  |--------------------------------------------------------------------------
  */

  if (
    dimensione === "avversario" &&
    (
      operazione === "migliore" ||
      contieneUnoDi(testo, [
        "avversario migliore",
        "contro chi vado meglio",
        "contro chi sono piu forte",
        "contro chi sono più forte",
        "rendimento migliore contro",
      ])
    )
  ) {
    return "miglior_avversario";
  }

  if (
    dimensione === "avversario" ||
    metrica === "avversari"
  ) {
    return "avversari";
  }

  /*
  |--------------------------------------------------------------------------
  | TORNEI
  |--------------------------------------------------------------------------
  */

  if (
    dimensione === "torneo" ||
    metrica === "tornei"
  ) {
    return "tornei";
  }

  /*
  |--------------------------------------------------------------------------
  | SQUADRE
  |--------------------------------------------------------------------------
  */

  if (
    dimensione === "squadra" ||
    metrica === "squadre"
  ) {
    return "squadre";
  }

  /*
  |--------------------------------------------------------------------------
  | VIDEOGIOCHI
  |--------------------------------------------------------------------------
  */

  if (
    dimensione === "videogioco" ||
    metrica === "videogiochi"
  ) {
    return "videogiochi";
  }

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE GENERALI
  |--------------------------------------------------------------------------
  */

  if (
    metrica === "partite" ||
    metrica === "vittorie" ||
    metrica === "pareggi" ||
    metrica === "sconfitte" ||
    metrica === "percentuale_vittorie" ||
    metrica === "gol_fatti" ||
    metrica === "gol_subiti" ||
    metrica === "differenza_reti" ||
    metrica === "gol_per_partita" ||
    metrica === "gol_subiti_per_partita"
  ) {
    return "statistiche_generali";
  }

  /*
  |--------------------------------------------------------------------------
  | FALLBACK
  |--------------------------------------------------------------------------
  */

  return "sconosciuto";
}

/*
|--------------------------------------------------------------------------
| FUNZIONE PRINCIPALE
|--------------------------------------------------------------------------
*/

export function comprendiDomanda(
  domanda: string
): ComprensioneIA {
  const originale =
    domanda.trim();

  const testo =
    normalizzaDomanda(
      originale
    );

  const {
    dimensione,
    punteggio:
      punteggioDimensione,
  } =
    riconosciDimensione(
      testo
    );

  const {
    metrica,
    punteggio:
      punteggioMetrica,
  } =
    riconosciMetrica(
      testo
    );

  const operazione =
    riconosciOperazione(
      testo
    );

  const filtro =
    riconosciFiltri(
      testo
    );

  const confronto =
    riconosciConfronti(
      testo
    );

  /*
  |--------------------------------------------------------------------------
  | CORREZIONI LOGICHE
  |--------------------------------------------------------------------------
  |
  | Alcune domande hanno parole che appartengono a più dimensioni.
  |
  | Esempio:
  |
  | "Quanti gol ho fatto con FIFA?"
  |
  | La presenza di "FIFA" NON significa che la domanda chieda
  | quale sia il videogioco migliore.
  |--------------------------------------------------------------------------
  */

  let dimensioneFinale =
    dimensione;

  if (
    filtro.videogioco ||
    (filtro.videogiochi?.length ?? 0) > 0
  ) {
    if (
      operazione === "migliore" &&
      metrica ===
        "percentuale_vittorie"
    ) {
      dimensioneFinale =
        "videogioco";
    } else if (
      operazione === "confronto"
    ) {
      dimensioneFinale =
        "videogioco";
    } else if (
      metrica === "videogiochi"
    ) {
      dimensioneFinale =
        "videogioco";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | INTENTO
  |--------------------------------------------------------------------------
  |
  | Viene calcolato DOPO dimensioneFinale perché alcune correzioni
  | della dimensione influenzano l'intento.
  |--------------------------------------------------------------------------
  */

  const intento =
    riconosciIntento(
      testo,
      dimensioneFinale,
      operazione,
      metrica
    );

  /*
  |--------------------------------------------------------------------------
  | CONFIDENZA
  |--------------------------------------------------------------------------
  */

  let confidenza =
    0.35;

  if (
    punteggioDimensione >= 8
  ) {
    confidenza += 0.2;
  }

  if (
    punteggioMetrica >= 7
  ) {
    confidenza += 0.2;
  }

  if (
    operazione !== "valore"
  ) {
    confidenza += 0.1;
  }

  if (
    confronto.length >= 2
  ) {
    confidenza += 0.1;
  }

  if (
    filtro.anno ||
    filtro.videogioco ||
    (filtro.videogiochi?.length ?? 0) > 0
  ) {
    confidenza += 0.05;
  }

  confidenza =
    Math.min(
      confidenza,
      1
    );

  return {
    intento,
    domandaOriginale:
      originale,
    domandaNormalizzata:
      testo,
    dimensione:
      dimensioneFinale,
    operazione,
    metrica,
    filtro,
    confronto,
    classificaAscendente:
      operazione === "peggiore" ||
      operazione === "minimo",
    limite:
      estraiLimite(testo),
    confidenza,
    paroleChiave:
      estraiParoleChiave(
        testo
      ),
  };
}

/*
|--------------------------------------------------------------------------
| DEBUG / TEST
|--------------------------------------------------------------------------
|
| Utile durante lo sviluppo.
| Non interroga il database.
|--------------------------------------------------------------------------
*/

export function descriviComprensione(
  comprensione: ComprensioneIA
): string {
  const righe = [
    `Intento: ${comprensione.intento}`,
    `Dimensione: ${comprensione.dimensione}`,
    `Operazione: ${comprensione.operazione}`,
    `Metrica: ${comprensione.metrica}`,
    `Confidenza: ${Math.round(
      comprensione.confidenza * 100
    )}%`,
  ];

  if (
    comprensione.filtro.anno
  ) {
    righe.push(
      `Anno: ${comprensione.filtro.anno}`
    );
  }

  if (
    comprensione.filtro.videogioco
  ) {
    righe.push(
      `Videogioco: ${comprensione.filtro.videogioco}`
    );
  }

  if (
    comprensione.filtro.videogiochi &&
    comprensione.filtro.videogiochi.length > 0
  ) {
    righe.push(
      `Videogiochi: ${comprensione.filtro.videogiochi.join(
        ", "
      )}`
    );
  }

  if (
    comprensione.confronto.length
  ) {
    righe.push(
      `Confronto: ${comprensione.confronto.join(
        " vs "
      )}`
    );
  }

  return righe.join(
    "\n"
  );
}
