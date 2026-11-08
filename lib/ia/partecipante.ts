import {
  getStatistichePartecipante,
  type StatistichePartecipante,
} from "@/lib/statistiche/partecipante";

/*
|--------------------------------------------------------------------------
| DATI PREPARATI PER L'IA
|--------------------------------------------------------------------------
|
| Questo file NON parla direttamente con un modello AI.
|
| Il suo compito è trasformare le statistiche reali di
| PazziTournament in un contesto strutturato che potrà essere
| utilizzato successivamente dal motore IA interno.
|
| L'IA dovrà utilizzare esclusivamente questi dati.
|
|--------------------------------------------------------------------------
*/

export type ContestoIAPartecipante = {
  /*
  |--------------------------------------------------------------------------
  | PARTECIPANTE
  |--------------------------------------------------------------------------
  */

  partecipante: {
    id: number;
    nome: string;
  };

  /*
  |--------------------------------------------------------------------------
  | CARRIERA
  |--------------------------------------------------------------------------
  */

  carriera: {
    torneiDisputati: number;
    titoliVinti: number;

    partite: number;

    vittorie: number;
    pareggi: number;
    sconfitte: number;

    percentualeVittorie: number;

    golFatti: number;
    golSubiti: number;
    differenzaReti: number;

    golPerPartita: number;
    golSubitiPerPartita: number;

    serieMassimaVittorie: number;
    serieMassimaSconfitte: number;
  };

  /*
  |--------------------------------------------------------------------------
  | SQUADRE
  |--------------------------------------------------------------------------
  */

  squadre: StatistichePartecipante["squadre"];

  /*
  |--------------------------------------------------------------------------
  | VIDEOGIOCHI
  |--------------------------------------------------------------------------
  */

  videogiochi: StatistichePartecipante["videogiochi"];

  /*
  |--------------------------------------------------------------------------
  | TORNEI
  |--------------------------------------------------------------------------
  */

  tornei: StatistichePartecipante["tornei"];

  /*
  |--------------------------------------------------------------------------
  | AVVERSARI
  |--------------------------------------------------------------------------
  |
  | Contiene il rendimento storico contro gli altri partecipanti
  | oppure, quando il partecipante avversario non è identificabile,
  | contro la relativa squadra.
  |
  |--------------------------------------------------------------------------
  */

  avversari: StatistichePartecipante["avversari"];

  /*
  |--------------------------------------------------------------------------
  | HIGHLIGHTS
  |--------------------------------------------------------------------------
  */

  highlights: {
    squadraPiuUtilizzata:
      StatistichePartecipante["squadraPiuUtilizzata"];

    migliorSquadra:
      StatistichePartecipante["migliorSquadra"];

    migliorVideogioco:
      StatistichePartecipante["migliorVideogioco"];

    torneiVinti:
      StatistichePartecipante["torneiVinti"];
  };

  /*
  |--------------------------------------------------------------------------
  | ISTRUZIONI PER L'IA
  |--------------------------------------------------------------------------
  */

  istruzioni: {
    usaSoloDatiForniti: boolean;

    nonInventareStatistiche: boolean;

    segnalaDatiMancanti: boolean;
  };
};

/*
|--------------------------------------------------------------------------
| COSTRUZIONE CONTESTO IA
|--------------------------------------------------------------------------
*/

export function costruisciContestoIAPartecipante(
  statistiche: StatistichePartecipante
): ContestoIAPartecipante {
  return {
    /*
    |--------------------------------------------------------------------------
    | PARTECIPANTE
    |--------------------------------------------------------------------------
    */

    partecipante: {
      id: statistiche.partecipanteId,

      nome: statistiche.nome,
    },

    /*
    |--------------------------------------------------------------------------
    | CARRIERA
    |--------------------------------------------------------------------------
    */

    carriera: {
      torneiDisputati:
        statistiche.torneiDisputati,

      titoliVinti:
        statistiche.titoliVinti,

      partite:
        statistiche.partite,

      vittorie:
        statistiche.vittorie,

      pareggi:
        statistiche.pareggi,

      sconfitte:
        statistiche.sconfitte,

      percentualeVittorie:
        statistiche.percentualeVittorie,

      golFatti:
        statistiche.golFatti,

      golSubiti:
        statistiche.golSubiti,

      differenzaReti:
        statistiche.differenzaReti,

      golPerPartita:
        statistiche.golPerPartita,

      golSubitiPerPartita:
        statistiche.golSubitiPerPartita,

      serieMassimaVittorie:
        statistiche.serieMassimaVittorie,

      serieMassimaSconfitte:
        statistiche.serieMassimaSconfitte,
    },

    /*
    |--------------------------------------------------------------------------
    | SQUADRE
    |--------------------------------------------------------------------------
    */

    squadre:
      statistiche.squadre,

    /*
    |--------------------------------------------------------------------------
    | VIDEOGIOCHI
    |--------------------------------------------------------------------------
    */

    videogiochi:
      statistiche.videogiochi,

    /*
    |--------------------------------------------------------------------------
    | TORNEI
    |--------------------------------------------------------------------------
    */

    tornei:
      statistiche.tornei,

    /*
    |--------------------------------------------------------------------------
    | AVVERSARI
    |--------------------------------------------------------------------------
    */

    avversari:
      statistiche.avversari,

    /*
    |--------------------------------------------------------------------------
    | HIGHLIGHTS
    |--------------------------------------------------------------------------
    */

    highlights: {
      squadraPiuUtilizzata:
        statistiche.squadraPiuUtilizzata,

      migliorSquadra:
        statistiche.migliorSquadra,

      migliorVideogioco:
        statistiche.migliorVideogioco,

      torneiVinti:
        statistiche.torneiVinti,
    },

    /*
    |--------------------------------------------------------------------------
    | ISTRUZIONI
    |--------------------------------------------------------------------------
    */

    istruzioni: {
      usaSoloDatiForniti: true,

      nonInventareStatistiche: true,

      segnalaDatiMancanti: true,
    },
  };
}

/*
|--------------------------------------------------------------------------
| RECUPERA CONTESTO IA
|--------------------------------------------------------------------------
|
| Questa è la funzione principale che recupera i dati reali
| del partecipante e li trasforma nel formato utilizzabile
| dal motore IA.
|
|--------------------------------------------------------------------------
*/

export async function getContestoIAPartecipante(
  partecipanteId: number
): Promise<ContestoIAPartecipante | null> {
  const statistiche =
    await getStatistichePartecipante(
      partecipanteId
    );

  if (!statistiche) {
    return null;
  }

  return costruisciContestoIAPartecipante(
    statistiche
  );
}

/*
|--------------------------------------------------------------------------
| PROMPT DI SISTEMA
|--------------------------------------------------------------------------
|
| Questo prompt definisce il comportamento dell'IA.
|
| IMPORTANTE:
|
| L'IA non deve inventare statistiche.
|
|--------------------------------------------------------------------------
*/

export function costruisciSystemPromptIAPartecipante(): string {
  return `
Sei PazziTournament AI, l'assistente statistico ufficiale
di PazziTournament.

Il tuo compito è analizzare la carriera dei partecipanti
utilizzando esclusivamente i dati statistici forniti dal sistema.

I dati che ricevi provengono dal motore statistico interno
di PazziTournament e rappresentano i dati reali presenti
nel database.

REGOLE FONDAMENTALI:

1. Usa esclusivamente i dati forniti nel contesto.

2. Non inventare mai:
   - risultati
   - vittorie
   - sconfitte
   - pareggi
   - gol
   - tornei
   - partecipanti
   - giocatori
   - squadre
   - videogiochi
   - percentuali
   - record
   - confronti
   - statistiche
   - previsioni numeriche

3. Se una informazione non è presente nei dati disponibili,
   dichiaralo chiaramente.

4. Non confondere mai una squadra con un partecipante.

5. Non confondere mai un videogioco con un torneo.

6. Non confondere mai una partecipazione con una partita.

7. Quando fai un confronto numerico, utilizza solamente
   i valori presenti nel contesto.

8. Puoi eseguire semplici elaborazioni matematiche sui dati
   forniti, purché il risultato sia coerente con i dati originali.

9. Se una conclusione è interpretativa, presentala come analisi
   e non come fatto assoluto.

10. Non attribuire intenzioni, capacità o caratteristiche personali
    che non possono essere dedotte dalle statistiche.

11. Se l'utente chiede qualcosa che non può essere determinato
    dai dati disponibili, spiega chiaramente quali dati mancano.

12. Quando analizzi gli avversari, utilizza esclusivamente
    la sezione "avversari" del contesto.

13. Se un avversario è identificato tramite partecipanteId,
    consideralo come partecipante.

14. Se partecipanteId è null, considera il dato come riferito
    alla squadra avversaria e non attribuirlo a una persona.

15. Non trasformare mai automaticamente il nome di una squadra
    nel nome di un partecipante.

16. Quando confronti due partecipanti, utilizza solo dati
    effettivamente disponibili per entrambi.

17. Se non sono disponibili dati sufficienti per un confronto,
    dichiaralo invece di completare il confronto con supposizioni.

18. Le statistiche storiche rappresentano esclusivamente le
    partite completate e con risultato registrato presenti
    nei dati forniti dal sistema.

19. Non considerare partite incomplete o senza risultato come
    partite disputate.

20. Non dedurre informazioni sui giocatori reali, sulle loro
    abilità personali o sulle loro intenzioni se tali informazioni
    non sono presenti nei dati.

ANALISI CONSENTITE:

Puoi:

- analizzare la carriera di un partecipante;
- confrontare vittorie, pareggi e sconfitte;
- analizzare percentuali di vittoria;
- analizzare gol fatti e subiti;
- analizzare la differenza reti;
- analizzare gol medi per partita;
- analizzare le squadre utilizzate;
- individuare la squadra più utilizzata;
- individuare la miglior squadra secondo i dati disponibili;
- analizzare i videogiochi;
- individuare il miglior videogioco secondo i dati disponibili;
- analizzare i tornei disputati;
- individuare i tornei vinti;
- analizzare le serie di vittorie;
- analizzare le serie di sconfitte;
- analizzare gli avversari;
- confrontare il rendimento contro diversi avversari;
- individuare gli avversari affrontati più volte;
- individuare contro quali avversari il rendimento è migliore;
- individuare contro quali avversari il rendimento è peggiore;
- confrontare due partecipanti quando i dati necessari sono disponibili;
- eseguire calcoli matematici semplici sui dati forniti.

ANALISI DEGLI AVVERSARI:

Quando analizzi gli avversari considera:

- numero di partite;
- vittorie;
- pareggi;
- sconfitte;
- gol fatti;
- gol subiti;
- differenza reti;
- percentuale di vittorie.

Se l'avversario è associato a un partecipante,
usa il nome del partecipante.

Se l'avversario non è associato a un partecipante,
specifica che il dato è riferito alla squadra.

STILE:

- Rispondi in italiano.
- Sii naturale e leggibile.
- Evita risposte eccessivamente tecniche.
- Utilizza i numeri quando sono utili.
- Evidenzia i record particolarmente significativi.
- Se appropriato, utilizza brevi elenchi.
- Puoi spiegare i risultati con un linguaggio naturale.
- Non ripetere inutilmente le stesse informazioni.
- Non dire semplicemente "secondo i dati" in ogni frase.
- Non inventare mai informazioni per rendere la risposta più completa.

CONFRONTI:

Quando l'utente chiede:

"Chi è più forte?"

non fornire una risposta basata su opinioni personali.

Analizza invece le statistiche disponibili e spiega
quali indicatori favoriscono un partecipante rispetto all'altro.

Quando possibile considera:

- percentuale di vittorie;
- numero di vittorie;
- partite disputate;
- differenza reti;
- gol per partita;
- titoli vinti;
- rendimento nei videogiochi;
- rendimento con le squadre;
- rendimento nei tornei;
- rendimento contro gli avversari.

Se i dati non sono sufficienti per stabilire un confronto,
dillo chiaramente.

IDENTITÀ:

Sei PazziTournament AI.

Sei il motore di analisi statistica di PazziTournament.

Stai analizzando un archivio storico di:

- tornei;
- partite;
- partecipanti;
- squadre;
- videogiochi;
- risultati;
- confronti tra partecipanti;
- rendimento contro avversari;
- record storici.

Il tuo obiettivo è trasformare i dati statistici
in analisi comprensibili, precise e interessanti,
senza alterare, inventare o presumere dati.

La fonte della verità è sempre il contesto statistico
fornito dal sistema.
`.trim();
}