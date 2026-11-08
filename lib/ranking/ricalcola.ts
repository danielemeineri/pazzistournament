import {
  TipoRanking,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  calcolaRankingPartita,
  getTipiRankingSquadra,
} from "./calcola";

// =========================================================
// RICALCOLO COMPLETO DEL RANKING
// =========================================================
//
// Il ranking viene ricostruito completamente da zero.
//
// NON vengono modificati:
// - Tornei
// - Partite
// - Gol
// - Squadre
// - Partecipazioni
//
// Vengono ricostruiti solamente:
// - RankingSquadra
// - StoricoRankingSquadra
//
// Il calcolo viene effettuato principalmente IN MEMORIA,
// evitando centinaia di query al database.
// =========================================================

export async function ricalcolaRankingCompleto(): Promise<{
  partiteElaborate: number;
  partiteRanking: number;
  variazioniCreate: number;
}> {
  return prisma.$transaction(
    async (tx) => {
      // =====================================================
      // 1. CARICAMENTO SQUADRE
      // =====================================================

      const squadre =
        await tx.squadra.findMany({
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
          orderBy: {
            id: "asc",
          },
        });

      // =====================================================
      // 2. CANCELLAZIONE RANKING PRECEDENTE
      // =====================================================
      //
      // Cancella esclusivamente i dati derivati dal ranking.
      // =====================================================

      await tx.storicoRankingSquadra.deleteMany({});

      await tx.rankingSquadra.deleteMany({});

      // =====================================================
      // 3. CREAZIONE RANKING INIZIALI
      // =====================================================

      const rankingDaCreare: {
        squadraId: number;
        tipo: TipoRanking;
        rating: number;
      }[] = [];

      for (const squadra of squadre) {
        const tipi =
          getTipiRankingSquadra(
            squadra.tipo
          );

        for (const tipo of tipi) {
          rankingDaCreare.push({
            squadraId: squadra.id,
            tipo,
            rating: 0,
          });
        }
      }

      if (rankingDaCreare.length > 0) {
        await tx.rankingSquadra.createMany({
          data: rankingDaCreare,
          skipDuplicates: true,
        });
      }

      // =====================================================
      // 4. CARICAMENTO RANKING APPENA CREATI
      // =====================================================
      //
      // Una sola query.
      //
      // Creiamo una mappa:
      //
      // "squadraId:tipo"
      //        ↓
      // { id, rating }
      //
      // In questo modo non dobbiamo più fare findUnique()
      // durante l'elaborazione delle partite.
      // =====================================================

      const rankingDatabase =
        await tx.rankingSquadra.findMany({
          select: {
            id: true,
            squadraId: true,
            tipo: true,
            rating: true,
          },
        });

      const rankingMap = new Map<
        string,
        {
          id: number;
          squadraId: number;
          tipo: TipoRanking;
          rating: number;
        }
      >();

      for (const ranking of rankingDatabase) {
        rankingMap.set(
          `${ranking.squadraId}:${ranking.tipo}`,
          {
            id: ranking.id,
            squadraId: ranking.squadraId,
            tipo: ranking.tipo,
            rating: ranking.rating,
          }
        );
      }

      // =====================================================
      // 5. CARICAMENTO PARTITE
      // =====================================================

      const partite =
        await tx.partita.findMany({
          where: {
            Completata: true,

            SquadraCasaId: {
              not: null,
            },

            SquadraOspiteId: {
              not: null,
            },

            GolCasa: {
              not: null,
            },

            GolOspite: {
              not: null,
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

          select: {
            id: true,
            dataPartita: true,

            SquadraCasaId: true,
            SquadraOspiteId: true,

            GolCasa: true,
            GolOspite: true,

            Fase: true,

            AiRigori: true,
            RigoriCasa: true,
            RigoriOspite: true,

            squadraCasa: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },

            squadraOspite: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },

            gol: {
              select: {
                periodo: true,
              },
            },
          },
        });

      // =====================================================
      // 6. MAPPA RATING IN MEMORIA
      // =====================================================

      const rating = new Map<
        string,
        number
      >();

      for (const ranking of rankingDatabase) {
        rating.set(
          `${ranking.squadraId}:${ranking.tipo}`,
          ranking.rating
        );
      }

      // =====================================================
      // 7. STORICO DA CREARE
      // =====================================================
      //
      // Non scriviamo immediatamente ogni record.
      //
      // Li accumuliamo in memoria e alla fine facciamo
      // un unico createMany().
      // =====================================================

      const storicoDaCreare: {
        rankingSquadraId: number;
        partitaId: bigint;
        ratingPrima: number;
        variazione: number;
        ratingDopo: number;
        fase: string | null;
        risultato: string;
      }[] = [];

      // =====================================================
      // 8. RATING FINALI
      // =====================================================
      //
      // Questa mappa servirà per aggiornare alla fine
      // i record RankingSquadra.
      // =====================================================

      const ratingFinali = new Map<
        number,
        number
      >();

      let partiteRanking = 0;

      // =====================================================
      // 9. ELABORAZIONE CRONOLOGICA
      // =====================================================

      for (const partita of partite) {
        // ---------------------------------------------------
        // CONTROLLO DATI
        // ---------------------------------------------------

        if (
          partita.SquadraCasaId === null ||
          partita.SquadraOspiteId === null ||
          partita.GolCasa === null ||
          partita.GolOspite === null ||
          partita.squadraCasa === null ||
          partita.squadraOspite === null
        ) {
          continue;
        }

        // ---------------------------------------------------
        // RANKING COMUNI
        // ---------------------------------------------------

        const tipiDaAggiornare =
          getTipiRankingPartitaLocale(
            partita.squadraCasa.tipo,
            partita.squadraOspite.tipo
          );

        if (
          tipiDaAggiornare.length === 0
        ) {
          continue;
        }

        partiteRanking++;

        // ---------------------------------------------------
        // PRESENZA SUPPLEMENTARI
        // ---------------------------------------------------

        const presenzaSupplementari =
          partita.gol.some(
            (gol) =>
              gol.periodo ===
              "SUPPLEMENTARI"
          );

        // ---------------------------------------------------
        // ELABORAZIONE DEI RANKING
        // ---------------------------------------------------

        for (const tipo of tipiDaAggiornare) {
          const chiaveCasa =
            `${partita.SquadraCasaId}:${tipo}`;

          const chiaveOspite =
            `${partita.SquadraOspiteId}:${tipo}`;

          // -------------------------------------------------
          // CONTROLLO RANKING CASA
          // -------------------------------------------------

          const rankingCasa =
            rankingMap.get(
              chiaveCasa
            );

          // -------------------------------------------------
          // CONTROLLO RANKING OSPITE
          // -------------------------------------------------

          const rankingOspite =
            rankingMap.get(
              chiaveOspite
            );

          if (
            !rankingCasa ||
            !rankingOspite
          ) {
            throw new Error(
              [
                "RANKING NON INIZIALIZZATO.",
                `Partita: ${partita.id.toString()}`,
                `Tipo: ${tipo}`,
                `Casa: ${partita.squadraCasa.nome}`,
                `Ospite: ${partita.squadraOspite.nome}`,
              ].join(" ")
            );
          }

          // -------------------------------------------------
          // RATING ATTUALI
          // -------------------------------------------------

          const ratingCasa =
            rating.get(
              chiaveCasa
            ) ?? 0;

          const ratingOspite =
            rating.get(
              chiaveOspite
            ) ?? 0;

          // -------------------------------------------------
          // CALCOLO
          // -------------------------------------------------

          const calcolo =
            calcolaRankingPartita({
              tipo,

              squadraCasaId:
                partita.SquadraCasaId,

              squadraOspiteId:
                partita.SquadraOspiteId,

              tipoSquadraCasa:
                partita.squadraCasa.tipo,

              tipoSquadraOspite:
                partita.squadraOspite.tipo,

              ratingCasa,

              ratingOspite,

              golCasa:
                partita.GolCasa,

              golOspite:
                partita.GolOspite,

              aiRigori:
                partita.AiRigori,

              rigoriCasa:
                partita.RigoriCasa,

              rigoriOspite:
                partita.RigoriOspite,

              fase:
                partita.Fase,

              presenzaSupplementari,
            });

          if (!calcolo) {
            throw new Error(
              [
                "CALCOLO RANKING NON VALIDO.",
                `Partita: ${partita.id.toString()}`,
                `Tipo: ${tipo}`,
                `Casa: ${partita.squadraCasa.nome}`,
                `Ospite: ${partita.squadraOspite.nome}`,
              ].join(" ")
            );
          }

          // -------------------------------------------------
          // AGGIORNAMENTO RATING IN MEMORIA
          // -------------------------------------------------

          rating.set(
            chiaveCasa,
            calcolo.ratingCasaDopo
          );

          rating.set(
            chiaveOspite,
            calcolo.ratingOspiteDopo
          );

          // -------------------------------------------------
          // SALVATAGGIO RATING FINALE
          // -------------------------------------------------

          ratingFinali.set(
            rankingCasa.id,
            calcolo.ratingCasaDopo
          );

          ratingFinali.set(
            rankingOspite.id,
            calcolo.ratingOspiteDopo
          );

          // -------------------------------------------------
          // STORICO CASA
          // -------------------------------------------------

          storicoDaCreare.push({
            rankingSquadraId:
              rankingCasa.id,

            partitaId:
              partita.id,

            ratingPrima:
              calcolo.ratingCasaPrima,

            variazione:
              calcolo.variazioneCasa,

            ratingDopo:
              calcolo.ratingCasaDopo,

            fase:
              calcolo.fase,

            risultato:
              calcolo.esitoCasa,
          });

          // -------------------------------------------------
          // STORICO OSPITE
          // -------------------------------------------------

          storicoDaCreare.push({
            rankingSquadraId:
              rankingOspite.id,

            partitaId:
              partita.id,

            ratingPrima:
              calcolo.ratingOspitePrima,

            variazione:
              calcolo.variazioneOspite,

            ratingDopo:
              calcolo.ratingOspiteDopo,

            fase:
              calcolo.fase,

            risultato:
              calcolo.esitoOspite,
          });
        }
      }

      // =====================================================
      // 10. CREAZIONE STORICO
      // =====================================================
      //
      // Un'unica operazione invece di due INSERT per partita.
      // =====================================================

      if (
        storicoDaCreare.length > 0
      ) {
        await tx.storicoRankingSquadra.createMany({
          data: storicoDaCreare,
          skipDuplicates: true,
        });
      }

      // =====================================================
      // 11. AGGIORNAMENTO RATING FINALI
      // =====================================================
      //
      // I rating sono già stati calcolati tutti in memoria.
      //
      // Aggiorniamo soltanto i record che hanno realmente
      // partecipato ad almeno una partita.
      // =====================================================

      const aggiornamenti =
        Array.from(
          ratingFinali.entries()
        );

      // -----------------------------------------------------
      // Aggiornamenti a piccoli blocchi.
      //
      // Evitiamo di creare una quantità enorme di query
      // simultanee.
      // -----------------------------------------------------

      const DIMENSIONE_BLOCCO = 25;

      for (
        let i = 0;
        i < aggiornamenti.length;
        i += DIMENSIONE_BLOCCO
      ) {
        const blocco =
          aggiornamenti.slice(
            i,
            i + DIMENSIONE_BLOCCO
          );

        await Promise.all(
          blocco.map(
            ([rankingId, ratingFinale]) =>
              tx.rankingSquadra.update({
                where: {
                  id: rankingId,
                },
                data: {
                  rating: ratingFinale,
                },
              })
          )
        );
      }

      // =====================================================
      // 12. RISULTATO
      // =====================================================

      return {
        partiteElaborate:
          partite.length,

        partiteRanking,

        variazioniCreate:
          storicoDaCreare.length,
      };
    },

    {
      maxWait: 10000,

      // Il codice ora è molto più veloce.
      // Manteniamo comunque un margine di sicurezza.
      timeout: 180000,
    }
  );
}

// =========================================================
// RANKING COMUNI TRA LE DUE SQUADRE
// =========================================================
//
// Nazionale + Nazionale:
//   NAZIONALE
//   MISTO
//
// Club + Club:
//   CLUB
//   MISTO
//
// Nazionale + Club:
//   MISTO
// =========================================================

function getTipiRankingPartitaLocale(
  tipoCasa: string,
  tipoOspite: string
): TipoRanking[] {
  const rankingCasa =
    getTipiRankingSquadra(
      tipoCasa
    );

  const rankingOspite =
    getTipiRankingSquadra(
      tipoOspite
    );

  return rankingCasa.filter(
    (tipo) =>
      rankingOspite.includes(tipo)
  );
}