
import { prisma } from "@/lib/prisma";
import { getMoltiplicatoreFase, determinaEsiti } from "@/lib/ranking/formula";

// =========================================================
// RICALCOLO COMPLETO DEL RANKING ALLENATORI
// =========================================================
//
// Il ranking è separato da quello delle squadre.
// I punti vengono ricostruiti da zero, in ordine cronologico.
//
// Titolare:
//   Vittoria 3, Pareggio 1, Sconfitta 0
//
// Sostituto:
//   Vittoria 6, Pareggio 2, Sconfitta 0
//
// I punti sono moltiplicati per il peso della fase.
// =========================================================

type RuoloAllenatore =
  | "TITOLARE_CASA"
  | "SOSTITUTO_CASA"
  | "TITOLARE_OSPITE"
  | "SOSTITUTO_OSPITE";

type Esito = "VITTORIA" | "PAREGGIO" | "SCONFITTA";

function puntiBase(ruolo: RuoloAllenatore, esito: Esito): number {
  if (esito === "SCONFITTA") return 0;

  const sostituto = ruolo.startsWith("SOSTITUTO");

  if (esito === "PAREGGIO") {
    return sostituto ? 2 : 1;
  }

  return sostituto ? 6 : 3;
}

function calcolaPunti(
  ruolo: RuoloAllenatore,
  esito: Esito,
  fase: string | null
): number {
  return Math.round(
    puntiBase(ruolo, esito) * getMoltiplicatoreFase(fase)
  );
}

export async function ricalcolaRankingAllenatoriCompleto(): Promise<{
  partecipantiElaborati: number;
  partiteElaborate: number;
  variazioniCreate: number;
}> {
  return prisma.$transaction(
    async (tx) => {
      // -----------------------------------------------------
      // 1. Carica tutti i partecipanti
      // -----------------------------------------------------

      const partecipanti = await tx.partecipante.findMany({
        select: {
          id: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      // -----------------------------------------------------
      // 2. Elimina soltanto il ranking allenatori precedente
      // -----------------------------------------------------

      await tx.storicoRankingAllenatore.deleteMany({});
      await tx.rankingAllenatore.deleteMany({});

      if (partecipanti.length > 0) {
        await tx.rankingAllenatore.createMany({
          data: partecipanti.map((p) => ({
            partecipanteId: p.id,
            punti: 0,
          })),
          skipDuplicates: true,
        });
      }

      const rankingDatabase = await tx.rankingAllenatore.findMany({
        select: {
          id: true,
          partecipanteId: true,
        },
      });

      const rankingIdPerPartecipante = new Map<number, number>();

      for (const ranking of rankingDatabase) {
        rankingIdPerPartecipante.set(
          ranking.partecipanteId,
          ranking.id
        );
      }

      const puntiPerPartecipante = new Map<number, number>();

      for (const partecipante of partecipanti) {
        puntiPerPartecipante.set(partecipante.id, 0);
      }

      // -----------------------------------------------------
      // 3. Carica le partite concluse e i titolari del torneo
      // -----------------------------------------------------

      const partite = await tx.partita.findMany({
        where: {
          Completata: true,
          SquadraCasaId: { not: null },
          SquadraOspiteId: { not: null },
          GolCasa: { not: null },
          GolOspite: { not: null },
        },
        orderBy: [
          { dataPartita: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          TorneoId: true,
          dataPartita: true,
          SquadraCasaId: true,
          SquadraOspiteId: true,
          GolCasa: true,
          GolOspite: true,
          Fase: true,
          AiRigori: true,
          RigoriCasa: true,
          RigoriOspite: true,
          sostitutoCasaId: true,
          sostitutoOspiteId: true,
          torneo: {
            select: {
              partecipazioni: {
                select: {
                  squadraId: true,
                  partecipanteId: true,
                },
              },
            },
          },
        },
      });

      const storicoDaCreare: {
        rankingAllenatoreId: number;
        partitaId: bigint;
        puntiPrima: number;
        variazione: number;
        puntiDopo: number;
        ruolo: string;
        fase: string | null;
        risultato: string;
      }[] = [];

      let partiteElaborate = 0;

      // -----------------------------------------------------
      // 4. Elabora le partite in ordine cronologico
      // -----------------------------------------------------

      for (const partita of partite) {
        const {
          SquadraCasaId,
          SquadraOspiteId,
          GolCasa,
          GolOspite,
        } = partita;

        if (
          SquadraCasaId === null ||
          SquadraOspiteId === null ||
          GolCasa === null ||
          GolOspite === null
        ) {
          continue;
        }

        const partecipazioneCasa =
          partita.torneo.partecipazioni.find(
            (p) => p.squadraId === SquadraCasaId
          );

        const partecipazioneOspite =
          partita.torneo.partecipazioni.find(
            (p) => p.squadraId === SquadraOspiteId
          );

        const esiti = determinaEsiti(
          GolCasa,
          GolOspite,
          partita.AiRigori,
          partita.RigoriCasa,
          partita.RigoriOspite
        );

        const assegnazioni: {
          partecipanteId: number | null;
          ruolo: RuoloAllenatore;
          esito: Esito;
        }[] = [
          {
            partecipanteId: partecipazioneCasa?.partecipanteId ?? null,
            ruolo: "TITOLARE_CASA",
            esito: esiti.esitoCasa,
          },
          {
            partecipanteId: partita.sostitutoCasaId,
            ruolo: "SOSTITUTO_CASA",
            esito: esiti.esitoCasa,
          },
          {
            partecipanteId: partecipazioneOspite?.partecipanteId ?? null,
            ruolo: "TITOLARE_OSPITE",
            esito: esiti.esitoOspite,
          },
          {
            partecipanteId: partita.sostitutoOspiteId,
            ruolo: "SOSTITUTO_OSPITE",
            esito: esiti.esitoOspite,
          },
        ];

        // Evita di assegnare più premi alla stessa persona
        // nella medesima partita se è stata selezionata per errore
        // in più ruoli. La prima assegnazione valida prevale.
        const partecipantiGiaElaborati = new Set<number>();

        for (const assegnazione of assegnazioni) {
          const partecipanteId = assegnazione.partecipanteId;

          if (
            partecipanteId === null ||
            partecipantiGiaElaborati.has(partecipanteId)
          ) {
            continue;
          }

          const rankingAllenatoreId =
            rankingIdPerPartecipante.get(partecipanteId);

          if (rankingAllenatoreId === undefined) {
            continue;
          }

          partecipantiGiaElaborati.add(partecipanteId);

          const prima =
            puntiPerPartecipante.get(partecipanteId) ?? 0;

          const variazione = calcolaPunti(
            assegnazione.ruolo,
            assegnazione.esito,
            partita.Fase
          );

          const dopo = prima + variazione;

          puntiPerPartecipante.set(partecipanteId, dopo);

          storicoDaCreare.push({
            rankingAllenatoreId,
            partitaId: partita.id,
            puntiPrima: prima,
            variazione,
            puntiDopo: dopo,
            ruolo: assegnazione.ruolo,
            fase: partita.Fase,
            risultato: assegnazione.esito,
          });
        }

        partiteElaborate++;
      }

      // -----------------------------------------------------
      // 5. Salva lo storico ricostruito
      // -----------------------------------------------------

      if (storicoDaCreare.length > 0) {
        await tx.storicoRankingAllenatore.createMany({
          data: storicoDaCreare,
        });
      }

      // -----------------------------------------------------
      // 6. Aggiorna i punti totali
      // -----------------------------------------------------

      const aggiornamenti = Array.from(
        rankingIdPerPartecipante.entries()
      );

      const DIMENSIONE_BLOCCO = 25;

      for (
        let i = 0;
        i < aggiornamenti.length;
        i += DIMENSIONE_BLOCCO
      ) {
        const blocco = aggiornamenti.slice(
          i,
          i + DIMENSIONE_BLOCCO
        );

        await Promise.all(
          blocco.map(([partecipanteId, rankingId]) =>
            tx.rankingAllenatore.update({
              where: {
                id: rankingId,
              },
              data: {
                punti:
                  puntiPerPartecipante.get(partecipanteId) ?? 0,
              },
            })
          )
        );
      }

      return {
        partecipantiElaborati: partecipanti.length,
        partiteElaborate,
        variazioniCreate: storicoDaCreare.length,
      };
    },
    {
      maxWait: 10000,
      timeout: 180000,
    }
  );
}
