import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * ============================================================
 * PAZZITOURNAMENT
 * MOTORE AUTOMATICO DEI TROFEI
 * ============================================================
 *
 * TROFEI AUTOMATICI:
 *
 * 🏆 VINCITORE_TORNEO
 * ⚽ MIGLIOR_MARCATORE
 * 💎 SQUADRA_SORPRESA
 *
 * TROFEI MANUALI:
 *
 * 🎯 MIGLIOR_ASSISTMAN
 * 🧤 MIGLIOR_PORTIERE
 * ⭐ MVP
 * 🔥 MIGLIOR_MOMENTO
 *
 * I trofei manuali NON vengono mai modificati
 * da aggiornaTrofeiAutomatici().
 *
 * ============================================================
 */

type Partita = {
  id: bigint;
  SquadraCasaId: number | null;
  SquadraOspiteId: number | null;
  GolCasa: number | null;
  GolOspite: number | null;
  Completata: boolean | null;
  Fase: string | null;
  NumeroGara: number;
  AiRigori: boolean;
  RigoriCasa: number | null;
  RigoriOspite: number | null;
};

type Gol = {
  id: number;
  squadraId: number;
  tipo: "NORMALE" | "RIGORE" | "AUTOGOL";
  calciatoreTorneoId: number;

  calciatoreTorneo: {
    id: number;

    calciatore: {
      id: number;
      nome: string;
    };

    squadra: {
      id: number;
      nome: string;
    };
  };
};

type ValutazioneSquadra = {
  squadraId: number;
  nome: string;
  valutazione: number;
};

/**
 * ============================================================
 * FUNZIONI DI SUPPORTO
 * ============================================================
 */

function normalizzaFase(fase: string | null): string {
  return (fase ?? "")
    .toLowerCase()
    .trim();
}

function eFinale(fase: string | null): boolean {
  const valore = normalizzaFase(fase);

  if (!valore) {
    return false;
  }

  /**
   * Prima escludiamo tutte le fasi che possono contenere
   * la parola "finale" ma NON rappresentano la finale.
   */
  if (
    valore.includes("semifinale") ||
    valore.includes("semifinali") ||
    valore.includes("3°") ||
    valore.includes("3º") ||
    valore.includes("terzo") ||
    valore.includes("3 posto") ||
    valore.includes("3° posto") ||
    valore.includes("3º posto")
  ) {
    return false;
  }

  return valore === "finale" || valore.includes("finale");
}

/**
 * ============================================================
 * CALCOLO VINCITORE TORNEO
 * ============================================================
 */

export function calcolaVincitoreTorneo(
  partite: Partita[]
): number | null {
  const finali = partite
    .filter((partita) => eFinale(partita.Fase))
    .filter(
      (partita) =>
        partita.Completata === true &&
        partita.SquadraCasaId !== null &&
        partita.SquadraOspiteId !== null &&
        partita.GolCasa !== null &&
        partita.GolOspite !== null
    )
    .sort((a, b) => a.NumeroGara - b.NumeroGara);

  if (finali.length === 0) {
    return null;
  }

  /**
   * La finale può essere:
   *
   * 1) una singola partita;
   * 2) una doppia finale (andata + ritorno).
   *
   * In caso di doppia finale NON dobbiamo guardare
   * solamente l'ultima partita: dobbiamo sommare i gol
   * delle due gare.
   *
   * Esempio:
   * Andata:   A 2-0 B
   * Ritorno:  B 1-1 A
   * Vincitrice: A (3-1 complessivo)
   *
   * Le partite vengono quindi raggruppate per coppia
   * di squadre, indipendentemente da chi gioca in casa.
   */

  const primaFinale = finali[0];

  if (
    primaFinale.SquadraCasaId === null ||
    primaFinale.SquadraOspiteId === null
  ) {
    return null;
  }

  const squadraA = primaFinale.SquadraCasaId;
  const squadraB = primaFinale.SquadraOspiteId;

  const finaliSfida = finali.filter(
    (partita) =>
      (partita.SquadraCasaId === squadraA &&
        partita.SquadraOspiteId === squadraB) ||
      (partita.SquadraCasaId === squadraB &&
        partita.SquadraOspiteId === squadraA)
  );

  if (finaliSfida.length === 0) {
    return null;
  }

  /**
   * Se abbiamo una doppia finale, entrambe le partite
   * devono essere concluse prima di assegnare il torneo.
   *
   * Questo evita di assegnare il titolo dopo la sola andata.
   */
  const tutteLeFinaliDellaSfida = partite
    .filter((partita) => eFinale(partita.Fase))
    .filter(
      (partita) =>
        (partita.SquadraCasaId === squadraA &&
          partita.SquadraOspiteId === squadraB) ||
        (partita.SquadraCasaId === squadraB &&
          partita.SquadraOspiteId === squadraA)
    );

  const numeroGareFinale = tutteLeFinaliDellaSfida.length;

  if (numeroGareFinale >= 2) {
    const finaleRitorno = [...finaliSfida].sort(
      (a, b) => b.NumeroGara - a.NumeroGara
    )[0];

    /**
     * Per una doppia finale entrambe le gare devono essere
     * completate e avere un risultato.
     */
    if (
      finaliSfida.length < 2 ||
      finaliSfida.some(
        (partita) =>
          partita.Completata !== true ||
          partita.SquadraCasaId === null ||
          partita.SquadraOspiteId === null ||
          partita.GolCasa === null ||
          partita.GolOspite === null
      )
    ) {
      return null;
    }

    let golSquadraA = 0;
    let golSquadraB = 0;

    for (const partita of finaliSfida) {
      if (
        partita.SquadraCasaId === null ||
        partita.SquadraOspiteId === null ||
        partita.GolCasa === null ||
        partita.GolOspite === null
      ) {
        return null;
      }

      if (partita.SquadraCasaId === squadraA) {
        golSquadraA += partita.GolCasa;
        golSquadraB += partita.GolOspite;
      } else {
        golSquadraA += partita.GolOspite;
        golSquadraB += partita.GolCasa;
      }
    }

    /**
     * Vince chi ha segnato più gol nel complessivo
     * delle due partite.
     */
    if (golSquadraA > golSquadraB) {
      return squadraA;
    }

    if (golSquadraB > golSquadraA) {
      return squadraB;
    }

    /**
     * Complessivo in parità:
     * utilizziamo i rigori della gara decisiva
     * (normalmente il ritorno).
     */
    if (
      finaleRitorno.AiRigori &&
      finaleRitorno.RigoriCasa !== null &&
      finaleRitorno.RigoriOspite !== null
    ) {
      if (
        finaleRitorno.RigoriCasa >
        finaleRitorno.RigoriOspite
      ) {
        return finaleRitorno.SquadraCasaId;
      }

      if (
        finaleRitorno.RigoriOspite >
        finaleRitorno.RigoriCasa
      ) {
        return finaleRitorno.SquadraOspiteId;
      }
    }

    return null;
  }

  /**
   * FINALE A GARA SINGOLA
   *
   * Manteniamo il comportamento precedente:
   * vince chi ha più gol; in caso di parità si
   * controllano i rigori.
   */
  const finale = finaliSfida[0];

  if (
    finale.SquadraCasaId === null ||
    finale.SquadraOspiteId === null ||
    finale.GolCasa === null ||
    finale.GolOspite === null
  ) {
    return null;
  }

  if (finale.GolCasa > finale.GolOspite) {
    return finale.SquadraCasaId;
  }

  if (finale.GolOspite > finale.GolCasa) {
    return finale.SquadraOspiteId;
  }

  if (
    finale.AiRigori &&
    finale.RigoriCasa !== null &&
    finale.RigoriOspite !== null
  ) {
    if (finale.RigoriCasa > finale.RigoriOspite) {
      return finale.SquadraCasaId;
    }

    if (finale.RigoriOspite > finale.RigoriCasa) {
      return finale.SquadraOspiteId;
    }
  }

  return null;
}

/**
 * ============================================================
 * CALCOLO MIGLIORI MARCATORI
 * ============================================================
 *
 * Gli autogol vengono esclusi.
 *
 * Vengono considerati:
 * - gol normali
 * - gol su rigore
 *
 * In caso di parità vengono restituiti tutti i giocatori
 * con il numero massimo di gol.
 * ============================================================
 */

export function calcolaMiglioriMarcatori(
  gols: Gol[]
): {
  calciatoreTorneoId: number;
  calciatoreId: number;
  nome: string;
  squadraId: number;
  squadra: string;
  gol: number;
}[] {
  const marcatori = new Map<
    number,
    {
      calciatoreTorneoId: number;
      calciatoreId: number;
      nome: string;
      squadraId: number;
      squadra: string;
      gol: number;
    }
  >();

  for (const gol of gols) {
    if (gol.tipo === "AUTOGOL") {
      continue;
    }

    const calciatoreTorneoId =
      gol.calciatoreTorneoId;

    const esistente =
      marcatori.get(calciatoreTorneoId);

    if (esistente) {
      esistente.gol += 1;
      continue;
    }

    marcatori.set(calciatoreTorneoId, {
      calciatoreTorneoId,

      calciatoreId:
        gol.calciatoreTorneo.calciatore.id,

      nome:
        gol.calciatoreTorneo.calciatore.nome,

      squadraId:
        gol.calciatoreTorneo.squadra.id,

      squadra:
        gol.calciatoreTorneo.squadra.nome,

      gol: 1,
    });
  }

  const risultati =
    Array.from(marcatori.values());

  if (risultati.length === 0) {
    return [];
  }

  const massimo = Math.max(
    ...risultati.map(
      (marcatore) => marcatore.gol
    )
  );

  return risultati
    .filter(
      (marcatore) =>
        marcatore.gol === massimo
    )
    .sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );
}

/**
 * ============================================================
 * CALCOLO FASE RAGGIUNTA
 * ============================================================
 */

function valoreFase(
  fase: string | null
): number {
  const valore = normalizzaFase(fase);

  if (!valore) {
    return 0;
  }

  if (
    valore.includes("vincitore") ||
    valore.includes("campione")
  ) {
    return 100;
  }

  if (eFinale(fase)) {
    return 95;
  }

  if (
    valore.includes("semifinale") ||
    valore.includes("semifinali") ||
    valore.includes("semi")
  ) {
    return 80;
  }

  if (
    valore.includes("quarto") ||
    valore.includes("quarti") ||
    valore.includes("quarter")
  ) {
    return 65;
  }

  if (
    valore.includes("ottavo") ||
    valore.includes("ottavi") ||
    valore.includes("round of 16")
  ) {
    return 50;
  }

  if (
    valore.includes("sedicesimo") ||
    valore.includes("sedicesimi") ||
    valore.includes("round of 32")
  ) {
    return 35;
  }

  if (
    valore.includes("girone") ||
    valore.includes("gruppo")
  ) {
    return 20;
  }

  return 10;
}

/**
 * ============================================================
 * CALCOLO PUNTEGGIO SQUADRA SORPRESA
 * ============================================================
 */

export function calcolaPunteggioSorpresa(
  valutazione: number,
  faseMassima: number,
  vittorie: number,
  pareggi: number,
  sconfitte: number
): number {
  const partite =
    vittorie +
    pareggi +
    sconfitte;

  const rendimento =
    partite > 0
      ? (vittorie * 3 + pareggi) /
        (partite * 3)
      : 0;

  /**
   * Rating basso =
   * maggiore fattore sorpresa.
   */
  const fattoreForza = Math.max(
    0.5,
    1 + (80 - valutazione) / 100
  );

  /**
   * Importanza della fase raggiunta.
   */
  const fattoreFase =
    faseMassima / 100;

  /**
   * Rendimento:
   * minimo 50%
   * massimo 100%
   */
  const fattoreRendimento =
    0.5 +
    rendimento * 0.5;

  return (
    fattoreForza *
    fattoreFase *
    fattoreRendimento *
    100
  );
}

/**
 * ============================================================
 * CALCOLO SQUADRA SORPRESA
 * ============================================================
 */

export function calcolaSquadraSorpresa(
  squadre: {
    id: number;
    nome: string;
  }[],
  partite: Partita[],
  valutazioni: ValutazioneSquadra[]
): {
  squadraId: number;
  nome: string;
  punteggio: number;
  valutazione: number;
} | null {
  if (
    squadre.length === 0 ||
    valutazioni.length === 0
  ) {
    return null;
  }

  const risultati = squadre
    .map((squadra) => {
      const valutazione =
        valutazioni.find(
          (v) =>
            v.squadraId === squadra.id
        );

      /**
       * Se la squadra non ha una valutazione
       * per quel videogioco, non partecipa
       * al calcolo.
       */
      if (!valutazione) {
        return null;
      }

      const partiteSquadra =
        partite.filter(
          (partita) =>
            partita.SquadraCasaId ===
              squadra.id ||
            partita.SquadraOspiteId ===
              squadra.id
        );

      let vittorie = 0;
      let pareggi = 0;
      let sconfitte = 0;

      let faseMassima = 0;

      for (const partita of partiteSquadra) {
        if (!partita.Completata) {
          continue;
        }

        if (
          partita.GolCasa === null ||
          partita.GolOspite === null
        ) {
          continue;
        }

        faseMassima = Math.max(
          faseMassima,
          valoreFase(partita.Fase)
        );

        const casa =
          partita.SquadraCasaId ===
          squadra.id;

        const golFatti = casa
          ? partita.GolCasa
          : partita.GolOspite;

        const golSubiti = casa
          ? partita.GolOspite
          : partita.GolCasa;

        if (golFatti > golSubiti) {
          vittorie += 1;
        } else if (
          golFatti < golSubiti
        ) {
          sconfitte += 1;
        } else {
          pareggi += 1;
        }
      }

      /**
       * Una squadra che non ha giocato
       * nessuna partita non deve risultare
       * squadra sorpresa.
       */
      if (
        vittorie +
          pareggi +
          sconfitte ===
        0
      ) {
        return null;
      }

      const punteggio =
        calcolaPunteggioSorpresa(
          valutazione.valutazione,
          faseMassima,
          vittorie,
          pareggi,
          sconfitte
        );

      return {
        squadraId: squadra.id,
        nome: squadra.nome,
        punteggio,
        valutazione:
          valutazione.valutazione,
      };
    })
    .filter(
      (
        risultato
      ): risultato is {
        squadraId: number;
        nome: string;
        punteggio: number;
        valutazione: number;
      } =>
        risultato !== null
    );

  if (risultati.length === 0) {
    return null;
  }

  risultati.sort(
    (a, b) =>
      b.punteggio -
      a.punteggio
  );

  return risultati[0] ?? null;
}

/**
 * ============================================================
 * RECUPERO VALUTAZIONI DAL DATABASE
 * ============================================================
 *
 * Il rating viene recuperato esclusivamente da:
 *
 * ValutazioneSquadraGioco
 *
 * usando:
 * - videogiocoId
 * - squadraId
 *
 * Nessuna richiesta Internet.
 * ============================================================
 */

export async function recuperaValutazioniSquadre(
  videogiocoId:
    number | null | undefined,
  _videogiocoNome:
    string | null | undefined,
  squadre: {
    id: number;
    nome: string;
  }[]
): Promise<ValutazioneSquadra[]> {
  if (
    !videogiocoId ||
    squadre.length === 0
  ) {
    return [];
  }

  const valutazioni =
    await prisma.valutazioneSquadraGioco.findMany(
      {
        where: {
          videogiocoId,

          squadraId: {
            in: squadre.map(
              (squadra) =>
                squadra.id
            ),
          },
        },

        include: {
          squadra: true,
        },
      }
    );

  return valutazioni.map(
    (valutazione) => ({
      squadraId:
        valutazione.squadraId,

      nome:
        valutazione.squadra.nome,

      valutazione:
        valutazione.valutazione,
    })
  );
}

/**
 * ============================================================
 * CREA / AGGIORNA TROFEI AUTOMATICI
 * ============================================================
 *
 * Questa funzione modifica ESCLUSIVAMENTE:
 *
 * - VINCITORE_TORNEO
 * - MIGLIOR_MARCATORE
 * - SQUADRA_SORPRESA
 *
 * NON modifica mai:
 *
 * - MIGLIOR_ASSISTMAN
 * - MIGLIOR_PORTIERE
 * - MVP
 * - MIGLIOR_MOMENTO
 *
 * ============================================================
 */

export async function aggiornaTrofeiAutomatici(
  torneoId: number
) {
  await requireAdmin();
  if (!Number.isSafeInteger(torneoId) || torneoId <= 0) {
    throw new Error("ID torneo non valido.");
  }
  const torneo =
    await prisma.torneo.findUnique({
      where: {
        id: torneoId,
      },

      include: {
        gioco: true,

        partecipazioni: {
          include: {
            squadra: true,
          },
        },

        partite: {
          orderBy: {
            NumeroGara: "asc",
          },

          include: {
            gol: {
              include: {
                calciatoreTorneo: {
                  include: {
                    calciatore: true,
                    squadra: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!torneo) {
    throw new Error(
      "Torneo non trovato."
    );
  }

  // Quando una partita viene riaperta, cancelliamo solo i trofei automatici.
  // I premi manuali restano intatti; gli ex aequo sono rimossi in cascata.
  const torneoConcluso =
    torneo.partite.length > 0 &&
    torneo.partite.every((partita) => partita.Completata === true);

  if (!torneoConcluso) {
    await prisma.trofeo.deleteMany({
      where: {
        torneoId,
        tipo: { in: ["VINCITORE_TORNEO", "MIGLIOR_MARCATORE", "SQUADRA_SORPRESA"] },
      },
    });
    return { torneoConcluso: false };
  }

  /**
   * ==========================================================
   * SQUADRE DEL TORNEO
   * ==========================================================
   */

  const squadre =
    torneo.partecipazioni.map(
      (partecipazione) => ({
        id:
          partecipazione.squadra.id,

        nome:
          partecipazione.squadra.nome,
      })
    );

  /**
   * ==========================================================
   * PARTITE
   * ==========================================================
   */

  const partite: Partita[] =
    torneo.partite.map(
      (partita) => ({
        id: partita.id,

        SquadraCasaId:
          partita.SquadraCasaId,

        SquadraOspiteId:
          partita.SquadraOspiteId,

        GolCasa:
          partita.GolCasa,

        GolOspite:
          partita.GolOspite,

        Completata:
          partita.Completata,

        Fase:
          partita.Fase,

        NumeroGara:
          partita.NumeroGara,

        AiRigori:
          partita.AiRigori,

        RigoriCasa:
          partita.RigoriCasa,

        RigoriOspite:
          partita.RigoriOspite,
      })
    );

  /**
   * ==========================================================
   * 1. VINCITORE TORNEO
   * ==========================================================
   */

  const vincitoreId =
    calcolaVincitoreTorneo(
      partite
    );

  if (vincitoreId !== null) {
    // Il titolare e' quello associato alla squadra nel torneo,
    // NON l'eventuale sostituto che ha disputato una partita.
    const partecipanteTitolareId =
      torneo.partecipazioni.find(
        (partecipazione) => partecipazione.squadraId === vincitoreId
      )?.partecipanteId ?? null;

    // I titoli storici potrebbero risalire a un'assegnazione diversa.
    // Non attribuiamo automaticamente un allenatore a un trofeo
    // gia' esistente e privo di partecipante: richiede una verifica.
    const trofeoEsistente = await prisma.trofeo.findUnique({
      where: {
        torneoId_tipo: {
          torneoId,
          tipo: "VINCITORE_TORNEO",
        },
      },
      select: {
        squadraVincitriceId: true,
        partecipanteVincitoreId: true,
      },
    });

    // Se viene corretto il risultato e cambia la squadra campione,
    // azzeriamo l'eventuale vecchio allenatore invece di associarlo
    // alla nuova squadra. L'attribuzione va poi verificata.
    const allenatoreDaConservare =
      trofeoEsistente?.squadraVincitriceId === vincitoreId
        ? trofeoEsistente.partecipanteVincitoreId
        : null;

    await prisma.trofeo.upsert({
      where: {
        torneoId_tipo: {
          torneoId,
          tipo: "VINCITORE_TORNEO",
        },
      },
      create: {
        torneoId,
        tipo: "VINCITORE_TORNEO",
        squadraVincitriceId: vincitoreId,
        partecipanteVincitoreId: partecipanteTitolareId,
      },
      update: {
        squadraVincitriceId: vincitoreId,
        partecipanteVincitoreId: allenatoreDaConservare,
        calciatoreVincitoreId: null,
        valore: null,
        nota: null,
      },
    });
  } else {
    await prisma.trofeo.deleteMany({ where: { torneoId, tipo: "VINCITORE_TORNEO" } });
  }

  /**
   * ==========================================================
   * 2. MIGLIOR MARCATORE — SUPPORTO EX AEQUO
   * ==========================================================
   */

  const tuttiIGol: Gol[] = torneo.partite
    .filter(
      (partita) =>
        partita.Completata === true &&
        partita.GolCasa !== null &&
        partita.GolOspite !== null
    )
    .flatMap((partita) =>
      partita.gol.map((gol) => ({
        id: gol.id,
        squadraId: gol.squadraId,
        tipo: gol.tipo,
        calciatoreTorneoId: gol.calciatoreTorneoId,
        calciatoreTorneo: gol.calciatoreTorneo,
      }))
    );

  const miglioriMarcatori =
    calcolaMiglioriMarcatori(tuttiIGol);

  if (miglioriMarcatori.length > 0) {
    const vincitoreMarcatore = miglioriMarcatori[0];

    const trofeoMarcatore = await prisma.trofeo.upsert({
      where: {
        torneoId_tipo: {
          torneoId,
          tipo: "MIGLIOR_MARCATORE",
        },
      },
      create: {
        torneoId,
        tipo: "MIGLIOR_MARCATORE",
        calciatoreVincitoreId:
          vincitoreMarcatore.calciatoreTorneoId,
        valore: vincitoreMarcatore.gol,
      },
      update: {
        calciatoreVincitoreId:
          vincitoreMarcatore.calciatoreTorneoId,
        valore: vincitoreMarcatore.gol,
      },
    });

    await prisma.$transaction(async (tx) => {
      // Rimuove i vincitori precedentemente registrati
      // per riallinearli ai risultati attuali.
      await tx.trofeoCalciatoreVincitore.deleteMany({
        where: {
          trofeoId: trofeoMarcatore.id,
        },
      });

      // Registra tutti i vincitori, compresi quelli a pari merito.
      await tx.trofeoCalciatoreVincitore.createMany({
        data: miglioriMarcatori.map((marcatore) => ({
          trofeoId: trofeoMarcatore.id,
          calciatoreTorneoId:
            marcatore.calciatoreTorneoId,
        })),
        skipDuplicates: true,
      });
    });
  } else {
    await prisma.trofeo.deleteMany({ where: { torneoId, tipo: "MIGLIOR_MARCATORE" } });
  }

  /**
   * ==========================================================
   * 3. SQUADRA SORPRESA
   * ==========================================================
   */

  const valutazioni =
    await recuperaValutazioniSquadre(
      torneo.gioco?.id,
      torneo.gioco?.nome,
      squadre
    );

  const squadraSorpresa =
    calcolaSquadraSorpresa(
      squadre,
      partite,
      valutazioni
    );

  if (squadraSorpresa) {
    const punteggio =
      Math.round(
        squadraSorpresa.punteggio
      );

    const nota =
      `Videogioco: ${
        torneo.gioco?.nome ??
        "Non assegnato"
      }. ` +
      `Valutazione iniziale: ${
        squadraSorpresa.valutazione
      }. ` +
      `Punteggio sorpresa: ${
        punteggio
      }.`;

    await prisma.trofeo.upsert({
      where: {
        torneoId_tipo: {
          torneoId,

          tipo:
            "SQUADRA_SORPRESA",
        },
      },

      create: {
        torneoId,

        tipo:
          "SQUADRA_SORPRESA",

        squadraVincitriceId:
          squadraSorpresa.squadraId,

        valore:
          punteggio,

        nota,
      },

      update: {
        squadraVincitriceId:
          squadraSorpresa.squadraId,

        valore:
          punteggio,

        nota,
      },
    });
  } else {
    await prisma.trofeo.deleteMany({ where: { torneoId, tipo: "SQUADRA_SORPRESA" } });
  }

  /**
   * ==========================================================
   * RISULTATO
   * ==========================================================
   */

  return {
    vincitoreId,

    squadraSorpresa,

    migliorMarcatore:
      miglioriMarcatori.length > 0
        ? miglioriMarcatori[0].gol
        : null,

    miglioriMarcatori,

    videogioco:
      torneo.gioco
        ? {
            id:
              torneo.gioco.id,

            nome:
              torneo.gioco.nome,

            anno:
              torneo.gioco.anno,
          }
        : null,

    valutazioniCaricate:
      valutazioni.length,
  };
}