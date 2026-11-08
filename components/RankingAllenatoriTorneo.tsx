
import { prisma } from "@/lib/prisma";
import { getMoltiplicatoreFase } from "@/lib/ranking/formula";

type Esito = "VITTORIA" | "PAREGGIO" | "SCONFITTA";

type RigaRanking = {
  partecipanteId: number;
  nome: string;
  punti: number;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
};

function determinaEsiti(
  golCasa: number,
  golOspite: number,
  aiRigori: boolean,
  rigoriCasa: number | null,
  rigoriOspite: number | null
): { casa: Esito; ospite: Esito } {
  let risultatoCasa = golCasa;
  let risultatoOspite = golOspite;

  if (
    aiRigori &&
    golCasa === golOspite &&
    rigoriCasa !== null &&
    rigoriOspite !== null &&
    rigoriCasa !== rigoriOspite
  ) {
    risultatoCasa = rigoriCasa;
    risultatoOspite = rigoriOspite;
  }

  if (risultatoCasa > risultatoOspite) {
    return { casa: "VITTORIA", ospite: "SCONFITTA" };
  }

  if (risultatoCasa < risultatoOspite) {
    return { casa: "SCONFITTA", ospite: "VITTORIA" };
  }

  return { casa: "PAREGGIO", ospite: "PAREGGIO" };
}

function puntiBase(
  ruolo: "TITOLARE" | "SOSTITUTO",
  esito: Esito
): number {
  if (esito === "SCONFITTA") return 0;

  if (ruolo === "SOSTITUTO") {
    return esito === "VITTORIA" ? 6 : 2;
  }

  return esito === "VITTORIA" ? 3 : 1;
}

function colorePosizione(posizione: number) {
  if (posizione === 1) {
    return "bg-yellow-500/20 text-yellow-300";
  }

  if (posizione === 2) {
    return "bg-zinc-400/20 text-zinc-200";
  }

  if (posizione === 3) {
    return "bg-orange-500/20 text-orange-300";
  }

  return "bg-slate-800 text-slate-400";
}

export default async function RankingAllenatoriTorneo({
  torneoId,
}: {
  torneoId: number;
}) {
  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: {
      partecipazioni: {
        select: {
          squadraId: true,
          partecipante: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
      partite: {
        orderBy: [
          { dataPartita: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          Completata: true,
          SquadraCasaId: true,
          SquadraOspiteId: true,
          GolCasa: true,
          GolOspite: true,
          Fase: true,
          AiRigori: true,
          RigoriCasa: true,
          RigoriOspite: true,
          sostitutoCasa: {
            select: {
              id: true,
              nome: true,
            },
          },
          sostitutoOspite: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  });

  if (!torneo) return null;

  const ranking = new Map<number, RigaRanking>();

  function aggiungiAllenatore(
    partecipanteId: number,
    nome: string
  ) {
    if (!ranking.has(partecipanteId)) {
      ranking.set(partecipanteId, {
        partecipanteId,
        nome,
        punti: 0,
        partite: 0,
        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,
      });
    }
  }

  // Inserisce tutti gli allenatori titolari iscritti al torneo,
  // anche se non hanno ancora ottenuto punti.
  for (const partecipazione of torneo.partecipazioni) {
    if (partecipazione.partecipante) {
      aggiungiAllenatore(
        partecipazione.partecipante.id,
        partecipazione.partecipante.nome
      );
    }
  }

  // Inserisce anche gli eventuali sostituti registrati nelle partite.
  for (const partita of torneo.partite) {
    if (partita.sostitutoCasa) {
      aggiungiAllenatore(
        partita.sostitutoCasa.id,
        partita.sostitutoCasa.nome
      );
    }

    if (partita.sostitutoOspite) {
      aggiungiAllenatore(
        partita.sostitutoOspite.id,
        partita.sostitutoOspite.nome
      );
    }
  }

  const allenatorePerSquadra = new Map<number, number>();

  for (const partecipazione of torneo.partecipazioni) {
    if (partecipazione.partecipante) {
      allenatorePerSquadra.set(
        partecipazione.squadraId,
        partecipazione.partecipante.id
      );
    }
  }

  for (const partita of torneo.partite) {
    if (
      partita.Completata !== true ||
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const titolareCasa = allenatorePerSquadra.get(
      partita.SquadraCasaId
    );

    const titolareOspite = allenatorePerSquadra.get(
      partita.SquadraOspiteId
    );

    const esiti = determinaEsiti(
      partita.GolCasa,
      partita.GolOspite,
      partita.AiRigori,
      partita.RigoriCasa,
      partita.RigoriOspite
    );

    const moltiplicatore = getMoltiplicatoreFase(
      partita.Fase
    );

    const assegnazioni: {
      partecipanteId: number | undefined;
      ruolo: "TITOLARE" | "SOSTITUTO";
      esito: Esito;
    }[] = [
      {
        partecipanteId: titolareCasa,
        ruolo: "TITOLARE",
        esito: esiti.casa,
      },
      {
        partecipanteId: partita.sostitutoCasa?.id,
        ruolo: "SOSTITUTO",
        esito: esiti.casa,
      },
      {
        partecipanteId: titolareOspite,
        ruolo: "TITOLARE",
        esito: esiti.ospite,
      },
      {
        partecipanteId: partita.sostitutoOspite?.id,
        ruolo: "SOSTITUTO",
        esito: esiti.ospite,
      },
    ];

    // Evita che la stessa persona riceva due assegnazioni
    // nella medesima partita.
    const giaAssegnati = new Set<number>();

    for (const assegnazione of assegnazioni) {
      const id = assegnazione.partecipanteId;

      if (id === undefined || giaAssegnati.has(id)) {
        continue;
      }

      giaAssegnati.add(id);

      const riga = ranking.get(id);

      if (!riga) continue;

      riga.partite += 1;

      if (assegnazione.esito === "VITTORIA") {
        riga.vittorie += 1;
      } else if (assegnazione.esito === "PAREGGIO") {
        riga.pareggi += 1;
      } else {
        riga.sconfitte += 1;
      }

      riga.punti += Math.round(
        puntiBase(
          assegnazione.ruolo,
          assegnazione.esito
        ) * moltiplicatore
      );
    }
  }

  const classifica = Array.from(ranking.values()).sort(
    (a, b) => {
      if (b.punti !== a.punti) {
        return b.punti - a.punti;
      }

      if (b.vittorie !== a.vittorie) {
        return b.vittorie - a.vittorie;
      }

      return a.nome.localeCompare(b.nome, "it");
    }
  );

  return (
    <section className="mb-16">
      <p className="mb-6 max-w-3xl text-slate-400">
  Classifica basata esclusivamente sulle partite
  completate di questa competizione. I punti tengono
  conto del ruolo e della fase del torneo.
</p>

      {classifica.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-4xl">🏆</p>

          <h3 className="mt-4 text-xl font-bold">
            Ranking in attesa dei partecipanti
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Assegna gli allenatori alle squadre del torneo
            per iniziare a costruire la classifica.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-center">Pos.</th>
                  <th className="px-5 py-4 text-left">Allenatore</th>
                  <th className="px-3 py-4 text-center">PG</th>
                  <th className="px-3 py-4 text-center">V</th>
                  <th className="px-3 py-4 text-center">N</th>
                  <th className="px-3 py-4 text-center">P</th>
                  <th className="px-5 py-4 text-center">Punti</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {classifica.map((allenatore, index) => (
                  <tr
                    key={allenatore.partecipanteId}
                    className="transition hover:bg-slate-800/60"
                  >
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${colorePosizione(index + 1)}`}
                      >
                        {index + 1}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-lg">
                          👤
                        </div>

                        <span className="font-bold">
                          {allenatore.nome}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-center">
                      {allenatore.partite}
                    </td>

                    <td className="px-3 py-4 text-center text-green-400">
                      {allenatore.vittorie}
                    </td>

                    <td className="px-3 py-4 text-center">
                      {allenatore.pareggi}
                    </td>

                    <td className="px-3 py-4 text-center text-red-400">
                      {allenatore.sconfitte}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="text-xl font-black text-purple-400">
                        {allenatore.punti}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        pt
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
