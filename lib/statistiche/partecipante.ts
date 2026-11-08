import { prisma } from "@/lib/prisma";
import { getStatisticheRimontePartecipante } from "@/lib/statistiche/rimonte-partecipante";

/*
|--------------------------------------------------------------------------
| TIPI
|--------------------------------------------------------------------------
*/

export type StatisticheSquadraPartecipante = {
  squadraId: number;
  nome: string;
  stemma: string | null;

  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;

  golFatti: number;
  golSubiti: number;
  differenzaReti: number;

  percentualeVittorie: number;

  titoli: number;
};

export type StatisticheTorneoPartecipante = {
  torneoId: number;
  nome: string;
  anno: number;

  videogioco: string;

  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;

  golFatti: number;
  golSubiti: number;
  differenzaReti: number;

  percentualeVittorie: number;

  titolo: boolean;
};

export type StatisticheVideogiocoPartecipante = {
  videogioco: string;

  tornei: number;
  partite: number;

  vittorie: number;
  pareggi: number;
  sconfitte: number;

  golFatti: number;
  golSubiti: number;

  differenzaReti: number;

  percentualeVittorie: number;
};

/*
|--------------------------------------------------------------------------
| STATISTICHE AVVERSARIO
|--------------------------------------------------------------------------
*/

export type StatisticheAvversarioPartecipante = {
  partecipanteId: number | null;
  nome: string;

  squadraId: number | null;
  squadraNome: string | null;
  stemma: string | null;

  partite: number;

  vittorie: number;
  pareggi: number;
  sconfitte: number;

  golFatti: number;
  golSubiti: number;
  differenzaReti: number;

  percentualeVittorie: number;
};

export type StatistichePartecipante = {
  partecipanteId: number;
  nome: string;

  torneiDisputati: number;
  titoliVinti: number;

  partite: number;

  vittorie: number;
  pareggi: number;
  sconfitte: number;

  golFatti: number;
  golSubiti: number;

  differenzaReti: number;

  percentualeVittorie: number;

  golPerPartita: number;
  golSubitiPerPartita: number;

  squadre: StatisticheSquadraPartecipante[];

  tornei: StatisticheTorneoPartecipante[];

  videogiochi: StatisticheVideogiocoPartecipante[];

  avversari: StatisticheAvversarioPartecipante[];

  squadraPiuUtilizzata:
    | StatisticheSquadraPartecipante
    | null;

  migliorSquadra:
    | StatisticheSquadraPartecipante
    | null;

  migliorVideogioco:
    | StatisticheVideogiocoPartecipante
    | null;

  torneiVinti: StatisticheTorneoPartecipante[];

  serieMassimaVittorie: number;
  serieMassimaSconfitte: number;

  // Nuove statistiche sulle rimonte
  rimonteVinte: number;
  rimonteVinteMinutiFinali: number;
};

/*
|--------------------------------------------------------------------------
| FUNZIONI DI SUPPORTO
|--------------------------------------------------------------------------
*/

function percentuale(
  valore: number,
  totale: number
): number {
  if (totale === 0) {
    return 0;
  }

  return Number(
    ((valore / totale) * 100).toFixed(1)
  );
}

/*
|--------------------------------------------------------------------------
| STATISTICHE PARTECIPANTE
|--------------------------------------------------------------------------
*/

export async function getStatistichePartecipante(
  partecipanteId: number
): Promise<StatistichePartecipante | null> {
  /*
  |--------------------------------------------------------------------------
  | PARTECIPANTE
  |--------------------------------------------------------------------------
  */

  const partecipante =
    await prisma.partecipante.findUnique({
      where: {
        id: partecipanteId,
      },

      include: {
        partecipazioni: {
          include: {
            torneo: {
              include: {
                gioco: true,

                trofei: {
                  where: {
                    tipo: "VINCITORE_TORNEO",
                  },

                  include: {
                    squadraVincitrice: true,
                  },
                },
              },
            },

            squadra: true,
          },

          orderBy: {
            torneo: {
              anno: "desc",
            },
          },
        },
      },
    });

  if (!partecipante) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE RIMONTE
  |--------------------------------------------------------------------------
  */

  const statisticheRimonte =
    await getStatisticheRimontePartecipante(
      partecipanteId
    );

  /*
  |--------------------------------------------------------------------------
  | PARTECIPAZIONI
  |--------------------------------------------------------------------------
  */

  const partecipazioni =
    partecipante.partecipazioni;

  /*
  |--------------------------------------------------------------------------
  | NESSUNA PARTECIPAZIONE
  |--------------------------------------------------------------------------
  */

  if (partecipazioni.length === 0) {
    return {
      partecipanteId: partecipante.id,
      nome: partecipante.nome,

      torneiDisputati: 0,
      titoliVinti: 0,

      partite: 0,

      vittorie: 0,
      pareggi: 0,
      sconfitte: 0,

      golFatti: 0,
      golSubiti: 0,

      differenzaReti: 0,

      percentualeVittorie: 0,

      golPerPartita: 0,
      golSubitiPerPartita: 0,

      squadre: [],
      tornei: [],
      videogiochi: [],
      avversari: [],

      squadraPiuUtilizzata: null,
      migliorSquadra: null,
      migliorVideogioco: null,

      torneiVinti: [],

      serieMassimaVittorie: 0,
      serieMassimaSconfitte: 0,

      rimonteVinte:
        statisticheRimonte.rimonteVinte,

      rimonteVinteMinutiFinali:
        statisticheRimonte.rimonteVinteMinutiFinali,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | TORNEI DEL PARTECIPANTE
  |--------------------------------------------------------------------------
  */

  const torneoIds = Array.from(
    new Set(
      partecipazioni.map(
        (partecipazione) =>
          partecipazione.torneoId
      )
    )
  );

  /*
  |--------------------------------------------------------------------------
  | MAPPATURA TORNEO → SQUADRE DEL PARTECIPANTE
  |--------------------------------------------------------------------------
  */

  const squadrePerTorneo =
    new Map<number, Set<number>>();

  for (const partecipazione of partecipazioni) {
    let squadre =
      squadrePerTorneo.get(
        partecipazione.torneoId
      );

    if (!squadre) {
      squadre = new Set<number>();

      squadrePerTorneo.set(
        partecipazione.torneoId,
        squadre
      );
    }

    squadre.add(
      partecipazione.squadraId
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SQUADRE UTILIZZATE
  |--------------------------------------------------------------------------
  */

  const squadraIds = Array.from(
    new Set(
      partecipazioni.map(
        (partecipazione) =>
          partecipazione.squadraId
      )
    )
  );

  /*
  |--------------------------------------------------------------------------
  | PARTITE
  |--------------------------------------------------------------------------
  */

  const partite =
    await prisma.partita.findMany({
      where: {
        TorneoId: {
          in: torneoIds,
        },

        Completata: true,

        GolCasa: {
          not: null,
        },

        GolOspite: {
          not: null,
        },

        OR: [
          {
            SquadraCasaId: {
              in: squadraIds,
            },
          },

          {
            SquadraOspiteId: {
              in: squadraIds,
            },
          },
        ],
      },

      include: {
        torneo: {
          select: {
            id: true,
            nome: true,
            anno: true,

            videogioco: true,

            gioco: {
              select: {
                id: true,
                nome: true,
                anno: true,
              },
            },
          },
        },

        squadraCasa: {
          select: {
            id: true,
            nome: true,
            stemma: true,
          },
        },

        squadraOspite: {
          select: {
            id: true,
            nome: true,
            stemma: true,
          },
        },
      },

      orderBy: [
        {
          dataPartita: "asc",
        },

        {
          id: "asc",
        },
      ],
    });

  /*
  |--------------------------------------------------------------------------
  | MAPPATURA SQUADRA → PARTECIPANTE PER TORNEO
  |--------------------------------------------------------------------------
  */

  const partecipantePerSquadraETorneo =
    new Map<
      string,
      {
        id: number;
        nome: string;
      }
    >();

  const tutteLePartecipazioni =
    await prisma.partecipazione.findMany({
      where: {
        torneoId: {
          in: torneoIds,
        },

        partecipanteId: {
          not: null,
        },
      },

      select: {
        torneoId: true,
        squadraId: true,

        partecipante: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

  for (const partecipazione of tutteLePartecipazioni) {
    if (!partecipazione.partecipante) {
      continue;
    }

    const chiave =
      `${partecipazione.torneoId}:${partecipazione.squadraId}`;

    partecipantePerSquadraETorneo.set(
      chiave,
      {
        id: partecipazione.partecipante.id,
        nome: partecipazione.partecipante.nome,
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CONTATORI GENERALI
  |--------------------------------------------------------------------------
  */

  let partiteTotali = 0;

  let vittorie = 0;
  let pareggi = 0;
  let sconfitte = 0;

  let golFatti = 0;
  let golSubiti = 0;

  /*
  |--------------------------------------------------------------------------
  | SERIE
  |--------------------------------------------------------------------------
  */

  let serieAttualeVittorie = 0;
  let serieAttualeSconfitte = 0;

  let serieMassimaVittorie = 0;
  let serieMassimaSconfitte = 0;

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE SQUADRE
  |--------------------------------------------------------------------------
  */

  const squadreMap =
    new Map<
      number,
      StatisticheSquadraPartecipante
    >();

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE TORNEI
  |--------------------------------------------------------------------------
  */

  const torneiMap =
    new Map<
      number,
      StatisticheTorneoPartecipante
    >();

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE VIDEOGIOCHI
  |--------------------------------------------------------------------------
  */

  const videogiochiMap =
    new Map<
      string,
      StatisticheVideogiocoPartecipante
    >();

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE AVVERSARI
  |--------------------------------------------------------------------------
  */

  const avversariMap =
    new Map<
      string,
      StatisticheAvversarioPartecipante
    >();

  /*
  |--------------------------------------------------------------------------
  | INIZIALIZZIAMO TORNEI E VIDEOGIOCHI
  |--------------------------------------------------------------------------
  */

  for (const partecipazione of partecipazioni) {
    const torneo =
      partecipazione.torneo;

    const videogioco =
      torneo.gioco?.nome ??
      torneo.videogioco ??
      "Non specificato";

    if (!torneiMap.has(torneo.id)) {
      torneiMap.set(torneo.id, {
        torneoId: torneo.id,

        nome: torneo.nome,

        anno: torneo.anno,

        videogioco,

        partite: 0,

        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,

        golFatti: 0,
        golSubiti: 0,

        differenzaReti: 0,

        percentualeVittorie: 0,

        titolo: false,
      });
    }

    let gioco =
      videogiochiMap.get(
        videogioco
      );

    if (!gioco) {
      gioco = {
        videogioco,

        tornei: 0,
        partite: 0,

        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,

        golFatti: 0,
        golSubiti: 0,

        differenzaReti: 0,

        percentualeVittorie: 0,
      };

      videogiochiMap.set(
        videogioco,
        gioco
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | TORNEI UNICI PER VIDEOGIOCO
  |--------------------------------------------------------------------------
  */

  const torneiPerVideogioco =
    new Map<
      string,
      Set<number>
    >();

  for (const partecipazione of partecipazioni) {
    const torneo =
      partecipazione.torneo;

    const videogioco =
      torneo.gioco?.nome ??
      torneo.videogioco ??
      "Non specificato";

    let torneiGioco =
      torneiPerVideogioco.get(
        videogioco
      );

    if (!torneiGioco) {
      torneiGioco =
        new Set<number>();

      torneiPerVideogioco.set(
        videogioco,
        torneiGioco
      );
    }

    torneiGioco.add(
      torneo.id
    );
  }

  for (const [
    videogioco,
    torneoIdsGioco,
  ] of torneiPerVideogioco) {
    const gioco =
      videogiochiMap.get(
        videogioco
      );

    if (gioco) {
      gioco.tornei =
        torneoIdsGioco.size;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ELABORAZIONE PARTITE
  |--------------------------------------------------------------------------
  */

  for (const partita of partite) {
    /*
    |--------------------------------------------------------------------------
    | CONTROLLI
    |--------------------------------------------------------------------------
    */

    if (
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    if (
      !partita.squadraCasa ||
      !partita.squadraOspite
    ) {
      continue;
    }

    if (
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null
    ) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | SQUADRE DEL PARTECIPANTE IN QUESTO TORNEO
    |--------------------------------------------------------------------------
    */

    const squadrePartecipante =
      squadrePerTorneo.get(
        partita.TorneoId
      );

    if (!squadrePartecipante) {
      continue;
    }

    const casaAppartiene =
      squadrePartecipante.has(
        partita.SquadraCasaId
      );

    const ospiteAppartiene =
      squadrePartecipante.has(
        partita.SquadraOspiteId
      );

    /*
    |--------------------------------------------------------------------------
    | NESSUNA SQUADRA DEL PARTECIPANTE
    |--------------------------------------------------------------------------
    */

    if (
      !casaAppartiene &&
      !ospiteAppartiene
    ) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | DUE SQUADRE DELLO STESSO PARTECIPANTE
    |--------------------------------------------------------------------------
    */

    if (
      casaAppartiene &&
      ospiteAppartiene
    ) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | DETERMINIAMO SQUADRA E RISULTATO
    |--------------------------------------------------------------------------
    */

    let squadraId: number;
    let squadraNome: string;
    let squadraStemma: string | null;

    let golFattiPartita: number;
    let golSubitiPartita: number;

    let risultato:
      | "V"
      | "N"
      | "P";

    let avversarioSquadraId: number;
    let avversarioSquadraNome: string;
    let avversarioSquadraStemma: string | null;

    if (casaAppartiene) {
      squadraId =
        partita.SquadraCasaId;

      squadraNome =
        partita.squadraCasa.nome;

      squadraStemma =
        partita.squadraCasa.stemma;

      golFattiPartita =
        partita.GolCasa;

      golSubitiPartita =
        partita.GolOspite;

      avversarioSquadraId =
        partita.SquadraOspiteId;

      avversarioSquadraNome =
        partita.squadraOspite.nome;

      avversarioSquadraStemma =
        partita.squadraOspite.stemma;

      if (
        partita.GolCasa >
        partita.GolOspite
      ) {
        risultato = "V";
      } else if (
        partita.GolCasa ===
        partita.GolOspite
      ) {
        risultato = "N";
      } else {
        risultato = "P";
      }
    } else {
      squadraId =
        partita.SquadraOspiteId;

      squadraNome =
        partita.squadraOspite.nome;

      squadraStemma =
        partita.squadraOspite.stemma;

      golFattiPartita =
        partita.GolOspite;

      golSubitiPartita =
        partita.GolCasa;

      avversarioSquadraId =
        partita.SquadraCasaId;

      avversarioSquadraNome =
        partita.squadraCasa.nome;

      avversarioSquadraStemma =
        partita.squadraCasa.stemma;

      if (
        partita.GolOspite >
        partita.GolCasa
      ) {
        risultato = "V";
      } else if (
        partita.GolOspite ===
        partita.GolCasa
      ) {
        risultato = "N";
      } else {
        risultato = "P";
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATISTICHE GENERALI
    |--------------------------------------------------------------------------
    */

    partiteTotali += 1;

    golFatti +=
      golFattiPartita;

    golSubiti +=
      golSubitiPartita;

    /*
    |--------------------------------------------------------------------------
    | RISULTATO
    |--------------------------------------------------------------------------
    */

    if (risultato === "V") {
      vittorie += 1;

      serieAttualeVittorie += 1;
      serieAttualeSconfitte = 0;

      if (
        serieAttualeVittorie >
        serieMassimaVittorie
      ) {
        serieMassimaVittorie =
          serieAttualeVittorie;
      }
    } else if (
      risultato === "N"
    ) {
      pareggi += 1;

      serieAttualeVittorie = 0;
      serieAttualeSconfitte = 0;
    } else {
      sconfitte += 1;

      serieAttualeSconfitte += 1;
      serieAttualeVittorie = 0;

      if (
        serieAttualeSconfitte >
        serieMassimaSconfitte
      ) {
        serieMassimaSconfitte =
          serieAttualeSconfitte;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATISTICHE SQUADRA
    |--------------------------------------------------------------------------
    */

    let squadra =
      squadreMap.get(
        squadraId
      );

    if (!squadra) {
      squadra = {
        squadraId,

        nome: squadraNome,

        stemma: squadraStemma,

        partite: 0,

        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,

        golFatti: 0,
        golSubiti: 0,

        differenzaReti: 0,

        percentualeVittorie: 0,

        titoli: 0,
      };

      squadreMap.set(
        squadraId,
        squadra
      );
    }

    squadra.partite += 1;

    squadra.golFatti +=
      golFattiPartita;

    squadra.golSubiti +=
      golSubitiPartita;

    if (risultato === "V") {
      squadra.vittorie += 1;
    } else if (
      risultato === "N"
    ) {
      squadra.pareggi += 1;
    } else {
      squadra.sconfitte += 1;
    }

    /*
    |--------------------------------------------------------------------------
    | STATISTICHE TORNEO
    |--------------------------------------------------------------------------
    */

    const torneoId =
      partita.torneo.id;

    const torneo =
      torneiMap.get(
        torneoId
      );

    if (torneo) {
      torneo.partite += 1;

      torneo.golFatti +=
        golFattiPartita;

      torneo.golSubiti +=
        golSubitiPartita;

      if (risultato === "V") {
        torneo.vittorie += 1;
      } else if (
        risultato === "N"
      ) {
        torneo.pareggi += 1;
      } else {
        torneo.sconfitte += 1;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATISTICHE VIDEOGIOCO
    |--------------------------------------------------------------------------
    */

    const videogioco =
      partita.torneo.gioco?.nome ??
      partita.torneo.videogioco ??
      "Non specificato";

    const gioco =
      videogiochiMap.get(
        videogioco
      );

    if (gioco) {
      gioco.partite += 1;

      gioco.golFatti +=
        golFattiPartita;

      gioco.golSubiti +=
        golSubitiPartita;

      if (risultato === "V") {
        gioco.vittorie += 1;
      } else if (
        risultato === "N"
      ) {
        gioco.pareggi += 1;
      } else {
        gioco.sconfitte += 1;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATISTICHE AVVERSARIO
    |--------------------------------------------------------------------------
    */

    const chiaveAvversario =
      `${partita.TorneoId}:${avversarioSquadraId}`;

    const partecipanteAvversario =
      partecipantePerSquadraETorneo.get(
        chiaveAvversario
      );

    if (
      partecipanteAvversario &&
      partecipanteAvversario.id ===
        partecipante.id
    ) {
      continue;
    }

    const chiave =
      partecipanteAvversario
        ? `P:${partecipanteAvversario.id}`
        : `S:${avversarioSquadraId}`;

    let avversario =
      avversariMap.get(
        chiave
      );

    if (!avversario) {
      avversario = {
        partecipanteId:
          partecipanteAvversario?.id ??
          null,

        nome:
          partecipanteAvversario?.nome ??
          avversarioSquadraNome,

        squadraId:
          avversarioSquadraId,

        squadraNome:
          avversarioSquadraNome,

        stemma:
          avversarioSquadraStemma,

        partite: 0,

        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,

        golFatti: 0,
        golSubiti: 0,

        differenzaReti: 0,

        percentualeVittorie: 0,
      };

      avversariMap.set(
        chiave,
        avversario
      );
    }

    avversario.partite += 1;

    avversario.golFatti +=
      golFattiPartita;

    avversario.golSubiti +=
      golSubitiPartita;

    if (risultato === "V") {
      avversario.vittorie += 1;
    } else if (
      risultato === "N"
    ) {
      avversario.pareggi += 1;
    } else {
      avversario.sconfitte += 1;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | TITOLI VINTI
  |--------------------------------------------------------------------------
  */

  const torneiVintiIds =
    new Set<number>();

  for (const partecipazione of partecipazioni) {
    const torneo =
      partecipazione.torneo;

    const squadraId =
      partecipazione.squadraId;

    const vincitore =
      torneo.trofei.find(
        (trofeo) =>
          trofeo.squadraVincitriceId ===
          squadraId
      );

    if (!vincitore) {
      continue;
    }

    torneiVintiIds.add(
      torneo.id
    );

    const torneoStat =
      torneiMap.get(
        torneo.id
      );

    if (torneoStat) {
      torneoStat.titolo = true;
    }

    const squadraStat =
      squadreMap.get(
        squadraId
      );

    if (squadraStat) {
      squadraStat.titoli += 1;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FINALIZZAZIONE SQUADRE
  |--------------------------------------------------------------------------
  */

  const squadre =
    Array.from(
      squadreMap.values()
    );

  for (const squadra of squadre) {
    squadra.differenzaReti =
      squadra.golFatti -
      squadra.golSubiti;

    squadra.percentualeVittorie =
      percentuale(
        squadra.vittorie,
        squadra.partite
      );
  }

  squadre.sort(
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

  /*
  |--------------------------------------------------------------------------
  | FINALIZZAZIONE TORNEI
  |--------------------------------------------------------------------------
  */

  const tornei =
    Array.from(
      torneiMap.values()
    );

  for (const torneo of tornei) {
    torneo.differenzaReti =
      torneo.golFatti -
      torneo.golSubiti;

    torneo.percentualeVittorie =
      percentuale(
        torneo.vittorie,
        torneo.partite
      );
  }

  tornei.sort(
    (a, b) => {
      if (
        b.anno !==
        a.anno
      ) {
        return (
          b.anno -
          a.anno
        );
      }

      return a.nome.localeCompare(
        b.nome
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | FINALIZZAZIONE VIDEOGIOCHI
  |--------------------------------------------------------------------------
  */

  const videogiochi =
    Array.from(
      videogiochiMap.values()
    );

  for (const gioco of videogiochi) {
    gioco.differenzaReti =
      gioco.golFatti -
      gioco.golSubiti;

    gioco.percentualeVittorie =
      percentuale(
        gioco.vittorie,
        gioco.partite
      );
  }

  videogiochi.sort(
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

  /*
  |--------------------------------------------------------------------------
  | FINALIZZAZIONE AVVERSARI
  |--------------------------------------------------------------------------
  */

  const avversari =
    Array.from(
      avversariMap.values()
    );

  for (const avversario of avversari) {
    avversario.differenzaReti =
      avversario.golFatti -
      avversario.golSubiti;

    avversario.percentualeVittorie =
      percentuale(
        avversario.vittorie,
        avversario.partite
      );
  }

  /*
  |--------------------------------------------------------------------------
  | ORDINAMENTO AVVERSARI
  |--------------------------------------------------------------------------
  */

  avversari.sort(
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

      if (
        b.vittorie !==
        a.vittorie
      ) {
        return (
          b.vittorie -
          a.vittorie
        );
      }

      return a.nome.localeCompare(
        b.nome
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | MIGLIOR SQUADRA
  |--------------------------------------------------------------------------
  */

  const migliorSquadra =
    [...squadre]
      .filter(
        (squadra) =>
          squadra.partite > 0
      )
      .sort(
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
      )[0] ?? null;

  /*
  |--------------------------------------------------------------------------
  | SQUADRA PIÙ UTILIZZATA
  |--------------------------------------------------------------------------
  */

  const squadraPiuUtilizzata =
    [...squadre]
      .filter(
        (squadra) =>
          squadra.partite > 0
      )
      .sort(
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
      )[0] ?? null;

  /*
  |--------------------------------------------------------------------------
  | MIGLIOR VIDEOGIOCO
  |--------------------------------------------------------------------------
  */

  const migliorVideogioco =
    [...videogiochi]
      .filter(
        (gioco) =>
          gioco.partite > 0
      )
      .sort(
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
      )[0] ?? null;

  /*
  |--------------------------------------------------------------------------
  | TORNEI VINTI
  |--------------------------------------------------------------------------
  */

  const torneiVinti =
    tornei.filter(
      (torneo) =>
        torneo.titolo
    );

  /*
  |--------------------------------------------------------------------------
  | RISULTATO FINALE
  |--------------------------------------------------------------------------
  */

  return {
    partecipanteId:
      partecipante.id,

    nome:
      partecipante.nome,

    torneiDisputati:
      torneoIds.length,

    titoliVinti:
      torneiVintiIds.size,

    partite:
      partiteTotali,

    vittorie,
    pareggi,
    sconfitte,

    golFatti,
    golSubiti,

    differenzaReti:
      golFatti -
      golSubiti,

    percentualeVittorie:
      percentuale(
        vittorie,
        partiteTotali
      ),

    golPerPartita:
      partiteTotali > 0
        ? Number(
            (
              golFatti /
              partiteTotali
            ).toFixed(2)
          )
        : 0,

    golSubitiPerPartita:
      partiteTotali > 0
        ? Number(
            (
              golSubiti /
              partiteTotali
            ).toFixed(2)
          )
        : 0,

    /*
    |--------------------------------------------------------------------------
    | DATI DETTAGLIATI
    |--------------------------------------------------------------------------
    */

    squadre,

    tornei,

    videogiochi,

    avversari,

    /*
    |--------------------------------------------------------------------------
    | MIGLIORI
    |--------------------------------------------------------------------------
    */

    squadraPiuUtilizzata,

    migliorSquadra,

    migliorVideogioco,

    torneiVinti,

    /*
    |--------------------------------------------------------------------------
    | RECORD
    |--------------------------------------------------------------------------
    */

    serieMassimaVittorie,

    serieMassimaSconfitte,

    /*
    |--------------------------------------------------------------------------
    | RIMONTE
    |--------------------------------------------------------------------------
    */

    rimonteVinte:
      statisticheRimonte.rimonteVinte,

    rimonteVinteMinutiFinali:
      statisticheRimonte.rimonteVinteMinutiFinali,
  };
}