import { prisma } from "@/lib/prisma";

/**
 * ============================================================
 * PAZZITOURNAMENT
 * GESTIONE VALUTAZIONI SQUADRE
 * ============================================================
 *
 * SISTEMA MANUALE
 *
 * Il vecchio sistema utilizzava FIFA Index per recuperare
 * automaticamente i rating delle squadre.
 *
 * Questo sistema è stato rimosso.
 *
 * Ora ogni valutazione è legata a:
 *
 *     VIDEOGIOCO + SQUADRA
 *
 * tramite il modello:
 *
 *     ValutazioneSquadraGioco
 *
 * Esempio:
 *
 * Torino + FIFA 17 = 74
 * Torino + FIFA 19 = 78
 *
 * Sono quindi due valutazioni completamente indipendenti.
 *
 * ============================================================
 */

type SquadraDaControllare = {
  id: number;
  nome: string;
};

type RisultatoSincronizzazione = {
  videogiocoId: number;
  videogioco: string;
  trovate: number;
  aggiornate: number;
  nonTrovate: string[];
};

/**
 * ============================================================
 * SINCRONIZZA UN VIDEOGIOCO
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Questa funzione NON scarica più nulla da Internet.
 *
 * Controlla semplicemente quali squadre hanno già una
 * valutazione associata a quel videogioco.
 *
 * I rating vengono inseriti/modificati manualmente.
 *
 * ============================================================
 */

export async function sincronizzaValutazioniVideogioco(
  videogiocoId: number
): Promise<RisultatoSincronizzazione> {
  const videogioco = await prisma.videogioco.findUnique({
    where: {
      id: videogiocoId,
    },
  });

  if (!videogioco) {
    throw new Error("Videogioco non trovato.");
  }

  /**
   * Recuperiamo tutte le squadre presenti nel database.
   */
  const squadre = await prisma.squadra.findMany({
    select: {
      id: true,
      nome: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  /**
   * Recuperiamo le valutazioni già presenti per questo
   * specifico videogioco.
   */
  const valutazioni =
    await prisma.valutazioneSquadraGioco.findMany({
      where: {
        videogiocoId: videogioco.id,
      },
      select: {
        squadraId: true,
      },
    });

  /**
   * Creiamo un Set per poter controllare rapidamente
   * quali squadre hanno già un rating.
   */
  const squadreValutate = new Set(
    valutazioni.map((valutazione) => valutazione.squadraId)
  );

  /**
   * Individuiamo le squadre che non hanno ancora
   * una valutazione per questo videogioco.
   */
  const nonTrovate = squadre
    .filter(
      (squadra) => !squadreValutate.has(squadra.id)
    )
    .map((squadra) => squadra.nome);

  return {
    videogiocoId: videogioco.id,

    videogioco: videogioco.nome,

    trovate: valutazioni.length,

    /**
     * Nessun rating viene modificato automaticamente.
     */
    aggiornate: 0,

    nonTrovate,
  };
}

/**
 * ============================================================
 * SINCRONIZZA LE VALUTAZIONI DI UN TORNEO
 * ============================================================
 *
 * Questa funzione considera ESCLUSIVAMENTE le squadre
 * partecipanti al torneo.
 *
 * Questo è importante perché lo stesso club può comparire
 * in più tornei con videogiochi differenti.
 *
 * Esempio:
 *
 * TORNEO A
 * Torino + FIFA 17 = 74
 *
 * TORNEO B
 * Torino + FIFA 19 = 78
 *
 * Il sistema utilizza due record distinti perché il
 * videogioco è parte della relazione.
 *
 * ============================================================
 */

export async function sincronizzaValutazioniTorneo(
  torneoId: number
) {
  const torneo = await prisma.torneo.findUnique({
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
    },
  });

  if (!torneo) {
    throw new Error("Torneo non trovato.");
  }

  if (!torneo.gioco) {
    return {
      successo: false,

      messaggio:
        "Il torneo non ha ancora un videogioco associato.",

      trovate: 0,

      aggiornate: 0,

      nonTrovate: [],
    };
  }

  /**
   * ==========================================================
   * SOLO LE SQUADRE DEL TORNEO
   * ==========================================================
   */

  const squadre: SquadraDaControllare[] =
    torneo.partecipazioni.map(
      (partecipazione) => ({
        id: partecipazione.squadra.id,

        nome: partecipazione.squadra.nome,
      })
    );

  /**
   * Recuperiamo i rating già presenti per questo
   * specifico videogioco.
   */
  const valutazioni =
    await prisma.valutazioneSquadraGioco.findMany({
      where: {
        videogiocoId: torneo.gioco.id,

        squadraId: {
          in: squadre.map(
            (squadra) => squadra.id
          ),
        },
      },

      select: {
        squadraId: true,
      },
    });

  /**
   * Squadre che hanno già un rating.
   */
  const squadreValutate = new Set(
    valutazioni.map(
      (valutazione) => valutazione.squadraId
    )
  );

  /**
   * Squadre del torneo che non hanno ancora
   * una valutazione per quel videogioco.
   */
  const nonTrovate = squadre
    .filter(
      (squadra) =>
        !squadreValutate.has(squadra.id)
    )
    .map(
      (squadra) => squadra.nome
    );

  return {
    successo: true,

    videogioco: torneo.gioco.nome,

    videogiocoId: torneo.gioco.id,

    trovate: valutazioni.length,

    /**
     * Nessuna modifica automatica.
     *
     * I rating vengono inseriti manualmente.
     */
    aggiornate: 0,

    nonTrovate,
  };
}