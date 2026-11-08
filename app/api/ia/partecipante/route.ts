import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

import {

  getStatistichePartecipante,

  type StatistichePartecipante,

  type StatisticheSquadraPartecipante,

  type StatisticheTorneoPartecipante,

  type StatisticheVideogiocoPartecipante,

  type StatisticheAvversarioPartecipante,

} from "@/lib/statistiche/partecipante";

import {

  eDomandaGlobale,

  rispondiDomandaGlobale,

} from "@/lib/statistiche/risposte-globali";



/*

|--------------------------------------------------------------------------

| TIPI

|--------------------------------------------------------------------------

*/



type Richiesta = {

  domanda?: string;

  nomeIdentita?: string | null;

};



type IntentoIA =

  | "carriera"

  | "forza"

  | "debolezza"

  | "squadra_migliore"

  | "squadra_utilizzata"

  | "videogioco_migliore"

  | "videogioco_specifico"

  | "tornei_vinti"

  | "gol"

  | "record"

  | "tornei"

  | "squadre"

  | "videogiochi"

  | "avversari"

  | "rimonte"

  | "generale";



type OperazioneAvversari =

  | "specifico"

  | "migliore"

  | "peggiore"

  | "piu_vittorie"

  | "piu_sconfitte"

  | "piu_partite"

  | "generale";



/*

|--------------------------------------------------------------------------

| FORMATTAZIONE

|--------------------------------------------------------------------------

*/



function formatNumero(numero: number): string {

  return numero.toLocaleString("it-IT", {

    maximumFractionDigits: 2,

  });

}



function formatPercentuale(numero: number): string {

  return `${numero.toLocaleString("it-IT", {

    minimumFractionDigits: 1,

    maximumFractionDigits: 1,

  })}%`;

}



function formatDifferenzaReti(numero: number): string {

  return `${numero > 0 ? "+" : ""}${formatNumero(numero)}`;

}



/*

|--------------------------------------------------------------------------

| NORMALIZZAZIONE

|--------------------------------------------------------------------------

*/



function normalizzaTesto(testo: string): string {

  return testo

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[’']/g, "")

    .replace(/[?!.,;:(){}\[\]"]/g, " ")

    .replace(/\s+/g, " ")

    .trim();

}



function contieneUnoDi(

  testo: string,

  parole: string[]

): boolean {

  return parole.some((parola) =>

    testo.includes(parola)

  );

}



/*

|--------------------------------------------------------------------------

| AMMINISTRATORE

|--------------------------------------------------------------------------

*/



/*

|--------------------------------------------------------------------------

| RICERCA PARTECIPANTE

|--------------------------------------------------------------------------

*/



async function trovaPartecipantePerNome(

  prisma: any,

  nomeInserito: string

): Promise<{

  id: number;

  nome: string;

} | null> {

  const nomeNormalizzato =

    normalizzaTesto(nomeInserito);



  if (!nomeNormalizzato) {

    return null;

  }



  const partecipanti =

    await prisma.partecipante.findMany({

      select: {

        id: true,

        nome: true,

      },

    });



  const esatto =

    partecipanti.find(

      (partecipante: {

        id: number;

        nome: string;

      }) =>

        normalizzaTesto(

          partecipante.nome

        ) === nomeNormalizzato

    );



  if (esatto) {

    return esatto;

  }



  const parziali =

    partecipanti.filter(

      (partecipante: {

        id: number;

        nome: string;

      }) => {

        const nome =

          normalizzaTesto(

            partecipante.nome

          );



        return (

          nome.includes(

            nomeNormalizzato

          ) ||

          nomeNormalizzato.includes(nome)

        );

      }

    );



  if (parziali.length === 1) {

    return parziali[0];

  }



  return null;

}



/*

|--------------------------------------------------------------------------

| RICONOSCIMENTO INTENTO

|--------------------------------------------------------------------------

|

| Questo è il cuore del motore.

|

| Non cerchiamo una frase identica.

| Costruiamo invece un punteggio sulla base

| dei concetti presenti nella domanda.

|--------------------------------------------------------------------------

*/



async function trovaPartecipanteNellaDomanda(

  prisma: any,

  domanda: string

): Promise<{ id: number; nome: string } | null> {

  const testo = normalizzaTesto(domanda);

  if (!testo) return null;



  const partecipanti = await prisma.partecipante.findMany({

    select: { id: true, nome: true },

  });



  const ordinati = partecipanti

    .filter((p: { id: number; nome: string }) => normalizzaTesto(p.nome).length >= 2)

    .sort((a: { nome: string }, b: { nome: string }) => b.nome.length - a.nome.length);



  for (const partecipante of ordinati) {

    const nome = normalizzaTesto(partecipante.nome);

    if (nome && testo.includes(nome)) return partecipante;

  }



  return null;

}



function riconosciIntento(

  domanda: string

): IntentoIA {

  const testo =

    normalizzaTesto(domanda);



  const punteggi: Record<

    IntentoIA,

    number

  > = {

    carriera: 0,

    forza: 0,

    debolezza: 0,

    squadra_migliore: 0,

    squadra_utilizzata: 0,

    videogioco_migliore: 0,

    videogioco_specifico: 0,

    tornei_vinti: 0,

    gol: 0,

    record: 0,

    tornei: 0,

    squadre: 0,

    videogiochi: 0,

    avversari: 0,

    rimonte: 0,

    generale: 0,

  };



  const assegna = (

    intento: IntentoIA,

    parole: string[],

    peso: number

  ) => {

    for (const parola of parole) {

      if (testo.includes(parola)) {

        punteggi[intento] += peso;

      }

    }

  };



  /*

  |--------------------------------------------------------------------------

  | AVVERSARI

  |--------------------------------------------------------------------------

  */



  assegna(

    "avversari",

    [

      "avversario",

      "avversari",

      "contro chi",

      "contro quale",

      "contro quali",

      "contro",

      "sfidato",

      "sfidati",

      "affrontato",

      "affrontati",

      "affronto",

      "giocato contro",

      "giocare contro",

      "bilancio contro",

      "rendimento contro",

      "come sono andato contro",

      "come sono andata contro",

      "come vado contro",

      "chi ho battuto",

      "chi mi ha battuto",

      "chi mi ha sconfitto",

      "chi ho sconfitto",

      "chi ho battuto piu volte",

      "chi ho sconfitto piu volte",

      "chi mi ha battuto piu volte",

      "chi mi ha sconfitto piu volte",

      "contro chi vado meglio",

      "contro chi vado peggio",

      "contro chi sono piu forte",

      "contro chi sono piu debole",

      "miglior avversario",

      "peggior avversario",

      "avversario migliore",

      "avversario peggiore",

    ],

    10

  );



  /*

  |--------------------------------------------------------------------------

  | CARRIERA

  |--------------------------------------------------------------------------

  */



  assegna(

    "carriera",

    [

      "carriera",

      "percorso",

      "storico",

      "storia",

      "come sono andato",

      "come e andata",

      "come sto andando",

      "andamento generale",

      "bilancio della mia carriera",

      "analizza le mie statistiche",

      "analizza le mie statistiche generali",

      "statistiche generali",

      "situazione generale",

      "rendimento generale",

    ],

    7

  );



  /*

  |--------------------------------------------------------------------------

  | FORZA

  |--------------------------------------------------------------------------

  */



  assegna(

    "forza",

    [

      "punti di forza",

      "punto di forza",

      "dove sono forte",

      "dove vado meglio",

      "in cosa sono forte",

      "in cosa vado meglio",

      "sono piu forte",

      "sono migliore",

      "dove rendo meglio",

      "in cosa rendo meglio",

      "migliori aspetti",

      "aspetti migliori",

      "qual e il mio punto forte",

      "qual e la mia forza",

    ],

    9

  );



  /*

  |--------------------------------------------------------------------------

  | DEBOLEZZA

  |--------------------------------------------------------------------------

  */



  assegna(

    "debolezza",

    [

      "punti deboli",

      "punto debole",

      "dove vado peggio",

      "dove sono piu debole",

      "in cosa vado peggio",

      "cosa devo migliorare",

      "cosa posso migliorare",

      "difficolta",

      "problema",

      "peggio",

      "debole",

      "aspetti da migliorare",

      "dove rendo peggio",

      "qual e la mia debolezza",

    ],

    9

  );



  /*

  |--------------------------------------------------------------------------

  | RIMONTE PERSONALI

  |--------------------------------------------------------------------------

  */



  assegna(

    "rimonte",

    [

      "rimonte",

      "rimonta",

      "rimonte vinte",

      "rimonte completate",

      "rimonte in carriera",

      "quante volte ho rimontato",

      "quante rimonte ho fatto",

      "quante rimonte ho completato",

      "rimonte nei minuti finali",

      "rimonte negli ultimi minuti",

    ],

    15

  );



  /*

  |--------------------------------------------------------------------------

  | SQUADRA MIGLIORE

  |--------------------------------------------------------------------------

  */



  assegna(

    "squadra_migliore",

    [

      "squadra migliore",

      "miglior squadra",

      "mie migliori squadre",

      "le mie migliori squadre",

      "quali sono le mie migliori squadre",

      "quali sono le squadre con cui vado meglio",

      "quale squadra ho guidato meglio",

      "quali squadre ho guidato meglio",

      "squadra piu forte",

      "con quale squadra vado meglio",

      "con quale squadra rendo meglio",

      "con quale squadra ho fatto meglio",

      "qual e la mia squadra migliore",

      "squadra con cui vado meglio",

      "squadra con cui rendo meglio",

      "squadra con cui ho il rendimento migliore",

      "con quale squadra ho il rendimento migliore",

      "qual e la squadra con cui ho vinto di piu",

      "squadra con cui ho vinto di piu",

    ],

    12

  );



  /*

  |--------------------------------------------------------------------------

  | SQUADRA PIÙ UTILIZZATA

  |--------------------------------------------------------------------------

  */

   assegna(

    "squadra_utilizzata",

    [

      "squadra piu utilizzata",

      "squadra piu usata",

      "squadra che uso di piu",

      "squadra che utilizzo di piu",

      "squadra usata piu volte",

      "squadra piu frequente",

      "squadra che uso maggiormente",

      "squadra che utilizzo maggiormente",

      "quale squadra uso di piu",

      "quale squadra ho usato di piu",

      "quale squadra ho utilizzato di piu",

      "con quale squadra ho giocato piu volte",

    ],

    12

  );



  /*

  |--------------------------------------------------------------------------

  | VIDEOGIOCO MIGLIORE

  |--------------------------------------------------------------------------

  */



  assegna(

    "videogioco_migliore",

    [

      "videogioco migliore",

      "miglior videogioco",

      "gioco migliore",

      "gioco in cui vado meglio",

      "gioco in cui sono piu forte",

      "su quale gioco vado meglio",

      "su quale gioco sono piu forte",

      "videogioco in cui vado meglio",

      "gioco con cui rendo meglio",

      "gioco dove rendo meglio",

      "gioco in cui ho il rendimento migliore",

      "videogioco in cui ho il rendimento migliore",

    ],

    12

  );



  /*

  |--------------------------------------------------------------------------

  | VIDEOGIOCO SPECIFICO

  |--------------------------------------------------------------------------

  |

  | IMPORTANTE:

  | "fifa", "pes" e "fc" NON significano automaticamente

  | "videogioco migliore".

  |--------------------------------------------------------------------------

  */



  assegna(

    "videogioco_specifico",

    [

      "su fifa",

      "su pes",

      "su fc",

      "giocando a fifa",

      "giocando a pes",

      "giocando a fc",

      "in fifa",

      "in pes",

      "in fc",

      "fifa",

      "pes",

      "fc",

    ],

    5

  );



  /*

  |--------------------------------------------------------------------------

  | TORNEI VINTI

  |--------------------------------------------------------------------------

  */



  assegna(

    "tornei_vinti",

    [

      "tornei vinti",

      "tornei ho vinto",

      "quanti tornei ho vinto",

      "quanti tornei ho conquistato",

      "titoli",

      "titoli vinti",

      "trofei",

      "trofei vinti",

      "quanti trofei",

      "quanti titoli",

      "vittorie nei tornei",

      "tornei conquistati",

      "trofei conquistati",

      "campionati vinti",

    ],

    12

  );



  /*

  |--------------------------------------------------------------------------

  | GOL

  |--------------------------------------------------------------------------

  */



  assegna(

    "gol",

    [

      "quanti gol",

      "gol segnati",

      "gol fatti",

      "reti segnate",

      "reti fatte",

      "quanto segno",

      "media gol",

      "media realizzativa",

      "gol subiti",

      "reti subite",

      "differenza reti",

      "quanti ne segno",

      "quanti ne ho segnati",

      "quanti gol ho fatto",

      "quanti gol ho segnato",

    ],

    10

  );



  /*

  |--------------------------------------------------------------------------

  | RECORD

  |--------------------------------------------------------------------------

  */



  assegna(

    "record",

    [

      "record",

      "serie migliore",

      "serie piu lunga",

      "vittorie consecutive",

      "sconfitte consecutive",

      "striscia vincente",

      "striscia negativa",

      "record personale",

      "mio record",

      "i miei record",

    ],

    11

  );



  /*

  |--------------------------------------------------------------------------

  | TORNEI

  |--------------------------------------------------------------------------

  */



  assegna(

    "tornei",

    [

      "tornei disputati",

      "tornei giocati",

      "tornei fatti",

      "miei tornei",

      "torneo migliore",

      "torneo peggiore",

      "quanti tornei",

      "elenco tornei",

      "quali tornei",

      "in quali tornei",

      "tornei a cui ho partecipato",

    ],

    7

  );



  /*

  |--------------------------------------------------------------------------

  | SQUADRE

  |--------------------------------------------------------------------------

  */



  assegna(

    "squadre",

    [

      "mie squadre",

      "tutte le squadre",

      "squadre utilizzate",

      "squadre che ho usato",

      "con quali squadre",

      "quante squadre",

      "elenco squadre",

      "quali squadre",

      "squadre che ho utilizzato",

    ],

    7

  );



  /*

  |--------------------------------------------------------------------------

  | VIDEOGIOCHI

  |--------------------------------------------------------------------------

  */



  assegna(

    "videogiochi",

    [

      "miei videogiochi",

      "videogiochi giocati",

      "giochi giocati",

      "quali videogiochi",

      "quali giochi",

      "quanti videogiochi",

      "elenco videogiochi",

      "su quali giochi",

      "giochi che ho giocato",

    ],

    7

  );



  /*

  |--------------------------------------------------------------------------

  | REGOLA SPECIALE: DOMANDE SUL VIDEOGIOCO SPECIFICO

  |--------------------------------------------------------------------------

  */



  const parlaDiGioco =

    contieneUnoDi(testo, [

      "fifa",

      "pes",

      "fc",

    ]);



  const chiedeMigliore =

    contieneUnoDi(testo, [

      "migliore",

      "miglior",

      "piu forte",

      "vado meglio",

      "rendo meglio",

      "rendimento migliore",

    ]);



  if (

    parlaDiGioco &&

    !chiedeMigliore

  ) {

    punteggi.videogioco_specifico += 15;

  }



  /*

  |--------------------------------------------------------------------------

  | AVVERSARI HANNO PRIORITÀ

  |--------------------------------------------------------------------------

  */



  const punteggioAvversari =

    punteggi.avversari;



  let migliore: IntentoIA =

    "generale";



  let punteggioMigliore = 0;



  for (const [

    intento,

    punteggio,

  ] of Object.entries(

    punteggi

  ) as [IntentoIA, number][]) {

    if (

      punteggio >

      punteggioMigliore

    ) {

      migliore = intento;

      punteggioMigliore =

        punteggio;

    }

  }



  if (

    punteggioAvversari >= 10 &&

    punteggioAvversari >=

      punteggioMigliore

  ) {

    return "avversari";

  }



  return migliore;

}



/*

|--------------------------------------------------------------------------

| OPERAZIONE AVVERSARI

|--------------------------------------------------------------------------

*/



function riconosciOperazioneAvversari(

  domanda: string

): OperazioneAvversari {

  const testo =

    normalizzaTesto(domanda);



  if (

    contieneUnoDi(testo, [

      "chi ho battuto piu volte",

      "chi ho sconfitto piu volte",

      "chi ho battuto di piu",

      "chi ho sconfitto di piu",

      "contro chi ho vinto piu volte",

      "chi ho vinto piu volte",

      "chi ho battuto maggiormente",

    ])

  ) {

    return "piu_vittorie";

  }



  if (

    contieneUnoDi(testo, [

      "chi mi ha battuto piu volte",

      "chi mi ha sconfitto piu volte",

      "chi mi ha battuto di piu",

      "chi mi ha sconfitto di piu",

      "contro chi ho perso piu volte",

      "contro chi perdo di piu",

    ])

  ) {

    return "piu_sconfitte";

  }



  if (

    contieneUnoDi(testo, [

      "contro chi gioco di piu",

      "contro chi ho giocato di piu",

      "contro chi ho giocato piu volte",

      "chi ho affrontato piu volte",

      "chi ho affrontato di piu",

      "avversario affrontato piu volte",

      "chi incontro piu spesso",

    ])

  ) {

    return "piu_partite";

  }



  if (

    contieneUnoDi(testo, [

      "contro chi vado meglio",

      "miglior avversario",

      "avversario migliore",

      "contro chi sono piu forte",

      "contro chi ho il miglior bilancio",

      "contro chi ho il rendimento migliore",

      "contro chi vinco piu facilmente",

    ])

  ) {

    return "migliore";

  }



  if (

    contieneUnoDi(testo, [

      "contro chi vado peggio",

      "peggior avversario",

      "avversario peggiore",

      "contro chi sono piu debole",

      "contro chi ho il peggior bilancio",

      "contro chi ho il rendimento peggiore",

      "contro chi perdo piu facilmente",

    ])

  ) {

    return "peggiore";

  }



  return "generale";

}



/*

|--------------------------------------------------------------------------

| RICERCA AVVERSARIO

|--------------------------------------------------------------------------

*/



function trovaAvversarioNellaDomanda(

  domanda: string,

  avversari: StatisticheAvversarioPartecipante[]

): StatisticheAvversarioPartecipante | null {

  const testo =

    normalizzaTesto(domanda);



  const conNomePartecipante =

    avversari

      .filter(

        (avversario) =>

          avversario.partecipanteId !==

          null

      )

      .sort(

        (a, b) =>

          b.nome.length -

          a.nome.length

      );



  for (const avversario of conNomePartecipante) {

    const nome =

      normalizzaTesto(

        avversario.nome

      );



    if (

      nome.length >= 2 &&

      testo.includes(nome)

    ) {

      return avversario;

    }

  }



  const conSquadra =

    avversari

      .filter(

        (avversario) =>

          Boolean(

            avversario.squadraNome?.trim()

          )

      )

      .sort(

        (a, b) =>

          (b.squadraNome?.length ?? 0) -

          (a.squadraNome?.length ?? 0)

      );



  for (const avversario of conSquadra) {

    const nomeSquadra =

      avversario.squadraNome

        ? normalizzaTesto(

            avversario.squadraNome

          )

        : "";



    if (

      nomeSquadra.length >= 2 &&

      testo.includes(nomeSquadra)

    ) {

      return avversario;

    }

  }



  return null;

}

/*

|--------------------------------------------------------------------------

| SQUADRA MIGLIORE

|--------------------------------------------------------------------------

*/

function trovaSquadraPiuVincente(

  squadre: StatisticheSquadraPartecipante[]

): StatisticheSquadraPartecipante | null {

  return (

    [...squadre]

      .filter(

        (squadra) =>

          squadra.partite > 0

      )

      .sort((a, b) => {

        if (

          b.percentualeVittorie !==

          a.percentualeVittorie

        ) {

          return (

            b.percentualeVittorie -

            a.percentualeVittorie

          );

        }

        if (

          b.vittorie !==

          a.vittorie

        ) {

          return (

            b.vittorie -

            a.vittorie

          );

        }

        return (

          b.partite -

          a.partite

        );

      })[0] ?? null

  );

}



/*

|--------------------------------------------------------------------------

| SQUADRA PIÙ UTILIZZATA

|--------------------------------------------------------------------------

*/

function trovaSquadraPiuUtilizzata(

  squadre: StatisticheSquadraPartecipante[]

): StatisticheSquadraPartecipante | null {

  return (

    [...squadre]

      .filter(

        (squadra) =>

          squadra.partite > 0

      )

      .sort((a, b) => {

        if (

          b.partite !==

          a.partite

        ) {

          return (

            b.partite -

            a.partite

          );

        }

        return (

          b.vittorie -

          a.vittorie

        );

      })[0] ?? null

  );

}



/*

|--------------------------------------------------------------------------

| VIDEOGIOCO MIGLIORE

|--------------------------------------------------------------------------

*/

function trovaVideogiocoMigliore(

  videogiochi: StatisticheVideogiocoPartecipante[]

): StatisticheVideogiocoPartecipante | null {

  return (

    [...videogiochi]

      .filter(

        (gioco) =>

          gioco.partite > 0

      )

      .sort((a, b) => {

        if (

          b.percentualeVittorie !==

          a.percentualeVittorie

        ) {

          return (

            b.percentualeVittorie -

            a.percentualeVittorie

          );

        }

        if (

          b.vittorie !==

          a.vittorie

        ) {

          return (

            b.vittorie -

            a.vittorie

          );

        }

        return (

          b.partite -

          a.partite

        );

      })[0] ?? null

  );

}



/*

|--------------------------------------------------------------------------

| TORNEO MIGLIORE

|--------------------------------------------------------------------------

*/

function trovaTorneoMigliore(

  tornei: StatisticheTorneoPartecipante[]

): StatisticheTorneoPartecipante | null {

  return (

    [...tornei]

      .filter(

        (torneo) =>

          torneo.partite > 0

      )

      .sort((a, b) => {

        if (

          b.percentualeVittorie !==

          a.percentualeVittorie

        ) {

          return (

            b.percentualeVittorie -

            a.percentualeVittorie

          );

        }

        if (

          b.vittorie !==

          a.vittorie

        ) {

          return (

            b.vittorie -

            a.vittorie

          );

        }

        return (

          b.partite -

          a.partite

        );

      })[0] ?? null

  );

}



/*

|--------------------------------------------------------------------------

| TORNEO PEGGIORE

|--------------------------------------------------------------------------

*/

function trovaTorneoPeggiore(

  tornei: StatisticheTorneoPartecipante[]

): StatisticheTorneoPartecipante | null {

  return (

    [...tornei]

      .filter(

        (torneo) =>

          torneo.partite > 0

      )

      .sort((a, b) => {

        if (

          a.percentualeVittorie !==

          b.percentualeVittorie

        ) {

          return (

            a.percentualeVittorie -

            b.percentualeVittorie

          );

        }

        if (

          a.vittorie !==

          b.vittorie

        ) {

          return (

            a.vittorie -

            b.vittorie

          );

        }

        return (

          a.partite -

          b.partite

        );

      })[0] ?? null

  );

}



/*

|--------------------------------------------------------------------------

| AVVERSARIO MIGLIORE

|--------------------------------------------------------------------------

*/

function trovaMigliorAvversario(

  avversari: StatisticheAvversarioPartecipante[]

): StatisticheAvversarioPartecipante {

  return [...avversari].sort(

    (a, b) => {

      const bilancioA =

        a.vittorie -

        a.sconfitte;

      const bilancioB =

        b.vittorie -

        b.sconfitte;

      if (

        bilancioB !==

        bilancioA

      ) {

        return (

          bilancioB -

          bilancioA

        );

      }

      if (

        b.percentualeVittorie !==

        a.percentualeVittorie

      ) {

        return (

          b.percentualeVittorie -

          a.percentualeVittorie

        );

      }

      if (

        b.vittorie !==

        a.vittorie

      ) {

        return (

          b.vittorie -

          a.vittorie

        );

      }

      return (

        b.partite -

        a.partite

      );

    }

  )[0];

}



/*

|--------------------------------------------------------------------------

| AVVERSARIO PEGGIORE

|--------------------------------------------------------------------------

*/

function trovaPeggiorAvversario(

  avversari: StatisticheAvversarioPartecipante[]

): StatisticheAvversarioPartecipante {

  return [...avversari].sort(

    (a, b) => {

      const bilancioA =

        a.vittorie -

        a.sconfitte;

      const bilancioB =

        b.vittorie -

        b.sconfitte;

      if (

        bilancioA !==

        bilancioB

      ) {

        return (

          bilancioA -

          bilancioB

        );

      }

      if (

        a.percentualeVittorie !==

        b.percentualeVittorie

      ) {

        return (

          a.percentualeVittorie -

          b.percentualeVittorie

        );

      }

      if (

        a.sconfitte !==

        b.sconfitte

      ) {

        return (

          b.sconfitte -

          a.sconfitte

        );

      }

      return (

        b.partite -

        a.partite

      );

    }

  )[0];

}



/*

|--------------------------------------------------------------------------

| CARRIERA

|--------------------------------------------------------------------------

*/

function analizzaCarriera(

  statistiche: StatistichePartecipante

): string {

  let risposta =

    `Ecco l'analisi della tua carriera, ${statistiche.nome}.\n\n`;

  risposta +=

    `Hai disputato ${statistiche.torneiDisputati} ${

      statistiche.torneiDisputati === 1

        ? "torneo"

        : "tornei"

    } e conquistato ${statistiche.titoliVinti} ${

      statistiche.titoliVinti === 1

        ? "titolo"

        : "titoli"

    }.\n\n`;

  risposta +=

    `Hai giocato ${statistiche.partite} partite: ${statistiche.vittorie} vittorie, ${statistiche.pareggi} pareggi e ${statistiche.sconfitte} sconfitte.\n\n`;

  risposta +=

    `Hai segnato ${formatNumero(statistiche.golFatti)} gol e ne hai subiti ${formatNumero(statistiche.golSubiti)}, con una differenza reti di ${formatDifferenzaReti(statistiche.differenzaReti)}.\n\n`;

  risposta +=

    `La percentuale complessiva di vittorie è del ${formatPercentuale(statistiche.percentualeVittorie)}.`;

  if (statistiche.partite > 0) {

    risposta +=

      ` In media segni ${formatNumero(statistiche.golPerPartita)} gol e ne subisci ${formatNumero(statistiche.golSubitiPerPartita)} a partita.`;

  }

  if (

    statistiche.serieMassimaVittorie >

    0

  ) {

    risposta +=

      `\n\nLa tua striscia vincente più lunga è di ${statistiche.serieMassimaVittorie} vittorie consecutive.`;

  }

  return risposta;

}



/*

|--------------------------------------------------------------------------

| FORZA

|--------------------------------------------------------------------------

*/

function analizzaForza(

  statistiche: StatistichePartecipante

): string {

  const squadra =

    trovaSquadraPiuVincente(

      statistiche.squadre

    );

  const gioco =

    trovaVideogiocoMigliore(

      statistiche.videogiochi

    );

  const torneo =

    trovaTorneoMigliore(

      statistiche.tornei

    );

  let risposta =

    `Ho analizzato i tuoi dati, ${statistiche.nome}.\n\n`;

  risposta +=

    `A livello generale hai una percentuale di vittorie del ${formatPercentuale(statistiche.percentualeVittorie)} su ${statistiche.partite} partite.`;

      if (squadra) {

    risposta +=

      `\n\nLa squadra con cui hai il rendimento migliore è ${squadra.nome}: ${formatPercentuale(squadra.percentualeVittorie)} di vittorie in ${squadra.partite} partite.`;

  }

  if (gioco) {

    risposta +=

      `\n\nTra i videogiochi registrati, il rendimento migliore è su ${gioco.videogioco}, con ${formatPercentuale(gioco.percentualeVittorie)} di vittorie in ${gioco.partite} partite.`;

  }

  if (torneo) {

    risposta +=

      `\n\nIl torneo con il rendimento migliore è ${torneo.nome} (${torneo.anno}), con ${formatPercentuale(torneo.percentualeVittorie)} di vittorie.`;

  }

  return risposta;

}



/*

|--------------------------------------------------------------------------

| DEBOLEZZA

|--------------------------------------------------------------------------

*/

function analizzaDebolezza(

  statistiche: StatistichePartecipante

): string {

  const squadraPeggiore =

    [...statistiche.squadre]

      .filter(

        (squadra) =>

          squadra.partite > 0

      )

      .sort((a, b) => {

        if (

          a.percentualeVittorie !==

          b.percentualeVittorie

        ) {

          return (

            a.percentualeVittorie -

            b.percentualeVittorie

          );

        }

        return (

          a.partite -

          b.partite

        );

      })[0] ?? null;



  const giocoPeggiore =

    [...statistiche.videogiochi]

      .filter(

        (gioco) =>

          gioco.partite > 0

      )

      .sort((a, b) => {

        if (

          a.percentualeVittorie !==

          b.percentualeVittorie

        ) {

          return (

            a.percentualeVittorie -

            b.percentualeVittorie

          );

        }

        return (

          a.partite -

          b.partite

        );

      })[0] ?? null;



  const torneoPeggiore =

    trovaTorneoPeggiore(

      statistiche.tornei

    );



  let risposta =

    `Guardando i dati disponibili, ${statistiche.nome}, ci sono alcuni aspetti che possono essere migliorati.\n\n`;



  risposta +=

    `Hai perso ${statistiche.sconfitte} partite su ${statistiche.partite} complessive.`;



  if (statistiche.partite > 0) {

    risposta +=

      ` Subisci in media ${formatNumero(statistiche.golSubitiPerPartita)} gol a partita.`;

  }



  if (

    statistiche.serieMassimaSconfitte >

    0

  ) {

    risposta +=

      ` La tua striscia negativa più lunga è stata di ${statistiche.serieMassimaSconfitte} sconfitte consecutive.`;

  }



  if (squadraPeggiore) {

    risposta +=

      `\n\nTra le squadre utilizzate, il rendimento più basso è quello di ${squadraPeggiore.nome}, con ${formatPercentuale(squadraPeggiore.percentualeVittorie)} di vittorie.`;

  }



  if (giocoPeggiore) {

    risposta +=

      `\n\nTra i videogiochi registrati, il rendimento più basso è su ${giocoPeggiore.videogioco}, con ${formatPercentuale(giocoPeggiore.percentualeVittorie)} di vittorie.`;

  }



  if (torneoPeggiore) {

    risposta +=

      `\n\nIl torneo con il rendimento peggiore è ${torneoPeggiore.nome} (${torneoPeggiore.anno}), con ${formatPercentuale(torneoPeggiore.percentualeVittorie)} di vittorie.`;

  }



  return risposta;

}



/*

|--------------------------------------------------------------------------

| RIMONTE PERSONALI

|--------------------------------------------------------------------------

*/

function analizzaRimonte(

  statistiche: StatistichePartecipante,

  domanda: string

): string {

  const testo = normalizzaTesto(domanda);



  const chiedeMinutiFinali = contieneUnoDi(testo, [

    "minuti finali",

    "ultimi minuti",

    "dal 76",

    "dal settantaseiesimo",

    "nel finale",

  ]);



  if (chiedeMinutiFinali) {

    return (

      `${statistiche.nome}, hai completato ${statistiche.rimonteVinteMinutiFinali} ` +

      `rimonte vincenti nei minuti finali.\n\n` +

      "Il conteggio considera le rimonte in cui la tua squadra è passata in vantaggio " +

      "tra il 76° e il 90° minuto, recupero compreso. I supplementari sono esclusi."

    );

  }



  return (

    `${statistiche.nome}, hai completato ${statistiche.rimonteVinte} rimonte vincenti in carriera.\n\n` +

    `Di queste, ${statistiche.rimonteVinteMinutiFinali} sono arrivate nei minuti finali ` +

    "(dal 76° al 90° minuto, recupero compreso; supplementari esclusi)."

  );

}



/*

|--------------------------------------------------------------------------

| SQUADRA MIGLIORE

|--------------------------------------------------------------------------

*/

function analizzaSquadraMigliore(

  statistiche: StatistichePartecipante

): string {

  const squadre =

    [...statistiche.squadre]

      .filter((squadra) => squadra.partite > 0)

      .sort((a, b) => {

        if (b.percentualeVittorie !== a.percentualeVittorie) {

          return b.percentualeVittorie - a.percentualeVittorie;

        }

        if (b.vittorie !== a.vittorie) {

          return b.vittorie - a.vittorie;

        }

        return b.partite - a.partite;

      })

      .slice(0, 5);



  if (squadre.length === 0) {

    return "Non ho ancora abbastanza partite per stabilire quali siano le tue squadre migliori.";

  }



  const elenco = squadre.map((squadra, indice) =>

    `${indice + 1}. ${squadra.nome}: ${formatPercentuale(squadra.percentualeVittorie)} di vittorie ` +

    `(${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi e ${squadra.sconfitte} sconfitte in ${squadra.partite} partite)`

  ).join("\n");



  return (

    `Ecco le tue ${squadre.length === 1 ? "squadra migliore" : "migliori squadre"}, ${statistiche.nome}, ` +

    "ordinate per percentuale di vittorie; a parità di percentuale considero prima le vittorie e poi le partite disputate:\n\n" +

    elenco

  );

}



/*

|--------------------------------------------------------------------------

| SQUADRA PIÙ UTILIZZATA

|--------------------------------------------------------------------------

*/

function analizzaSquadraUtilizzata(

  statistiche: StatistichePartecipante

): string {

  const squadra =

    trovaSquadraPiuUtilizzata(

      statistiche.squadre

    );



  if (!squadra) {

    return "Non ho ancora partite sufficienti per stabilire quale squadra utilizzi di più.";

  }



  return (

    `La squadra che hai utilizzato più spesso è ${squadra.nome}.\n\n` +

    `L'hai utilizzata in ${squadra.partite} partite, ottenendo ${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi e ${squadra.sconfitte} sconfitte.\n\n` +

    `La percentuale di vittorie è del ${formatPercentuale(squadra.percentualeVittorie)}.`

  );

}



/*

|--------------------------------------------------------------------------

| VIDEOGIOCO MIGLIORE

|--------------------------------------------------------------------------

*/

function analizzaVideogioco(

  statistiche: StatistichePartecipante

): string {

  const gioco =

    trovaVideogiocoMigliore(

      statistiche.videogiochi

    );



  if (!gioco) {

    return "Non ho ancora abbastanza dati per confrontare i videogiochi.";

  }



  return (

    `Il videogioco in cui hai il rendimento migliore è ${gioco.videogioco}.\n\n` +

    `Hai giocato ${gioco.partite} partite, con ${gioco.vittorie} vittorie, ${gioco.pareggi} pareggi e ${gioco.sconfitte} sconfitte.\n\n` +

    `La percentuale di vittorie è del ${formatPercentuale(gioco.percentualeVittorie)}.\n\n` +

    `Bilancio reti: ${formatNumero(gioco.golFatti)} gol fatti e ${formatNumero(gioco.golSubiti)} subiti, per una differenza di ${formatDifferenzaReti(gioco.differenzaReti)}.`

  );

}



/*

|--------------------------------------------------------------------------

| VIDEOGIOCO SPECIFICO

|--------------------------------------------------------------------------

*/

function analizzaVideogiocoSpecifico(

  statistiche: StatistichePartecipante,

  domanda: string

): string {

  const testo =

    normalizzaTesto(domanda);



  const gioco =

    statistiche.videogiochi.find(

      (elemento) => {

        const nome =

          normalizzaTesto(

            elemento.videogioco

          );



        return (

          nome.length >= 2 &&

          testo.includes(nome)

        );

      }

    );



  if (!gioco) {

    return (

      "Non ho trovato nei tuoi dati un videogioco corrispondente alla domanda. " +

      "Posso comunque confrontare tutti i videogiochi presenti nel tuo storico."

    );

  }



  return (

    `Per ${gioco.videogioco} hai questi dati:\n\n` +

    `${gioco.partite} partite: ${gioco.vittorie} vittorie, ${gioco.pareggi} pareggi e ${gioco.sconfitte} sconfitte.\n\n` +

    `Percentuale di vittorie: ${formatPercentuale(gioco.percentualeVittorie)}.\n\n` +

    `Gol fatti: ${formatNumero(gioco.golFatti)}.\n` +

    `Gol subiti: ${formatNumero(gioco.golSubiti)}.\n` +

    `Differenza reti: ${formatDifferenzaReti(gioco.differenzaReti)}.`

  );

}



/*

|--------------------------------------------------------------------------

| TORNEI VINTI

|--------------------------------------------------------------------------

*/

function analizzaTorneiVinti(

  statistiche: StatistichePartecipante

): string {

  if (

    statistiche.torneiVinti.length ===

    0

  ) {

    return `${statistiche.nome}, al momento non risultano tornei vinti nel tuo storico.`;

  }



  const elenco =

    statistiche.torneiVinti

      .slice(0, 20)

      .map(

        (torneo) =>

          `• ${torneo.nome} (${torneo.anno})`

      )

      .join("\n");



  return (

    `Hai vinto ${statistiche.titoliVinti} ${

      statistiche.titoliVinti === 1

        ? "torneo"

        : "tornei"

    }.\n\n` +

    `Nel tuo storico risultano:\n${elenco}`

  );

}



/*

|--------------------------------------------------------------------------

| GOL

|--------------------------------------------------------------------------

*/

function analizzaGol(

  statistiche: StatistichePartecipante

): string {

  return (

    `Hai segnato complessivamente ${formatNumero(statistiche.golFatti)} gol in ${statistiche.partite} partite.\n\n` +

    `La tua media realizzativa è di ${formatNumero(statistiche.golPerPartita)} gol a partita.\n\n` +

    `Hai subito ${formatNumero(statistiche.golSubiti)} gol, pari a ${formatNumero(statistiche.golSubitiPerPartita)} gol subiti a partita.\n\n` +

    `La differenza reti complessiva è ${formatDifferenzaReti(statistiche.differenzaReti)}.`

  );

}



/*

|--------------------------------------------------------------------------

| RECORD

|--------------------------------------------------------------------------

*/

function analizzaRecord(

  statistiche: StatistichePartecipante

): string {

  return (

    `I principali record disponibili nella tua carriera sono:\n\n` +

    `🏆 Titoli vinti: ${statistiche.titoliVinti}\n` +

    `🔥 Vittorie consecutive: ${statistiche.serieMassimaVittorie}\n` +

    `📉 Sconfitte consecutive: ${statistiche.serieMassimaSconfitte}\n` +

    `⚽ Gol segnati: ${formatNumero(statistiche.golFatti)}\n` +

    `🎮 Partite disputate: ${statistiche.partite}\n` +

    `📈 Percentuale vittorie: ${formatPercentuale(statistiche.percentualeVittorie)}`

  );

}



/*

|--------------------------------------------------------------------------

| TORNEI

|--------------------------------------------------------------------------

*/

function analizzaTornei(

  statistiche: StatistichePartecipante

): string {

  if (

    statistiche.tornei.length ===

    0

  ) {

    return "Non risultano tornei disponibili nel tuo storico.";

  }



  let risposta =

    `Nel tuo storico risultano ${statistiche.torneiDisputati} tornei.\n\n`;



  const torneoMigliore =

    trovaTorneoMigliore(

      statistiche.tornei

    );



  const torneoPeggiore =

    trovaTorneoPeggiore(

      statistiche.tornei

    );



  if (torneoMigliore) {

    risposta +=

      `🏆 Il rendimento migliore è stato nel torneo "${torneoMigliore.nome}" (${torneoMigliore.anno}), con ${formatPercentuale(torneoMigliore.percentualeVittorie)} di vittorie in ${torneoMigliore.partite} partite.\n\n`;

  }



  if (

    torneoPeggiore &&

    torneoPeggiore.torneoId !==

      torneoMigliore?.torneoId

  ) {

    risposta +=

      `📉 Il rendimento più basso è stato nel torneo "${torneoPeggiore.nome}" (${torneoPeggiore.anno}), con ${formatPercentuale(torneoPeggiore.percentualeVittorie)} di vittorie.`;

  }



  return risposta.trim();

}



/*

|--------------------------------------------------------------------------

| SQUADRE

|--------------------------------------------------------------------------

*/

function analizzaSquadre(

  statistiche: StatistichePartecipante

): string {

  if (

    statistiche.squadre.length ===

    0

  ) {

    return "Non risultano squadre utilizzate nel tuo storico.";

  }



  const ordinate =

    [...statistiche.squadre].sort(

      (a, b) => {

        if (

          b.partite !==

          a.partite

        ) {

          return (

            b.partite -

            a.partite

          );

        }



        return (

          b.vittorie -

          a.vittorie

        );

      }

    );



  const elenco =

    ordinate

      .slice(0, 20)

      .map(

        (squadra) =>

          `• ${squadra.nome}: ${squadra.partite} partite, ${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi, ${squadra.sconfitte} sconfitte (${formatPercentuale(squadra.percentualeVittorie)})`

      )

      .join("\n");



  return (

    `Nel tuo storico risultano ${statistiche.squadre.length} squadre utilizzate.\n\n` +

    elenco

  );

}

/*

|--------------------------------------------------------------------------

| VIDEOGIOCHI

|--------------------------------------------------------------------------

*/

function analizzaVideogiochi(

  statistiche: StatistichePartecipante

): string {

  if (

    statistiche.videogiochi.length ===

    0

  ) {

    return "Non risultano videogiochi disponibili nel tuo storico.";

  }



  const elenco =

    statistiche.videogiochi

      .map(

        (gioco) =>

          `• ${gioco.videogioco}: ${gioco.partite} partite, ${gioco.vittorie} vittorie, ${gioco.pareggi} pareggi, ${gioco.sconfitte} sconfitte (${formatPercentuale(gioco.percentualeVittorie)})`

      )

      .join("\n");



  return (

    `Ho trovato ${statistiche.videogiochi.length} videogiochi nel tuo storico.\n\n` +

    elenco

  );

}



/*

|--------------------------------------------------------------------------

| AVVERSARIO SPECIFICO

|--------------------------------------------------------------------------

*/

function analizzaAvversarioSpecifico(

  avversario: StatisticheAvversarioPartecipante

): string {

  let risposta =

    `Il tuo bilancio contro ${avversario.nome} è questo:\n\n`;



  risposta +=

    `Hai giocato ${avversario.partite} ${

      avversario.partite === 1

        ? "partita"

        : "partite"

    } contro di lui.\n\n`;



  risposta +=

    `Hai ottenuto ${avversario.vittorie} ${

      avversario.vittorie === 1

        ? "vittoria"

        : "vittorie"

    }, ${avversario.pareggi} ${

      avversario.pareggi === 1

        ? "pareggio"

        : "pareggi"

    } e ${avversario.sconfitte} ${

      avversario.sconfitte === 1

        ? "sconfitta"

        : "sconfitte"

    }.\n\n`;



  risposta +=

    `La percentuale di vittorie è del ${formatPercentuale(avversario.percentualeVittorie)}.\n\n`;



  risposta +=

    `Hai segnato ${formatNumero(avversario.golFatti)} gol e ne hai subiti ${formatNumero(avversario.golSubiti)}, con una differenza reti di ${formatDifferenzaReti(avversario.differenzaReti)}.`;



  if (

    avversario.vittorie >

    avversario.sconfitte

  ) {

    risposta +=

      `\n\nIl bilancio degli scontri diretti è favorevole.`;

  } else if (

    avversario.vittorie <

    avversario.sconfitte

  ) {

    risposta +=

      `\n\nIl bilancio degli scontri diretti è negativo.`;

  } else {

    risposta +=

      `\n\nIl bilancio degli scontri diretti è in equilibrio.`;

  }



  if (

    avversario.squadraNome

  ) {

    risposta +=

      `\n\nLa squadra associata negli incontri registrati è ${avversario.squadraNome}.`;

  }



  return risposta;

}



/*

|--------------------------------------------------------------------------

| AVVERSARI

|--------------------------------------------------------------------------

*/

function analizzaAvversari(

  statistiche: StatistichePartecipante,

  domanda: string

): string {

  const avversari =

    statistiche.avversari.filter(

      (avversario) =>

        avversario.partite > 0

    );



  if (avversari.length === 0) {

    return "Non risultano ancora avversari disponibili nel tuo storico.";

  }



  const avversarioSpecifico =

    trovaAvversarioNellaDomanda(

      domanda,

      avversari

    );



  /*

  |----------------------------------------------------------------------

  | PRIMA CERCHIAMO SEMPRE UN AVVERSARIO NOMINATO

  |----------------------------------------------------------------------

  */



  if (avversarioSpecifico) {

    return analizzaAvversarioSpecifico(

      avversarioSpecifico

    );

  }



  const operazione =

    riconosciOperazioneAvversari(

      domanda

    );



  if (

    operazione ===

    "piu_vittorie"

  ) {

    const migliore =

      [...avversari].sort(

        (a, b) =>

          b.vittorie -

          a.vittorie ||

          b.partite -

          a.partite

      )[0];



    return (

      `L'avversario che hai battuto più volte è ${migliore.nome}.\n\n` +

      `Contro di lui hai ottenuto ${migliore.vittorie} vittorie in ${migliore.partite} partite, con ${migliore.pareggi} pareggi e ${migliore.sconfitte} sconfitte.\n\n` +

      `Differenza reti: ${formatDifferenzaReti(migliore.differenzaReti)}.`

    );

  }



  if (

    operazione ===

    "piu_sconfitte"

  ) {

    const peggiore =

      [...avversari].sort(

        (a, b) =>

          b.sconfitte -

          a.sconfitte ||

          b.partite -

          a.partite

      )[0];



    return (

      `L'avversario contro cui hai perso più volte è ${peggiore.nome}.\n\n` +

      `Contro di lui hai subito ${peggiore.sconfitte} sconfitte in ${peggiore.partite} partite, con ${peggiore.vittorie} vittorie e ${peggiore.pareggi} pareggi.\n\n` +

      `Differenza reti: ${formatDifferenzaReti(peggiore.differenzaReti)}.`

    );

  }



  if (

    operazione ===

    "piu_partite"

  ) {

    const piuAffrontato =

      [...avversari].sort(

        (a, b) =>

          b.partite -

          a.partite ||

          b.vittorie -

          a.vittorie

      )[0];



    return (

      `L'avversario che hai affrontato più volte è ${piuAffrontato.nome}.\n\n` +

      `Avete giocato ${piuAffrontato.partite} partite: ${piuAffrontato.vittorie} vittorie per te, ${piuAffrontato.pareggi} pareggi e ${piuAffrontato.sconfitte} sconfitte.\n\n` +

      `Percentuale di vittorie: ${formatPercentuale(piuAffrontato.percentualeVittorie)}.`

    );

  }



  if (

    operazione ===

    "migliore"

  ) {

    const migliore =

      trovaMigliorAvversario(

        avversari

      );



    return (

      `Il tuo miglior rendimento contro un avversario è contro ${migliore.nome}.\n\n` +

      `Hai ottenuto ${migliore.vittorie} vittorie in ${migliore.partite} partite, con ${migliore.pareggi} pareggi e ${migliore.sconfitte} sconfitte.\n\n` +

      `Percentuale di vittorie: ${formatPercentuale(migliore.percentualeVittorie)}.\n\n` +

      `Differenza reti: ${formatDifferenzaReti(migliore.differenzaReti)}.`

    );

  }



  if (

    operazione ===

    "peggiore"

  ) {

    const peggiore =

      trovaPeggiorAvversario(

        avversari

      );



    return (

      `Il tuo peggior rendimento è contro ${peggiore.nome}.\n\n` +

      `Hai ottenuto ${peggiore.vittorie} vittorie in ${peggiore.partite} partite, con ${peggiore.pareggi} pareggi e ${peggiore.sconfitte} sconfitte.\n\n` +

      `Percentuale di vittorie: ${formatPercentuale(peggiore.percentualeVittorie)}.\n\n` +

      `Differenza reti: ${formatDifferenzaReti(peggiore.differenzaReti)}.`

    );

  }



  const ordinati =

    [...avversari].sort(

      (a, b) =>

        b.partite -

        a.partite ||

        b.vittorie -

        a.vittorie

    );



  const elenco =

    ordinati

      .slice(0, 20)

      .map(

        (avversario) =>

          `• ${avversario.nome}: ${avversario.partite} partite, ${avversario.vittorie} vittorie, ${avversario.pareggi} pareggi, ${avversario.sconfitte} sconfitte (${formatPercentuale(avversario.percentualeVittorie)})`

      )

      .join("\n");



  return (

    `Ho trovato ${avversari.length} avversari nel tuo storico.\n\n` +

    `I principali sono:\n${elenco}`

  );

}



/*

|--------------------------------------------------------------------------

| GENERALE

|--------------------------------------------------------------------------

*/

function analizzaGenerale(

  statistiche: StatistichePartecipante

): string {

  const squadra =

    trovaSquadraPiuVincente(

      statistiche.squadre

    );



  const gioco =

    trovaVideogiocoMigliore(

      statistiche.videogiochi

    );



  let risposta =

    `Ho analizzato la carriera di ${statistiche.nome}.\n\n`;



  risposta +=

    `Hai disputato ${statistiche.torneiDisputati} tornei e ${statistiche.partite} partite.\n\n`;



  risposta +=

    `Il bilancio è di ${statistiche.vittorie} vittorie, ${statistiche.pareggi} pareggi e ${statistiche.sconfitte} sconfitte, con una percentuale di vittorie del ${formatPercentuale(statistiche.percentualeVittorie)}.\n\n`;



  risposta +=

    `Hai segnato ${formatNumero(statistiche.golFatti)} gol e ne hai subiti ${formatNumero(statistiche.golSubiti)}, con una differenza reti di ${formatDifferenzaReti(statistiche.differenzaReti)}.`;



  if (squadra) {

    risposta +=

      `\n\nLa squadra con il rendimento migliore è ${squadra.nome}.`;

  }



  if (gioco) {

    risposta +=

      ` Il videogioco con il rendimento migliore è ${gioco.videogioco}.`;

  }



  return risposta;

}



/*

|--------------------------------------------------------------------------

| MOTORE IA

|--------------------------------------------------------------------------

*/

function eseguiMotoreIA(

  statistiche: StatistichePartecipante,

  domanda: string

): string {

  const intento =

    riconosciIntento(domanda);



  console.log(

    "[PazziTournament AI]",

    {

      domanda,

      intento,

    }

  );



  switch (intento) {

    case "carriera":

      return analizzaCarriera(

        statistiche

      );



    case "forza":

      return analizzaForza(

        statistiche

      );



    case "debolezza":

      return analizzaDebolezza(

        statistiche

      );



    case "squadra_migliore":

      return analizzaSquadraMigliore(

        statistiche

      );



    case "squadra_utilizzata":

      return analizzaSquadraUtilizzata(

        statistiche

      );



    case "videogioco_migliore":

      return analizzaVideogioco(

        statistiche

      );



    case "videogioco_specifico":

      return analizzaVideogiocoSpecifico(

        statistiche,

        domanda

      );



    case "tornei_vinti":

      return analizzaTorneiVinti(

        statistiche

      );



    case "gol":

      return analizzaGol(

        statistiche

      );



    case "record":

      return analizzaRecord(

        statistiche

      );



    case "tornei":

      return analizzaTornei(

        statistiche

      );



    case "squadre":

      return analizzaSquadre(

        statistiche

      );



    case "videogiochi":

      return analizzaVideogiochi(

        statistiche

      );



    case "avversari":

      return analizzaAvversari(

        statistiche,

        domanda

      );



    case "rimonte":

      return analizzaRimonte(

        statistiche,

        domanda

      );



    case "generale":

    default:

      return analizzaGenerale(

        statistiche

      );

  }

}



function eDomandaPersonaleSpecifiche(domanda: string): boolean {

  const testo = normalizzaTesto(domanda);



  const riferimentoPersonale = /(^|\s)(io|mio|mia|mie|miei|ho|per me|la mia|le mie)(\s|$)/.test(testo);



  const domandaRimonte =

    contieneUnoDi(testo, ["rimonta", "rimonte"]);



  const domandaSquadre =

    contieneUnoDi(testo, ["squadra", "squadre"]);



  const frasePersonaleSquadra =

    contieneUnoDi(testo, [

      "ho guidato",

      "ho utilizzato",

      "ho usato",

      "con cui vado meglio",

      "con cui rendo meglio",

    ]);



  return (

    (domandaRimonte && (riferimentoPersonale || testo.includes("in carriera"))) ||

    (domandaSquadre && (riferimentoPersonale || frasePersonaleSquadra))

  );

}



function eDomandaSoloIdentita(

  domanda: string,

  nomePartecipante: string

): boolean {

  const testo = normalizzaTesto(domanda);

  const nome = normalizzaTesto(nomePartecipante);



  return [

    nome,

    `sono ${nome}`,

    `io sono ${nome}`,

    `mi chiamo ${nome}`,

    `il mio nome e ${nome}`,

  ].includes(testo);

}



/*

|--------------------------------------------------------------------------

| POST

|--------------------------------------------------------------------------

*/

export async function POST(request: Request) {

  try {

    const dimensioneMassima = 8192;
    const contenuto = await request.text();
    if (contenuto.length > dimensioneMassima) {
      return NextResponse.json({ errore: "Richiesta troppo lunga." }, { status: 413 });
    }

    let dati: unknown;
    try {
      dati = JSON.parse(contenuto);
    } catch {
      return NextResponse.json({ errore: "JSON non valido." }, { status: 400 });
    }

    if (!dati || typeof dati !== "object" || Array.isArray(dati)) {
      return NextResponse.json({ errore: "Formato della richiesta non valido." }, { status: 400 });
    }

    const body = dati as Record<string, unknown>;
    if (
      (body.domanda != null && typeof body.domanda !== "string") ||
      (body.nomeIdentita != null && typeof body.nomeIdentita !== "string")
    ) {
      return NextResponse.json({ errore: "I campi devono essere stringhe." }, { status: 400 });
    }

    const domanda = (body.domanda as string | undefined)?.trim() ?? "";
    const nomeIdentita = (body.nomeIdentita as string | undefined)?.trim() ?? "";
    if (domanda.length > 1000 || nomeIdentita.length > 120) {
      return NextResponse.json({ errore: "Testo troppo lungo." }, { status: 400 });
    }



    // L'autenticazione è facoltativa per le consultazioni statistiche.

    // Se esiste una sessione valida, la usiamo solo per identificare

    // l'eventuale partecipante personale dell'utente.

    let user: { id: string; email?: string | null } | null = null;



    try {

      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase.auth.getUser();



      if (!error && data.user) {

        user = { id: data.user.id, email: data.user.email };

      }

    } catch {

      // Nessuna sessione: la consultazione pubblica continua senza identità.

    }



    const { prisma } = await import("@/lib/prisma");

    const profiloSessione = user
      ? await prisma.profilo.findUnique({
          where: { supabaseId: user.id },
          select: { ruolo: true, partecipanteId: true },
        })
      : null;
    const amministratore = profiloSessione?.ruolo === "ADMIN";



    // Le domande globali non dipendono da login né da un partecipante.

    if (

      domanda &&

      !eDomandaPersonaleSpecifiche(domanda) &&

      eDomandaGlobale(domanda)

    ) {

      const risposta = await rispondiDomandaGlobale(domanda);



      return NextResponse.json({

        risposta,

        autenticato: Boolean(user),

        amministratore,

        richiedeIdentita: false,

        tipo: "globale",

      });

    }



    // Prima scelta: partecipante nominato esplicitamente nella domanda.

    let partecipante = domanda

      ? await trovaPartecipanteNellaDomanda(prisma, domanda)

      : null;



    // Seconda scelta: identità conservata dal client durante la chat.

    // Il nome viene comunque verificato sul database.



    if (!partecipante && nomeIdentita) {

      partecipante = await trovaPartecipantePerNome(

        prisma,

        nomeIdentita

      );

    }



    // Terza scelta: se non è stato nominato nessuno e non è stata

    // conservata un'identità, usa il partecipante collegato alla sessione.

    // Gli ospiti non devono autenticarsi.

    if (!partecipante && user) {

      const profilo = await prisma.profilo.findUnique({

        where: { supabaseId: user.id },

        select: { partecipanteId: true, nome: true },

      });



      if (profilo?.partecipanteId) {

        partecipante = await prisma.partecipante.findUnique({

          where: { id: profilo.partecipanteId },

          select: { id: true, nome: true },

        });

      }

    }



    // Se non è stato specificato un partecipante e non esiste un profilo

    // associato, chiediamo quale persona analizzare, non chi sia l'utente.

    if (!partecipante) {

      return NextResponse.json({

        risposta: "Dimmi il nome del partecipante di cui vuoi analizzare le statistiche. Puoi anche scrivere una domanda come: «Qual è la carriera di Mario Rossi?».",

        autenticato: Boolean(user),

        amministratore,

        richiedeIdentita: false,

        richiedePartecipante: true,

        tipo: "chiarimento",

      });

    }



    if (

      domanda &&

      eDomandaSoloIdentita(domanda, partecipante.nome)

    ) {

      return NextResponse.json({

        risposta: `Perfetto, ho identificato ${partecipante.nome}. Continuerò a usare le sue statistiche per le prossime domande di questa chat.`,

        autenticato: Boolean(user),

        amministratore,

        richiedeIdentita: false,

        partecipante,

        tipo: "personale",

      });

    }



    const statistiche = await getStatistichePartecipante(partecipante.id);



    if (!statistiche) {

      return NextResponse.json(

        { errore: `Non sono riuscito a recuperare le statistiche di ${partecipante.nome}.` },

        { status: 404 }

      );

    }



    if (!domanda) {

      return NextResponse.json({

        risposta: `Cosa vuoi sapere su ${statistiche.nome}?`,

        autenticato: Boolean(user),

        amministratore,

        richiedeIdentita: false,

        partecipante: { id: statistiche.partecipanteId, nome: statistiche.nome },

        tipo: "personale",

      });

    }



    // Tutte le funzioni statistiche esistenti restano nel motore interno.

    const risposta = eseguiMotoreIA(statistiche, domanda);



    return NextResponse.json({

      risposta,

      autenticato: Boolean(user),

      amministratore,

      richiedeIdentita: false,

      partecipante: { id: statistiche.partecipanteId, nome: statistiche.nome },

      tipo: "personale",

    });

  } catch (error) {

    console.error("Errore PazziTournament AI:", error);



    return NextResponse.json(

      { errore: "Si è verificato un errore durante l'analisi delle statistiche." },

      { status: 500 }

    );

  }

}