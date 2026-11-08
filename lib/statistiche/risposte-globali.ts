import {
  getClassificaAllenatoriGlobale,
  getClassificaGolMinutiFinaliAllenatoriGlobale,
  getClassificaRimonteAllenatoriGlobale,
  getClassificaRimonteMinutiFinaliAllenatoriGlobale,
  getStatisticheGlobali,
} from "@/lib/statistiche/globali";

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

function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[?!.,;:(){}[\]"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contieneUnoDi(testo: string, parole: string[]): boolean {
  return parole.some((parola) => testo.includes(parola));
}

// =========================================================
// RICONOSCIMENTO DELLE DOMANDE SUI MINUTI FINALI
// =========================================================

function domandaSuiMinutiFinali(testo: string): boolean {
  return contieneUnoDi(testo, [
    "minuti finali",
    "minuto finale",
    "ultimi minuti",
    "ultimo minuto",
    "finale della partita",
    "finale del match",
    "dal 76",
    "dal settantaseiesimo",
    "ultimi 15 minuti",
    "ultimi quindici minuti",
    "76 90",
    "76-90",
  ]);
}

// =========================================================
// RICONOSCIMENTO DELLE DOMANDE SULLE RIMONTE
// =========================================================

function domandaSulleRimonte(testo: string): boolean {
  const parlaDiRimonte = contieneUnoDi(testo, [
    "rimonta",
    "rimonte",
    "ribaltare",
    "ribaltato",
    "ribaltata",
    "ribaltati",
    "ribaltate",
    "ribaltarla",
    "ribaltarle",
    "ribalta",
    "ribaltamento",
    "svantaggio",
    "svantaggi",
    "recuperare uno svantaggio",
    "recupero dello svantaggio",
  ]);

  const parlaDiAllenatori = contieneUnoDi(testo, [
    "allenatore",
    "allenatori",
    "partecipante",
    "partecipanti",
    "chi e riuscito",
    "chi e riuscita",
    "chi e stato capace",
    "chi riesce",
    "chi ha saputo",
    "chi e il migliore",
    "chi e il migliore a",
  ]);

  return (
    parlaDiRimonte &&
    (
      parlaDiAllenatori ||
      testo.includes("chi ha") ||
      testo.includes("quale") ||
      testo.includes("chi e")
    )
  );
}

// =========================================================
// RICONOSCIMENTO DELLE RIMONTE NEI MINUTI FINALI
// =========================================================

function domandaSulleRimonteNeiMinutiFinali(
  testo: string
): boolean {
  return (
    domandaSulleRimonte(testo) &&
    domandaSuiMinutiFinali(testo)
  );
}

// =========================================================
// RICONOSCIMENTO DEI GOL NEI MINUTI FINALI
// =========================================================

function domandaSuiGolNeiMinutiFinali(
  testo: string
): boolean {
  const parlaDiGol = contieneUnoDi(testo, [
    "gol",
    "goal",
    "reti",
    "segnare",
    "segnato",
    "segnata",
    "segnati",
    "marcare",
    "marcato",
  ]);

  const chiedeUnaClassifica = contieneUnoDi(testo, [
    "chi",
    "quale",
    "allenatore",
    "allenatori",
    "partecipante",
    "classifica",
    "record",
  ]);

  return (
    parlaDiGol &&
    chiedeUnaClassifica &&
    domandaSuiMinutiFinali(testo) &&
    !domandaSulleRimonte(testo)
  );
}

// =========================================================
// DOMANDE GLOBALI
// =========================================================

export function eDomandaGlobale(domanda: string): boolean {
  const testo = normalizza(domanda);

  // Le richieste sulle rimonte finali hanno priorità.
  if (domandaSulleRimonteNeiMinutiFinali(testo)) {
    return true;
  }

  // Le richieste sui gol finali hanno priorità sulle statistiche personali.
  if (domandaSuiGolNeiMinutiFinali(testo)) {
    return true;
  }

  // Le domande sulle rimonte generali devono essere riconosciute
  // come globali prima dei controlli sulle statistiche personali.
  if (domandaSulleRimonte(testo)) {
    return true;
  }

  // Domande che confrontano tutti gli allenatori in base alle vittorie
  // assolute, senza confonderle con il ranking analitico.
  const domandeVittorieAllenatori = [
    "chi ha vinto piu partite",
    "chi ha vinto piu incontri",
    "quale allenatore ha vinto piu partite",
    "quale allenatore ha vinto piu incontri",
    "quale partecipante ha vinto piu partite",
    "allenatore con piu vittorie",
    "allenatore con piu partite vinte",
    "chi ha piu vittorie",
    "chi ha il maggior numero di vittorie",
    "chi ha ottenuto piu vittorie",
  ];

  if (contieneUnoDi(testo, domandeVittorieAllenatori)) {
    return true;
  }

  // Domande sul totale delle partite concluse nel database.
  const domandaPartiteTotali =
    (testo.includes("partite") || testo.includes("incontri")) &&
    (
      testo.includes("concluse") ||
      testo.includes("conclusi") ||
      testo.includes("giocate") ||
      testo.includes("giocati") ||
      testo.includes("disputate") ||
      testo.includes("disputati")
    ) &&
    (
      testo.includes("totale") ||
      testo.includes("complessive") ||
      testo.includes("complessivi") ||
      testo.includes("in tutto") ||
      testo.includes("ci sono") ||
      testo.includes("quante") ||
      testo.includes("quanti")
    );

  if (domandaPartiteTotali) {
    return true;
  }

  const indicatoriGlobali = [
    "del sito",
    "del pazzi tournament",
    "di pazzi tournament",
    "in tutto il sito",
    "in assoluto",
    "globale",
    "globali",
    "classifica generale",
    "classifica globale",
    "classifica allenatori",
    "classifica squadre",
    "tutti gli allenatori",
    "tutte le squadre",
    "tutti i videogiochi",
    "chi e il miglior allenatore",
    "chi e il migliore allenatore",
    "miglior allenatore del sito",
    "allenatore piu forte",
    "squadra piu forte del sito",
    "squadra con piu vittorie",
    "squadra con piu partite",
    "squadra con piu gol",
    "videogioco con piu partite",
    "videogioco piu giocato",
    "chi ha segnato piu gol",
    "quanti gol sono stati segnati",
    "quante partite sono state giocate",
    "quante partite concluse",
    "quanti tornei ci sono",
    "statistiche complessive",
    "statistiche di tutto il sito",
    "migliore percentuale di vittorie",
    "miglior percentuale di vittorie",
    "percentuale di vittorie piu alta",
    "percentuale di vittorie maggiore",
    "squadra ha giocato piu partite",
    "squadra ha disputato piu partite",
    "squadra ha la migliore differenza reti",
    "squadra ha la miglior differenza reti",
    "migliore differenza reti",
    "miglior differenza reti",
    "miglior saldo reti",
    "migliore saldo reti",
  ];

  if (indicatoriGlobali.some((parola) => testo.includes(parola))) {
    return true;
  }

  // Evita di trasformare le richieste personali in richieste globali.
  const indicatoriPersonali = [
    "la mia carriera",
    "la mia squadra",
    "il mio rendimento",
    "i miei gol",
    "le mie vittorie",
    "le mie partite",
    "ho disputato",
    "ho segnato",
    "quanto ho vinto",
    "quanti gol ho",
  ];

  if (indicatoriPersonali.some((parola) => testo.includes(parola))) {
    return false;
  }

  const parlaDiSquadre =
    testo.includes("squadra") || testo.includes("squadre");

  const parlaDiStatistica = contieneUnoDi(testo, [
    "vittorie",
    "vittoria",
    "percentuale",
    "partite",
    "differenza reti",
    "saldo reti",
    "gol",
    "reti",
    "rendimento",
    "piu forte",
    "migliore",
    "miglior",
  ]);

  return parlaDiSquadre && parlaDiStatistica;
}

// =========================================================
// RISPOSTE GLOBALI
// =========================================================

export async function rispondiDomandaGlobale(
  domanda: string
): Promise<string> {
  const testo = normalizza(domanda);

  // =======================================================
  // CASO SPECIFICO: RIMONTE VINCENTI NEI MINUTI FINALI
  // =======================================================

  // Deve essere prima della classifica generale delle rimonte.
  if (domandaSulleRimonteNeiMinutiFinali(testo)) {
    const classifica =
      await getClassificaRimonteMinutiFinaliAllenatoriGlobale();

    if (classifica.length === 0) {
      return (
        "Non risultano ancora rimonte vincenti verificabili nei minuti finali.\n\n" +
        "Viene conteggiata soltanto una rimonta in cui la squadra è stata " +
        "realmente in svantaggio e ha poi completato il sorpasso con un gol " +
        "tra il 76° e il 90° minuto, recupero compreso.\n\n" +
        "Sono escluse le partite con sequenze di eventi gol incomplete o " +
        "non coerenti con il risultato finale. I supplementari sono esclusi."
      );
    }

    const ordinati = [...classifica].sort(
      (a, b) =>
        b.rimonteFinali - a.rimonteFinali ||
        a.nome.localeCompare(b.nome, "it")
    );

    const primo = ordinati[0];

    const primiClassificati = ordinati.filter(
      (allenatore) =>
        allenatore.rimonteFinali === primo.rimonteFinali
    );

    const descrizionePrimo =
      primiClassificati.length === 1
        ? `L'allenatore con più rimonte vincenti nei minuti finali è ${primo.nome}, con ${primo.rimonteFinali} rimonte.`
        : `C'è un ex aequo al primo posto: ${primiClassificati
            .map((allenatore) => allenatore.nome)
            .join(", ")}, tutti con ${primo.rimonteFinali} rimonte.`;

    const elenco = ordinati
      .slice(0, 10)
      .map(
        (allenatore, indice) =>
          `${indice + 1}. ${allenatore.nome}: ` +
          `${allenatore.rimonteFinali} ${
            allenatore.rimonteFinali === 1
              ? "rimonta vincente"
              : "rimonte vincenti"
          }`
      )
      .join("\n");

    return (
      `Classifica globale delle rimonte vincenti nei minuti finali di PazziTournament.\n\n` +
      `${descrizionePrimo}\n\n` +
      `Classifica dei primi ${Math.min(10, ordinati.length)} allenatori:\n` +
      `${elenco}\n\n` +
      `Criterio utilizzato: la squadra deve essere stata realmente in svantaggio ` +
      `durante la partita e deve aver completato il sorpasso con un gol ` +
      `tra il 76° e il 90° minuto, recupero compreso.\n\n` +
      `Il risultato finale deve essere una vittoria. I pareggi non vengono ` +
      `conteggiati. Sono escluse le partite con eventi gol incompleti o ` +
      `incoerenti con il punteggio finale. I supplementari sono esclusi. ` +
      `Quando è presente un allenatore sostituto, la rimonta viene attribuita ` +
      `al sostituto anziché al titolare.`
    );
  }

  // =======================================================
  // CASO SPECIFICO: GOL SEGNATI NEI MINUTI FINALI
  // =======================================================

  // Deve essere prima della classifica generica degli allenatori.
  if (domandaSuiGolNeiMinutiFinali(testo)) {
    const classifica =
      await getClassificaGolMinutiFinaliAllenatoriGlobale();

    if (classifica.length === 0) {
      return (
        "Non risultano gol verificabili nei minuti finali attribuibili agli allenatori.\n\n" +
        "La statistica considera i gol segnati dal 76° al 90° minuto, " +
        "recupero compreso, nelle partite concluse con eventi gol completi " +
        "e coerenti con il risultato finale. I supplementari sono esclusi."
      );
    }

    const ordinati = [...classifica].sort(
      (a, b) =>
        b.golMinutiFinali - a.golMinutiFinali ||
        a.nome.localeCompare(b.nome, "it")
    );

    const primo = ordinati[0];

    const primiClassificati = ordinati.filter(
      (allenatore) =>
        allenatore.golMinutiFinali === primo.golMinutiFinali
    );

    const descrizionePrimo =
      primiClassificati.length === 1
        ? `${primo.nome} è l'allenatore le cui squadre hanno segnato più gol nei minuti finali, con ${primo.golMinutiFinali} reti.`
        : `C'è un ex aequo al primo posto: ${primiClassificati
            .map((allenatore) => allenatore.nome)
            .join(", ")}, tutti con ${primo.golMinutiFinali} gol.`;

    const elenco = ordinati
      .slice(0, 10)
      .map(
        (allenatore, indice) =>
          `${indice + 1}. ${allenatore.nome}: ` +
          `${allenatore.golMinutiFinali} ${
            allenatore.golMinutiFinali === 1 ? "gol" : "gol"
          }`
      )
      .join("\n");

    return (
      `Classifica globale dei gol nei minuti finali di PazziTournament.\n\n` +
      `${descrizionePrimo}\n\n` +
      `Classifica dei primi ${Math.min(10, ordinati.length)} allenatori:\n` +
      `${elenco}\n\n` +
      `Criterio utilizzato: vengono conteggiati i gol delle squadre ` +
      `dal 76° al 90° minuto, recupero compreso. ` +
      `I supplementari sono esclusi e considerati una fase separata.\n\n` +
      `Sono considerate soltanto le partite concluse con una sequenza ` +
      `di eventi gol completa e coerente con il risultato finale. ` +
      `I gol sono attribuiti all'allenatore della squadra che li realizza; ` +
      `gli autogol vengono attribuiti alla squadra avversaria. ` +
      `Quando è presente un allenatore sostituto, i gol vengono attribuiti ` +
      `al sostituto anziché al titolare.`
    );
  }

  // =======================================================
  // CASO SPECIFICO: ALLENATORE CON PIÙ RIMONTE VINCENTI
  // =======================================================

  if (domandaSulleRimonte(testo)) {
    const classifica = await getClassificaRimonteAllenatoriGlobale();

    if (classifica.length === 0) {
      return (
        "Non risultano ancora rimonte vincenti verificabili nel database.\n\n" +
        "Per conteggiare una rimonta è necessario che la squadra sia stata " +
        "in svantaggio durante la partita e abbia poi vinto. " +
        "Sono considerate soltanto le partite con una sequenza di eventi gol " +
        "completa e coerente con il risultato finale."
      );
    }

    const ordinati = [...classifica].sort(
      (a, b) =>
        b.rimonte - a.rimonte ||
        a.nome.localeCompare(b.nome, "it")
    );

    const primo = ordinati[0];

    const primiClassificati = ordinati.filter(
      (allenatore) => allenatore.rimonte === primo.rimonte
    );

    const descrizionePrimo =
      primiClassificati.length === 1
        ? `L'allenatore che ha completato più rimonte vincenti è ${primo.nome}, con ${primo.rimonte} rimonte.`
        : `C'è un ex aequo al primo posto: ${primiClassificati
            .map((allenatore) => allenatore.nome)
            .join(", ")}, tutti con ${primo.rimonte} rimonte vincenti.`;

    const elenco = ordinati
      .slice(0, 10)
      .map(
        (allenatore, indice) =>
          `${indice + 1}. ${allenatore.nome}: ` +
          `${allenatore.rimonte} ${
            allenatore.rimonte === 1
              ? "rimonta vincente"
              : "rimonte vincenti"
          }`
      )
      .join("\n");

    return (
      `Classifica globale delle rimonte vincenti di PazziTournament.\n\n` +
      `${descrizionePrimo}\n\n` +
      `Classifica dei primi ${Math.min(10, ordinati.length)} allenatori:\n` +
      `${elenco}\n\n` +
      `Criterio utilizzato: viene conteggiata una rimonta soltanto quando ` +
      `la squadra è stata realmente in svantaggio durante la partita ` +
      `e ha successivamente vinto.\n\n` +
      `I pareggi non vengono conteggiati. Le partite prive di una sequenza ` +
      `di eventi gol completa e coerente con il risultato finale vengono escluse. ` +
      `Quando è presente un allenatore sostituto, la rimonta viene attribuita ` +
      `al sostituto anziché al titolare.`
    );
  }

  // =======================================================
  // CASO SPECIFICO: ALLENATORE CON PIÙ VITTORIE ASSOLUTE
  // =======================================================

  const domandaVittorieAllenatori = contieneUnoDi(testo, [
    "chi ha vinto piu partite",
    "chi ha vinto piu incontri",
    "quale allenatore ha vinto piu partite",
    "quale allenatore ha vinto piu incontri",
    "quale partecipante ha vinto piu partite",
    "allenatore con piu vittorie",
    "allenatore con piu partite vinte",
    "chi ha piu vittorie",
    "chi ha il maggior numero di vittorie",
    "chi ha ottenuto piu vittorie",
  ]);

  if (domandaVittorieAllenatori) {
    const classifica = await getClassificaAllenatoriGlobale();

    const ordinati = classifica
      .filter((allenatore) => allenatore.partite > 0)
      .sort(
        (a, b) =>
          b.vittorie - a.vittorie ||
          b.partite - a.partite ||
          b.percentualeVittorie - a.percentualeVittorie ||
          a.nome.localeCompare(b.nome, "it")
      );

    if (ordinati.length === 0) {
      return "Non risultano ancora partite concluse attribuibili agli allenatori.";
    }

    const primo = ordinati[0];

    const elenco = ordinati
      .slice(0, 10)
      .map(
        (allenatore, indice) =>
          `${indice + 1}. ${allenatore.nome}: ` +
          `${allenatore.vittorie} vittorie su ${allenatore.partite} partite ` +
          `(${formatPercentuale(allenatore.percentualeVittorie)})`
      )
      .join("\n");

    return (
      `Record globale di vittorie degli allenatori di PazziTournament.\n\n` +
      `L'allenatore con più vittorie assolute è ${primo.nome}, ` +
      `con ${primo.vittorie} vittorie su ${primo.partite} partite ` +
      `(${formatPercentuale(primo.percentualeVittorie)} di vittorie).\n\n` +
      `Classifica dei primi ${Math.min(10, ordinati.length)} allenatori ` +
      `per numero di vittorie:\n${elenco}\n\n` +
      `Il criterio è il numero assoluto di vittorie, non l'indice ` +
      `complessivo del ranking analitico.`
    );
  }

  // =======================================================
  // CLASSIFICA ANALITICA ALLENATORI
  // =======================================================

  if (
    testo.includes("allenatore") ||
    testo.includes("allenatori") ||
    testo.includes("ranking")
  ) {
    const classifica = await getClassificaAllenatoriGlobale();

    if (classifica.length === 0) {
      return "Non risultano ancora allenatori registrati nel ranking globale.";
    }

    const elenco = classifica
      .slice(0, 10)
      .map((allenatore, indice) => {
        return (
          `${indice + 1}. ${allenatore.nome} — ` +
          `indice complessivo ${formatNumero(allenatore.indiceComplessivo)}/100, ` +
          `${allenatore.puntiRanking} punti ufficiali, ` +
          `${allenatore.vittorie} vittorie su ${allenatore.partite} partite, ` +
          `${allenatore.titoli} titoli`
        );
      })
      .join("\n");

    const primo = classifica[0];

    return (
      `Classifica globale degli allenatori di PazziTournament.\n\n` +
      `Al primo posto dell'indice analitico risulta ${primo.nome}, ` +
      `con un indice complessivo di ${formatNumero(primo.indiceComplessivo)}/100.\n\n` +
      `Il punteggio combina il 60% del ranking ufficiale normalizzato ` +
      `e il 40% dell'indice sportivo. Quest'ultimo considera percentuale di vittorie, ` +
      `differenza reti per partita e titoli, riducendo il peso dei campioni piccoli.\n\n` +
      `I primi ${Math.min(10, classifica.length)} allenatori sono:\n${elenco}\n\n` +
      `Nota: questa è una classifica analitica dell'IA, non modifica il ranking ufficiale.`
    );
  }

  const statistiche = await getStatisticheGlobali();

  // =======================================================
  // PARTITE TOTALI
  // =======================================================

  if (
    (testo.includes("partite") || testo.includes("incontri")) &&
    (
      testo.includes("concluse") ||
      testo.includes("conclusi") ||
      testo.includes("giocate") ||
      testo.includes("giocati") ||
      testo.includes("disputate") ||
      testo.includes("disputati")
    ) &&
    (
      testo.includes("totale") ||
      testo.includes("complessive") ||
      testo.includes("complessivi") ||
      testo.includes("in tutto") ||
      testo.includes("ci sono") ||
      testo.includes("quante") ||
      testo.includes("quanti")
    )
  ) {
    return (
      `In PazziTournament risultano ${formatNumero(statistiche.partite)} ` +
      `partite concluse con un risultato registrato.\n\n` +
      `Il conteggio considera le partite contrassegnate come concluse ` +
      `con entrambe le squadre e i relativi punteggi presenti.`
    );
  }

  // =======================================================
  // VIDEOGIOCHI
  // =======================================================

  if (
    testo.includes("videogioco") ||
    testo.includes("videogiochi") ||
    testo.includes("gioco piu") ||
    testo.includes("giochi")
  ) {
    if (statistiche.videogiochi.length === 0) {
      return "Non risultano videogiochi registrati.";
    }

    const ordinati = [...statistiche.videogiochi].sort((a, b) => {
      if (testo.includes("gol") || testo.includes("reti")) {
        return b.gol - a.gol || b.partite - a.partite;
      }

      if (testo.includes("tornei") || testo.includes("torneo")) {
        return b.tornei - a.tornei || b.partite - a.partite;
      }

      return b.partite - a.partite || b.tornei - a.tornei;
    });

    const primo = ordinati[0];

    return (
      `Statistiche globali dei videogiochi.\n\n` +
      `In cima al criterio richiesto risulta ${primo.videogioco}: ` +
      `${primo.partite} partite concluse, ${primo.tornei} tornei e ` +
      `${primo.gol} gol dai risultati delle partite concluse.\n\n` +
      ordinati
        .slice(0, 10)
        .map(
          (gioco, indice) =>
            `${indice + 1}. ${gioco.videogioco}: ${gioco.partite} partite, ` +
            `${gioco.tornei} tornei, ${gioco.gol} gol`
        )
        .join("\n")
    );
  }

  // =======================================================
  // SQUADRE
  // =======================================================

  if (testo.includes("squadra") || testo.includes("squadre")) {
    const squadre = [...statistiche.squadre].filter(
      (squadra) => squadra.partite > 0
    );

    if (squadre.length === 0) {
      return "Non risultano partite concluse sufficienti per confrontare le squadre.";
    }

    let criterio: string;
    const ordinati = [...squadre];

    if (
      testo.includes("percentuale") ||
      testo.includes("rendimento") ||
      testo.includes("efficace") ||
      testo.includes("efficienza")
    ) {
      const richiedeCorrezioneCampione =
        testo.includes("corretta") ||
        testo.includes("corretto") ||
        testo.includes("affidabile") ||
        testo.includes("campione");

      if (richiedeCorrezioneCampione) {
        const percentualeCorretta = (
          squadra: (typeof squadre)[number]
        ) => {
          const fiducia = squadra.partite / (squadra.partite + 10);

          return (
            33.333 +
            (squadra.percentualeVittorie - 33.333) * fiducia
          );
        };

        ordinati.sort(
          (a, b) =>
            percentualeCorretta(b) - percentualeCorretta(a) ||
            b.partite - a.partite
        );

        criterio =
          "migliore percentuale di vittorie corretta per il numero di partite";
      } else {
        ordinati.sort(
          (a, b) =>
            b.percentualeVittorie - a.percentualeVittorie ||
            b.partite - a.partite
        );

        criterio = "migliore percentuale reale di vittorie";
      }
    } else if (
      testo.includes("differenza reti") ||
      testo.includes("saldo reti") ||
      testo.includes("differenziale reti")
    ) {
      ordinati.sort(
        (a, b) =>
          b.differenzaReti - a.differenzaReti ||
          b.partite - a.partite
      );
      criterio = "migliore differenza reti assoluta";
    } else if (
      testo.includes("piu partite") ||
      testo.includes("piu utilizzata") ||
      testo.includes("piu utilizzato") ||
      testo.includes("piu giocata") ||
      testo.includes("piu giocate")
    ) {
      ordinati.sort(
        (a, b) =>
          b.partite - a.partite ||
          b.vittorie - a.vittorie
      );
      criterio = "maggior numero di partite concluse";
    } else if (
      testo.includes("gol subiti") ||
      testo.includes("subisce meno") ||
      testo.includes("difesa migliore")
    ) {
      ordinati.sort(
        (a, b) =>
          a.golSubiti - b.golSubiti ||
          b.partite - a.partite
      );
      criterio = "minor numero assoluto di gol subiti";
    } else if (
      testo.includes("gol") ||
      testo.includes("reti segnate") ||
      testo.includes("piu prolifica") ||
      testo.includes("piu prolific")
    ) {
      ordinati.sort(
        (a, b) =>
          b.golFatti - a.golFatti ||
          b.partite - a.partite
      );
      criterio = "maggior numero di gol segnati";
    } else {
      ordinati.sort(
        (a, b) =>
          b.vittorie - a.vittorie ||
          b.partite - a.partite ||
          b.percentualeVittorie - a.percentualeVittorie
      );
      criterio = "maggior numero assoluto di vittorie";
    }

    const primo = ordinati[0];

    return (
      `Statistiche globali delle squadre: criterio ${criterio}.\n\n` +
      `Prima classificata: ${primo.nome} (${primo.tipo}).\n` +
      `${primo.vittorie} vittorie, ${primo.pareggi} pareggi e ` +
      `${primo.sconfitte} sconfitte su ${primo.partite} partite; ` +
      `${formatPercentuale(primo.percentualeVittorie)} di vittorie, ` +
      `${primo.golFatti} gol fatti e ${primo.golSubiti} subiti ` +
      `(differenza reti ${primo.differenzaReti > 0 ? "+" : ""}${primo.differenzaReti}).\n\n` +
      `Prime ${Math.min(10, ordinati.length)} squadre:\n` +
      ordinati
        .slice(0, 10)
        .map(
          (squadra, indice) =>
            `${indice + 1}. ${squadra.nome} (${squadra.tipo}): ` +
            `${squadra.vittorie} vittorie, ${squadra.pareggi} pareggi, ` +
            `${squadra.sconfitte} sconfitte su ${squadra.partite} partite; ` +
            `${formatPercentuale(squadra.percentualeVittorie)}, ` +
            `${squadra.golFatti} gol fatti, ${squadra.golSubiti} subiti, ` +
            `differenza reti ${squadra.differenzaReti > 0 ? "+" : ""}${squadra.differenzaReti}`
        )
        .join("\n")
    );
  }

  // =======================================================
  // GOL E RETI
  // =======================================================

  if (testo.includes("gol") || testo.includes("reti")) {
    const differenzaGol = statistiche.gol - statistiche.golRegistrati;

    return (
      `Statistiche complessive di PazziTournament:\n\n` +
      `• Tornei registrati: ${statistiche.tornei}\n` +
      `• Partite concluse con risultato: ${statistiche.partite}\n` +
      `• Gol totali ricavati dai risultati: ${statistiche.gol}\n` +
      `• Eventi gol registrati nel database: ${statistiche.golRegistrati}\n\n` +
      (
        differenzaGol > 0
          ? `Risultano ${differenzaGol} gol in più nei punteggi rispetto agli eventi gol registrati. ` +
            `Queste reti non hanno necessariamente un marcatore o un minuto associato. ` +
            `Il totale delle reti delle squadre viene ricavato dai risultati delle partite, ` +
            `mentre le statistiche individuali utilizzano gli eventi gol disponibili.`
          : differenzaGol < 0
            ? `Gli eventi gol registrati superano di ${Math.abs(differenzaGol)} il totale ricavato dai risultati. ` +
              `È opportuno verificare la coerenza dei dati prima di attribuire una causa alla differenza.`
            : `Il totale dei gol ricavato dai risultati coincide con il numero degli eventi gol registrati.`
      )
    );
  }

  // =======================================================
  // RISPOSTA GENERALE
  // =======================================================

  return (
    `Statistiche complessive di PazziTournament:\n\n` +
    `• Allenatori registrati: ${statistiche.allenatoriTotali}\n` +
    `• Squadre registrate: ${statistiche.squadreTotali}\n` +
    `• Tornei registrati: ${statistiche.tornei}\n` +
    `• Partite concluse con risultato: ${statistiche.partite}\n` +
    `• Gol dai punteggi delle partite concluse: ${statistiche.gol}\n\n` +
    `Puoi chiedermi la squadra con più vittorie, la migliore percentuale di vittorie, ` +
    `la squadra con più partite, quella con la migliore differenza reti, ` +
    `quale allenatore ha completato più rimonte vincenti, ` +
    `chi ha segnato più gol nei minuti finali ` +
    `oppure chi ha completato più rimonte nei minuti finali.`
  );
}