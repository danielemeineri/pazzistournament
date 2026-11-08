import {
  comprendiDomanda,
  type IntentoIA,
} from "@/lib/ia/comprensione";

import type {
  StatistichePartecipante,
  StatisticheSquadraPartecipante,
  StatisticheTorneoPartecipante,
  StatisticheVideogiocoPartecipante,
  StatisticheAvversarioPartecipante,
} from "@/lib/statistiche/partecipante";

/*
|--------------------------------------------------------------------------
| PAZZITOURNAMENT AI
|--------------------------------------------------------------------------
| MOTORE DI RISPOSTA
|--------------------------------------------------------------------------
|
| Questo file rappresenta il cuore della IA statistica interna.
|
| NON utilizza:
|
| - OpenAI
| - ChatGPT API
| - Gemini
| - Claude
| - API AI esterne
|
| Utilizza esclusivamente:
|
| - domanda dell'utente
| - comprensione della domanda
| - statistiche reali del database
|
|--------------------------------------------------------------------------
*/

export type RisultatoMotoreIA = {
  risposta: string;
  intento: IntentoIA;
  confidenza: number;
};

/*
|--------------------------------------------------------------------------
| FORMATTAZIONE
|--------------------------------------------------------------------------
*/

function percentuale(
  valore: number
): string {
  return `${valore.toFixed(1)}%`;
}

function segno(
  valore: number
): string {
  if (valore > 0) {
    return `+${valore}`;
  }

  return `${valore}`;
}

/*
|--------------------------------------------------------------------------
| RISULTATO GENERICO
|--------------------------------------------------------------------------
*/

function descrizioneBilancio(
  statistiche: StatistichePartecipante
): string {
  const {
    partite,
    vittorie,
    pareggi,
    sconfitte,
    golFatti,
    golSubiti,
    differenzaReti,
    percentualeVittorie,
  } = statistiche;

  if (partite === 0) {
    return `Non hai ancora partite completate disponibili nelle statistiche.`;
  }

  return [
    `Hai disputato ${partite} partite.`,
    `Il tuo bilancio è di ${vittorie} vittorie, ${pareggi} pareggi e ${sconfitte} sconfitte.`,
    `Hai segnato ${golFatti} gol e ne hai subiti ${golSubiti}, con una differenza reti di ${segno(differenzaReti)}.`,
    `La tua percentuale di vittorie è del ${percentuale(percentualeVittorie)}.`,
  ].join(" ");
}

/*
|--------------------------------------------------------------------------
| STATISTICHE GENERALI
|--------------------------------------------------------------------------
*/

function analizzaStatisticheGenerali(
  statistiche: StatistichePartecipante
): string {
  if (statistiche.partite === 0) {
    return `Al momento non ci sono partite completate sufficienti per analizzare le tue statistiche.`;
  }

  const rendimento =
    statistiche.percentualeVittorie >= 60
      ? "molto positivo"
      : statistiche.percentualeVittorie >= 50
        ? "positivo"
        : statistiche.percentualeVittorie >= 40
          ? "equilibrato"
          : "da migliorare";

  return [
    `Ecco la tua situazione attuale, ${statistiche.nome}.`,
    ``,
    descrizioneBilancio(statistiche),
    ``,
    `Il rendimento complessivo è ${rendimento}.`,
    `Segni in media ${statistiche.golPerPartita.toFixed(2)} gol a partita e ne subisci ${statistiche.golSubitiPerPartita.toFixed(2)}.`,
    `Hai vinto ${statistiche.titoliVinti} ${statistiche.titoliVinti === 1 ? "titolo" : "titoli"} in ${statistiche.torneiDisputati} ${statistiche.torneiDisputati === 1 ? "torneo" : "tornei"}.`,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| PUNTI DI FORZA
|--------------------------------------------------------------------------
*/

function analizzaPuntiDiForza(
  statistiche: StatistichePartecipante
): string {
  if (statistiche.partite === 0) {
    return `Non ho ancora abbastanza partite completate per individuare i tuoi punti di forza.`;
  }

  const punti: string[] = [];

  if (statistiche.percentualeVittorie >= 60) {
    punti.push(
      `la capacità di vincere le partite (${percentuale(statistiche.percentualeVittorie)} di vittorie)`
    );
  } else if (statistiche.percentualeVittorie >= 50) {
    punti.push(
      `un rendimento positivo nelle vittorie (${percentuale(statistiche.percentualeVittorie)})`
    );
  }

  if (
    statistiche.golPerPartita >= 2
  ) {
    punti.push(
      `la fase offensiva, con ${statistiche.golPerPartita.toFixed(2)} gol segnati a partita`
    );
  }

  if (
    statistiche.golSubitiPerPartita < 1
  ) {
    punti.push(
      `la fase difensiva, con soltanto ${statistiche.golSubitiPerPartita.toFixed(2)} gol subiti a partita`
    );
  }

  if (
    statistiche.serieMassimaVittorie >= 4
  ) {
    punti.push(
      `la capacità di costruire serie positive, con una striscia massima di ${statistiche.serieMassimaVittorie} vittorie consecutive`
    );
  }

  const squadra =
    statistiche.migliorSquadra;

  if (squadra) {
    punti.push(
      `il rendimento con ${squadra.nome}, con il ${percentuale(squadra.percentualeVittorie)} di vittorie`
    );
  }

  const gioco =
    statistiche.migliorVideogioco;

  if (gioco) {
    punti.push(
      `il rendimento in ${gioco.videogioco}, dove hai il ${percentuale(gioco.percentualeVittorie)} di vittorie`
    );
  }

  if (punti.length === 0) {
    return [
      `Il tuo rendimento è abbastanza equilibrato.`,
      ``,
      descrizioneBilancio(statistiche),
    ].join("\n");
  }

  return [
    `Ho analizzato i tuoi dati, ${statistiche.nome}.`,
    ``,
    `I tuoi principali punti di forza sono:`,
    ...punti.map(
      (punto) => `• ${punto}`
    ),
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| PUNTI DEBOLI
|--------------------------------------------------------------------------
*/

function analizzaPuntiDeboli(
  statistiche: StatistichePartecipante
): string {
  if (statistiche.partite === 0) {
    return `Non ho ancora abbastanza partite completate per individuare i tuoi punti deboli.`;
  }

  const punti: string[] = [];

  if (
    statistiche.percentualeVittorie < 50
  ) {
    punti.push(
      `la percentuale di vittorie, attualmente al ${percentuale(statistiche.percentualeVittorie)}`
    );
  }

  if (
    statistiche.golSubitiPerPartita >= 2
  ) {
    punti.push(
      `la fase difensiva, con ${statistiche.golSubitiPerPartita.toFixed(2)} gol subiti a partita`
    );
  }

  if (
    statistiche.golPerPartita < 1
  ) {
    punti.push(
      `la fase offensiva, con ${statistiche.golPerPartita.toFixed(2)} gol segnati a partita`
    );
  }

  if (
    statistiche.serieMassimaSconfitte >= 3
  ) {
    punti.push(
      `la gestione dei periodi negativi, con una serie massima di ${statistiche.serieMassimaSconfitte} sconfitte consecutive`
    );
  }

  if (punti.length === 0) {
    return [
      `Non emerge un punto debole particolarmente evidente dai dati attuali.`,
      ``,
      `Il tuo rendimento complessivo è abbastanza equilibrato.`,
    ].join("\n");
  }

  return [
    `Analizzando i dati di ${statistiche.nome}, gli aspetti che puoi migliorare maggiormente sono:`,
    ``,
    ...punti.map(
      (punto) => `• ${punto}`
    ),
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| SQUADRE
|--------------------------------------------------------------------------
*/

function analizzaSquadre(
  statistiche: StatistichePartecipante
): string {
  if (statistiche.squadre.length === 0) {
    return `Non risultano ancora squadre utilizzate in partite completate.`;
  }

  const righe =
    statistiche.squadre
      .slice(0, 8)
      .map(
        (squadra) =>
          `• ${squadra.nome}: ${squadra.partite} partite, ${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi, ${squadra.sconfitte} sconfitte, ${percentuale(squadra.percentualeVittorie)} vittorie`
      );

  return [
    `Queste sono le squadre con cui hai giocato:`,
    ``,
    ...righe,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| MIGLIOR SQUADRA
|--------------------------------------------------------------------------
*/

function analizzaMigliorSquadra(
  statistica: StatistichePartecipante
): string {
  const squadra =
    statistica.migliorSquadra;

  if (!squadra) {
    return `Non ho abbastanza dati per determinare la tua miglior squadra.`;
  }

  return [
    `La tua miglior squadra attualmente è ${squadra.nome}.`,
    ``,
    `Con questa squadra hai disputato ${squadra.partite} partite: ${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi e ${squadra.sconfitte} sconfitte.`,
    `La percentuale di vittorie è del ${percentuale(squadra.percentualeVittorie)}.`,
    `Hai segnato ${squadra.golFatti} gol e ne hai subiti ${squadra.golSubiti}.`,
    squadra.titoli > 0
      ? `Con ${squadra.nome} hai inoltre vinto ${squadra.titoli} ${squadra.titoli === 1 ? "titolo" : "titoli"}.`
      : `Non risultano titoli vinti con questa squadra.`,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| SQUADRA PIÙ UTILIZZATA
|--------------------------------------------------------------------------
*/

function analizzaSquadraPiuUtilizzata(
  statistiche: StatistichePartecipante
): string {
  const squadra =
    statistiche.squadraPiuUtilizzata;

  if (!squadra) {
    return `Non risultano ancora squadre utilizzate in partite completate.`;
  }

  return [
    `La squadra che hai utilizzato di più è ${squadra.nome}.`,
    ``,
    `Hai giocato ${squadra.partite} partite con questa squadra, ottenendo ${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi e ${squadra.sconfitte} sconfitte.`,
    `La percentuale di vittorie è del ${percentuale(squadra.percentualeVittorie)}.`,
  ].join("\n");
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
    statistiche.videogiochi.length === 0
  ) {
    return `Non risultano ancora statistiche associate ai videogiochi.`;
  }

  const righe =
    statistiche.videogiochi
      .slice(0, 8)
      .map(
        (gioco) =>
          `• ${gioco.videogioco}: ${gioco.partite} partite, ${gioco.vittorie} vittorie, ${gioco.pareggi} pareggi, ${gioco.sconfitte} sconfitte, ${percentuale(gioco.percentualeVittorie)} vittorie`
      );

  return [
    `Ecco il tuo rendimento nei videogiochi:`,
    ``,
    ...righe,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| MIGLIOR VIDEOGIOCO
|--------------------------------------------------------------------------
*/

function analizzaMigliorVideogioco(
  statistiche: StatistichePartecipante
): string {
  const gioco =
    statistiche.migliorVideogioco;

  if (!gioco) {
    return `Non ho abbastanza dati per determinare il videogioco in cui hai il rendimento migliore.`;
  }

  return [
    `Il videogioco in cui hai il rendimento migliore è ${gioco.videogioco}.`,
    ``,
    `Hai disputato ${gioco.partite} partite, vincendone ${gioco.vittorie}.`,
    `La tua percentuale di vittorie è del ${percentuale(gioco.percentualeVittorie)}.`,
    `Hai segnato ${gioco.golFatti} gol e ne hai subiti ${gioco.golSubiti}.`,
  ].join("\n");
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
    statistiche.tornei.length === 0
  ) {
    return `Non risultano ancora tornei disputati.`;
  }

  const righe =
    statistiche.tornei
      .slice(0, 10)
      .map(
        (torneo) =>
          `• ${torneo.nome} (${torneo.anno}): ${torneo.partite} partite, ${torneo.vittorie} vittorie, ${torneo.pareggi} pareggi, ${torneo.sconfitte} sconfitte${torneo.titolo ? " 🏆" : ""}`
      );

  return [
    `Hai disputato ${statistiche.torneiDisputati} ${statistiche.torneiDisputati === 1 ? "torneo" : "tornei"} e ne hai vinti ${statistiche.titoliVinti}.`,
    ``,
    ...righe,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| TITOLI
|--------------------------------------------------------------------------
*/

function analizzaTitoli(
  statistiche: StatistichePartecipante
): string {
  if (
    statistiche.titoliVinti === 0
  ) {
    return [
      `${statistiche.nome}, al momento non risultano titoli vinti.`,
      ``,
      `Hai comunque disputato ${statistiche.torneiDisputati} ${statistiche.torneiDisputati === 1 ? "torneo" : "tornei"}.`,
    ].join("\n");
  }

  const elenco =
    statistiche.torneiVinti
      .map(
        (torneo) =>
          `• ${torneo.nome} (${torneo.anno})`
      );

  return [
    `${statistiche.nome}, hai vinto ${statistiche.titoliVinti} ${statistiche.titoliVinti === 1 ? "titolo" : "titoli"}.`,
    ``,
    ...elenco,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| CARRIERA
|--------------------------------------------------------------------------
*/

function analizzaCarriera(
  statistiche: StatistichePartecipante
): string {
  return [
    `Ecco il riepilogo della carriera di ${statistiche.nome}.`,
    ``,
    `🏆 Tornei disputati: ${statistiche.torneiDisputati}`,
    `🏆 Titoli vinti: ${statistiche.titoliVinti}`,
    ``,
    `⚽ Partite: ${statistiche.partite}`,
    `✅ Vittorie: ${statistiche.vittorie}`,
    `🤝 Pareggi: ${statistiche.pareggi}`,
    `❌ Sconfitte: ${statistiche.sconfitte}`,
    ``,
    `⚽ Gol fatti: ${statistiche.golFatti}`,
    `🛡️ Gol subiti: ${statistiche.golSubiti}`,
    `📈 Differenza reti: ${segno(statistiche.differenzaReti)}`,
    ``,
    `📊 Percentuale vittorie: ${percentuale(statistiche.percentualeVittorie)}`,
    `⚽ Gol per partita: ${statistiche.golPerPartita.toFixed(2)}`,
    `🛡️ Gol subiti per partita: ${statistiche.golSubitiPerPartita.toFixed(2)}`,
    ``,
    `🔥 Serie massima di vittorie: ${statistiche.serieMassimaVittorie}`,
    `📉 Serie massima di sconfitte: ${statistiche.serieMassimaSconfitte}`,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| AVVERSARI
|--------------------------------------------------------------------------
*/

function analizzaAvversari(
  statistiche: StatistichePartecipante
): string {
  if (
    statistiche.avversari.length === 0
  ) {
    return `Non risultano ancora avversari identificabili nelle partite completate.`;
  }

  const righe =
    statistiche.avversari
      .slice(0, 10)
      .map(
        (avversario) =>
          `• ${avversario.nome}: ${avversario.partite} partite, ${avversario.vittorie} vittorie, ${avversario.pareggi} pareggi, ${avversario.sconfitte} sconfitte, ${percentuale(avversario.percentualeVittorie)} vittorie`
      );

  return [
    `Ecco i tuoi principali avversari:`,
    ``,
    ...righe,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| MIGLIOR AVVERSARIO
|--------------------------------------------------------------------------
*/

function analizzaMigliorAvversario(
  statistiche: StatistichePartecipante
): string {
  const avversari =
    statistiche.avversari.filter(
      (avversario) =>
        avversario.partite > 0
    );

  if (avversari.length === 0) {
    return `Non ho abbastanza dati per determinare contro quale avversario hai il rendimento migliore.`;
  }

  const migliore =
    [...avversari].sort(
      (a, b) => {
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

  return [
    `L'avversario contro cui hai il rendimento migliore è ${migliore.nome}.`,
    ``,
    `Lo hai affrontato ${migliore.partite} ${migliore.partite === 1 ? "volta" : "volte"}.`,
    `Hai ottenuto ${migliore.vittorie} vittorie, ${migliore.pareggi} pareggi e ${migliore.sconfitte} sconfitte.`,
    `La percentuale di vittorie contro di lui è del ${percentuale(migliore.percentualeVittorie)}.`,
    `La differenza reti è ${segno(migliore.differenzaReti)}.`,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| RECORD
|--------------------------------------------------------------------------
*/

function analizzaRecord(
  statistiche: StatistichePartecipante
): string {
  const squadra =
    statistiche.migliorSquadra;

  const gioco =
    statistiche.migliorVideogioco;

  return [
    `Ecco alcuni dei tuoi record statistici:`,
    ``,
    `🔥 Serie massima di vittorie: ${statistiche.serieMassimaVittorie}`,
    `📉 Serie massima di sconfitte: ${statistiche.serieMassimaSconfitte}`,
    `⚽ Gol segnati: ${statistiche.golFatti}`,
    `🛡️ Gol subiti: ${statistiche.golSubiti}`,
    `📈 Differenza reti: ${segno(statistiche.differenzaReti)}`,
    ``,
    squadra
      ? `⭐ Miglior squadra: ${squadra.nome} (${percentuale(squadra.percentualeVittorie)} vittorie)`
      : "",
    gioco
      ? `🎮 Miglior videogioco: ${gioco.videogioco} (${percentuale(gioco.percentualeVittorie)} vittorie)`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/*
|--------------------------------------------------------------------------
| SERIE
|--------------------------------------------------------------------------
*/

function analizzaSerieVittorie(
  statistiche: StatistichePartecipante
): string {
  return `La tua serie massima di vittorie consecutive è di ${statistiche.serieMassimaVittorie} partite.`;
}

function analizzaSerieSconfitte(
  statistiche: StatistichePartecipante
): string {
  return `La tua serie massima di sconfitte consecutive è di ${statistiche.serieMassimaSconfitte} partite.`;
}

/*
|--------------------------------------------------------------------------
| FALLBACK
|--------------------------------------------------------------------------
*/

function rispostaSconosciuta(
  statistiche: StatistichePartecipante
): string {
  return [
    `Posso analizzare le tue statistiche, ${statistiche.nome}.`,
    ``,
    `Puoi chiedermi, ad esempio:`,
    `• quali sono i miei punti di forza`,
    `• qual è la mia miglior squadra`,
    `• in quale videogioco vado meglio`,
    `• quanti tornei ho vinto`,
    `• contro chi ho il rendimento migliore`,
    `• quali sono i miei record`,
    `• analizza la mia carriera`,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| CONFRONTO
|--------------------------------------------------------------------------
|
| Per ora il confronto viene riconosciuto come intento.
| L'analisi specifica dei due soggetti verrà aggiunta nel passaggio
| successivo, quando introdurremo l'estrazione dei nomi dalla domanda.
|
|--------------------------------------------------------------------------
*/

function analizzaConfronto(
  statistiche: StatistichePartecipante
): string {
  return [
    `Posso effettuare confronti statistici, ma devo ancora identificare automaticamente i due soggetti nella domanda.`,
    ``,
    `Per ora posso analizzare direttamente la tua carriera, le tue squadre, i tuoi videogiochi, i tuoi tornei e i tuoi avversari.`,
  ].join("\n");
}

/*
|--------------------------------------------------------------------------
| MOTORE PRINCIPALE
|--------------------------------------------------------------------------
*/

export function generaRispostaIA(
  domanda: string,
  statistiche: StatistichePartecipante
): RisultatoMotoreIA {
  const comprensione =
    comprendiDomanda(domanda);

  let risposta: string;

  switch (comprensione.intento) {
    case "statistiche_generali":
      risposta =
        analizzaStatisticheGenerali(
          statistiche
        );
      break;

    case "punti_forza":
      risposta =
        analizzaPuntiDiForza(
          statistiche
        );
      break;

    case "punti_deboli":
      risposta =
        analizzaPuntiDeboli(
          statistiche
        );
      break;

    case "carriera":
      risposta =
        analizzaCarriera(
          statistiche
        );
      break;

    case "squadre":
      risposta =
        analizzaSquadre(
          statistiche
        );
      break;

    case "miglior_squadra":
      risposta =
        analizzaMigliorSquadra(
          statistiche
        );
      break;

    case "squadra_piu_utilizzata":
      risposta =
        analizzaSquadraPiuUtilizzata(
          statistiche
        );
      break;

    case "videogiochi":
      risposta =
        analizzaVideogiochi(
          statistiche
        );
      break;

    case "miglior_videogioco":
      risposta =
        analizzaMigliorVideogioco(
          statistiche
        );
      break;

    case "tornei":
      risposta =
        analizzaTornei(
          statistiche
        );
      break;

    case "titoli":
      risposta =
        analizzaTitoli(
          statistiche
        );
      break;

    case "avversari":
      risposta =
        analizzaAvversari(
          statistiche
        );
      break;

    case "miglior_avversario":
      risposta =
        analizzaMigliorAvversario(
          statistiche
        );
      break;

    case "record":
      risposta =
        analizzaRecord(
          statistiche
        );
      break;

    case "serie_vittorie":
      risposta =
        analizzaSerieVittorie(
          statistiche
        );
      break;

    case "serie_sconfitte":
      risposta =
        analizzaSerieSconfitte(
          statistiche
        );
      break;

    case "confronto":
      risposta =
        analizzaConfronto(
          statistiche
        );
      break;

    case "sconosciuto":
    default:
      risposta =
        rispostaSconosciuta(
          statistiche
        );
      break;
  }

  return {
    risposta,
    intento: comprensione.intento,
    confidenza: comprensione.confidenza,
  };
}