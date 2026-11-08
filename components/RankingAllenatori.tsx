import { prisma } from "@/lib/prisma";

type RuoloAllenatore =
  | "TITOLARE_CASA"
  | "SOSTITUTO_CASA"
  | "TITOLARE_OSPITE"
  | "SOSTITUTO_OSPITE";

const ULTIME_PRESENZE = 10;

function formattaData(data: Date | null): string {
  if (!data) return "Data n.d.";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

function formattaRuolo(ruolo: string): string {
  return ruolo.startsWith("SOSTITUTO")
    ? "Sostituto"
    : "Titolare";
}

function etichettaEsito(esito: string): string {
  switch (esito) {
    case "VITTORIA":
      return "V";
    case "PAREGGIO":
      return "P";
    case "SCONFITTA":
      return "S";
    default:
      return "?";
  }
}

function coloreEsito(esito: string): string {
  switch (esito) {
    case "VITTORIA":
      return "border-green-500/30 bg-green-500/15 text-green-300";
    case "PAREGGIO":
      return "border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
    case "SCONFITTA":
      return "border-red-500/30 bg-red-500/15 text-red-300";
    default:
      return "border-slate-600 bg-slate-800 text-slate-300";
  }
}

export default async function RankingAllenatori() {
  const rankingDatabase = await prisma.rankingAllenatore.findMany({
    include: {
      partecipante: {
        select: {
          id: true,
          nome: true,
        },
      },
      storico: {
        include: {
          partita: {
            select: {
              id: true,
              dataPartita: true,
              TorneoId: true,
              SquadraCasaId: true,
              SquadraOspiteId: true,
              GolCasa: true,
              GolOspite: true,
              squadraCasa: {
                select: {
                  nome: true,
                },
              },
              squadraOspite: {
                select: {
                  nome: true,
                },
              },
              torneo: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Esclude la CPU soltanto da questa classifica e dalle
  // statistiche degli allenatori, senza cancellare alcun dato.
  const ranking = rankingDatabase.filter(
    (r) => r.partecipante.nome.trim().toLocaleLowerCase("it") !== "cpu"
  );

  ranking.sort((a, b) => {
    if (b.punti !== a.punti) {
      return b.punti - a.punti;
    }

    return a.partecipante.nome.localeCompare(
      b.partecipante.nome,
      "it"
    );
  });

  const rankingConStatistiche = ranking.map((r) => {
    const storicoOrdinato = [...r.storico].sort((a, b) => {
      const dataA = a.partita.dataPartita?.getTime() ?? null;
      const dataB = b.partita.dataPartita?.getTime() ?? null;

      if (dataA !== null && dataB !== null && dataA !== dataB) {
        return dataB - dataA;
      }

      if (dataA === null && dataB !== null) return 1;
      if (dataA !== null && dataB === null) return -1;

      if (a.partita.id !== b.partita.id) {
        return a.partita.id > b.partita.id ? -1 : 1;
      }

      return b.id - a.id;
    });

    const ultime = storicoOrdinato.slice(0, ULTIME_PRESENZE);

    const vittorie = ultime.filter(
      (s) => s.risultato === "VITTORIA"
    ).length;

    const pareggi = ultime.filter(
      (s) => s.risultato === "PAREGGIO"
    ).length;

    const sconfitte = ultime.filter(
      (s) => s.risultato === "SCONFITTA"
    ).length;

    const puntiRecenti = ultime.reduce(
      (totale, s) => totale + s.variazione,
      0
    );

    const titolare = ultime.filter(
      (s) => s.ruolo.startsWith("TITOLARE")
    ).length;

    const sostituto = ultime.filter(
      (s) => s.ruolo.startsWith("SOSTITUTO")
    ).length;

    const gol = ultime.reduce(
      (totale, s) => {
        const partita = s.partita;

        if (
          partita.GolCasa === null ||
          partita.GolOspite === null
        ) {
          return totale;
        }

        const ruolo = s.ruolo as RuoloAllenatore;
        const casa = ruolo.endsWith("CASA");

        return {
          fatti:
            totale.fatti +
            (casa ? partita.GolCasa : partita.GolOspite),
          subiti:
            totale.subiti +
            (casa ? partita.GolOspite : partita.GolCasa),
        };
      },
      { fatti: 0, subiti: 0 }
    );

    return {
      ...r,
      ultime,
      statistiche: {
        presenze: ultime.length,
        vittorie,
        pareggi,
        sconfitte,
        puntiRecenti,
        titolare,
        sostituto,
        percentualeVittorie:
          ultime.length > 0
            ? Math.round((vittorie / ultime.length) * 100)
            : 0,
        golFatti: gol.fatti,
        golSubiti: gol.subiti,
      },
    };
  });

  return (
    <section className="mb-16">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-purple-400">
          Classifica allenatori
        </p>

        <h2 className="mt-2 text-3xl font-black">
          🧑‍💼 Ranking Allenatori
        </h2>

        <p className="mt-2 max-w-3xl text-slate-400">
          Classifica individuale basata sui risultati delle partite,
          sul ruolo di titolare o sostituto e sul peso della fase
          della competizione.
        </p>
      </div>

      {rankingConStatistiche.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-4 text-lg font-bold">
            Ranking allenatori non ancora disponibile
          </p>
          <p className="mt-2 text-sm text-slate-400">
            La classifica apparirà quando saranno presenti i dati
            del ranking nel database.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-center">Pos.</th>
                  <th className="px-4 py-4 text-left">Allenatore</th>
                  <th className="px-4 py-4 text-center">Punti</th>
                  <th className="px-4 py-4 text-center">Dettagli</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {rankingConStatistiche.map((r, index) => (
                  <tr key={r.id} className="group">
                    <td colSpan={4} className="p-0">
                      <details className="group/details">
                        <summary className="grid cursor-pointer list-none grid-cols-[56px_minmax(0,1fr)_90px_88px] items-center transition hover:bg-slate-800/60 [&::-webkit-details-marker]:hidden">
                          <span className="flex justify-center px-2 py-4">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full font-black ${
                                index === 0
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : index === 1
                                    ? "bg-zinc-400/20 text-zinc-200"
                                    : index === 2
                                      ? "bg-orange-500/20 text-orange-300"
                                      : "text-slate-400"
                              }`}
                            >
                              {index + 1}
                            </span>
                          </span>

                          <span className="min-w-0 px-3 py-4">
                            <span className="block truncate font-bold">
                              {r.partecipante.nome}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {r.statistiche.presenze} presenze recenti
                            </span>
                          </span>

                          <span className="px-2 py-4 text-center">
                            <span className="text-xl font-black text-purple-400">
                              {r.punti}
                            </span>
                            <span className="ml-1 text-xs text-slate-500">
                              pt
                            </span>
                          </span>

                          <span className="flex items-center justify-center gap-2 px-2 py-4 text-xs font-bold text-purple-300">
                            Apri
                            <span className="transition-transform group-open/details:rotate-180">
                              ▼
                            </span>
                          </span>
                        </summary>

                        <div className="border-t border-slate-800 bg-slate-950/40 p-4 sm:p-6">
                          <h3 className="mb-4 text-base font-black">
                            Forma recente — ultime {r.statistiche.presenze} presenze
                          </h3>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs text-slate-500">Vittorie</p>
                              <p className="mt-1 text-2xl font-black text-green-400">
                                {r.statistiche.vittorie}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs text-slate-500">Pareggi</p>
                              <p className="mt-1 text-2xl font-black text-yellow-300">
                                {r.statistiche.pareggi}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs text-slate-500">Sconfitte</p>
                              <p className="mt-1 text-2xl font-black text-red-400">
                                {r.statistiche.sconfitte}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs text-slate-500">% vittorie</p>
                              <p className="mt-1 text-2xl font-black">
                                {r.statistiche.percentualeVittorie}%
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs text-slate-500">Punti recenti</p>
                              <p className="mt-1 text-2xl font-black text-purple-400">
                                {r.statistiche.puntiRecenti}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                              <p className="text-xs text-slate-500">Gol fatti/subiti</p>
                              <p className="mt-1 text-xl font-black">
                                {r.statistiche.golFatti}
                                <span className="mx-1 text-slate-600">/</span>
                                {r.statistiche.golSubiti}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-slate-700 px-3 py-2 text-slate-300">
                              Titolare: <strong>{r.statistiche.titolare}</strong>
                            </span>
                            <span className="rounded-full border border-slate-700 px-3 py-2 text-slate-300">
                              Sostituto: <strong>{r.statistiche.sostituto}</strong>
                            </span>
                          </div>

                          {r.ultime.length > 0 ? (
                            <div className="mt-6">
                              <h4 className="mb-3 text-sm font-bold text-slate-300">
                                Partite recenti
                              </h4>

                              <div className="space-y-2">
                                {r.ultime.map((s) => {
                                  const partita = s.partita;
                                  const ruolo = s.ruolo as RuoloAllenatore;

                                  return (
                                    <div
                                      key={s.id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold">
                                          {partita.squadraCasa?.nome ?? "Casa"}
                                          {" "}
                                          <span className="text-slate-400">
                                            {partita.GolCasa ?? "–"} - {partita.GolOspite ?? "–"}
                                          </span>
                                          {" "}
                                          {partita.squadraOspite?.nome ?? "Ospite"}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          {formattaData(partita.dataPartita)}
                                          {" · "}
                                          {partita.torneo.nome}
                                          {" · "}
                                          {formattaRuolo(s.ruolo)}
                                        </p>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-2">
                                        <span
                                          className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${coloreEsito(s.risultato)}`}
                                          title={s.risultato}
                                        >
                                          {etichettaEsito(s.risultato)}
                                        </span>

                                        <span
                                          className={`min-w-12 text-right text-sm font-black ${
                                            s.variazione > 0
                                              ? "text-green-400"
                                              : s.variazione < 0
                                                ? "text-red-400"
                                                : "text-slate-400"
                                          }`}
                                        >
                                          {s.variazione > 0 ? "+" : ""}
                                          {s.variazione} pt
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-5 text-sm text-slate-500">
                              Nessuna presenza registrata nello storico.
                            </p>
                          )}
                        </div>
                      </details>
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
