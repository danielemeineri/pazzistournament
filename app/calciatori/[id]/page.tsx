import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type StatTorneo = {
  torneoId: number;
  torneoNome: string;
  anno: number;
  squadraId: number;
  squadraNome: string;
  squadraStemma: string | null;
  gol: number;
  rigori: number;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  trofei: number;
};

function immagineTrofeo(tipo: string): string | null {
  const immagini: Record<string, string> = {
    MIGLIOR_MARCATORE: "/trofei/trofeo-capocannoniere.png",
    MIGLIOR_ASSISTMAN: "/trofei/miglior-assistman.png",
    MIGLIOR_PORTIERE: "/trofei/miglior-portiere.png",
    MIGLIOR_MOMENTO: "/trofei/miglior-momento.png",
    SQUADRA_SORPRESA: "/trofei/premio-sorpresa.png",
  };
  return immagini[tipo] ?? null;
}

function percentuale(
  valore: number,
  totale: number
) {
  if (totale === 0) return "0%";

  return `${Math.round(
    (valore / totale) * 100
  )}%`;
}

export default async function CalciatorePage({
  params,
}: Props) {
  const { id } = await params;

  const calciatoreId = Number(id);

  if (!Number.isInteger(calciatoreId)) {
    notFound();
  }

  const calciatore =
    await prisma.calciatore.findUnique({
      where: {
        id: calciatoreId,
      },

      include: {
        partecipazioni: {
          include: {
            torneo: true,

            squadra: true,

            gol: {
              include: {
                partita: true,
              },
            },

            cartelliniRossi: true,

            trofeiVinti: {
              include: {
                torneo: true,
              },
            },
          },

          orderBy: {
            torneo: {
              anno: "desc",
            },
          },
        },
      },
    });

  if (!calciatore) {
    notFound();
  }

  // =========================================================
  // IDENTIFICAZIONE TORNEI E SQUADRE
  // =========================================================

  const chiaviSquadraTorneo =
    calciatore.partecipazioni.map(
      (partecipazione) => ({
        torneoId: partecipazione.torneoId,
        squadraId: partecipazione.squadraId,
      })
    );

  // =========================================================
  // PARTITE DELLE SQUADRE DEL GIOCATORE
  // =========================================================

  const partite =
    chiaviSquadraTorneo.length > 0
      ? await prisma.partita.findMany({
          where: {
            Completata: true,

            GolCasa: {
              not: null,
            },

            GolOspite: {
              not: null,
            },

            OR: [
              {
                AND: [
                  {
                    TorneoId: {
                      in: chiaviSquadraTorneo.map(
                        (item) =>
                          item.torneoId
                      ),
                    },
                  },
                  {
                    SquadraCasaId: {
                      in: chiaviSquadraTorneo.map(
                        (item) =>
                          item.squadraId
                      ),
                    },
                  },
                ],
              },

              {
                AND: [
                  {
                    TorneoId: {
                      in: chiaviSquadraTorneo.map(
                        (item) =>
                          item.torneoId
                      ),
                    },
                  },
                  {
                    SquadraOspiteId: {
                      in: chiaviSquadraTorneo.map(
                        (item) =>
                          item.squadraId
                      ),
                    },
                  },
                ],
              },
            ],
          },

          include: {
            squadraCasa: true,
            squadraOspite: true,
          },

          orderBy: [
            {
              dataPartita: "desc",
            },
            {
              OraPartita: "desc",
            },
          ],
        })
      : [];

  // =========================================================
  // MAPPA STATISTICHE PER TORNEO / SQUADRA
  // =========================================================

  const statisticheMap =
    new Map<string, StatTorneo>();

  for (const partecipazione of calciatore.partecipazioni) {
    const chiave =
      `${partecipazione.torneoId}-${partecipazione.squadraId}`;

    const golNormali =
      partecipazione.gol.filter(
        (gol) =>
          gol.tipo === "NORMALE"
      ).length;

    const rigori =
      partecipazione.gol.filter(
        (gol) =>
          gol.tipo === "RIGORE"
      ).length;

    const trofei =
      partecipazione.trofeiVinti.length;

    statisticheMap.set(
      chiave,
      {
        torneoId:
          partecipazione.torneoId,

        torneoNome:
          partecipazione.torneo.nome,

        anno:
          partecipazione.torneo.anno,

        squadraId:
          partecipazione.squadraId,

        squadraNome:
          partecipazione.squadra.nome,

        squadraStemma:
          partecipazione.squadra.stemma,

        gol:
          golNormali + rigori,

        rigori,

        partite: 0,
        vittorie: 0,
        pareggi: 0,
        sconfitte: 0,

        trofei,
      }
    );
  }

  // =========================================================
  // RISULTATI DELLE SQUADRE
  // =========================================================

  for (const partita of partite) {
    if (
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const squadreInteressate =
      chiaviSquadraTorneo.filter(
        (item) =>
          item.torneoId ===
            partita.TorneoId &&
          (
            item.squadraId ===
              partita.SquadraCasaId ||
            item.squadraId ===
              partita.SquadraOspiteId
          )
      );

    for (const interesse of squadreInteressate) {
      const chiave =
        `${interesse.torneoId}-${interesse.squadraId}`;

      const statistiche =
        statisticheMap.get(chiave);

      if (!statistiche) {
        continue;
      }

      const isCasa =
        interesse.squadraId ===
        partita.SquadraCasaId;

      const golFatti = isCasa
        ? partita.GolCasa
        : partita.GolOspite;

      const golSubiti = isCasa
        ? partita.GolOspite
        : partita.GolCasa;

      statistiche.partite += 1;

      if (golFatti > golSubiti) {
        statistiche.vittorie += 1;
      } else if (
        golFatti < golSubiti
      ) {
        statistiche.sconfitte += 1;
      } else {
        // Se la partita è finita ai rigori,
        // consideriamo vincitrice la squadra
        // che ha segnato più rigori.
        if (
          partita.AiRigori &&
          partita.RigoriCasa !== null &&
          partita.RigoriOspite !== null
        ) {
          const rigoriVinti =
            isCasa
              ? partita.RigoriCasa >
                partita.RigoriOspite
              : partita.RigoriOspite >
                partita.RigoriCasa;

          const rigoriPersi =
            isCasa
              ? partita.RigoriCasa <
                partita.RigoriOspite
              : partita.RigoriOspite <
                partita.RigoriCasa;

          if (rigoriVinti) {
            statistiche.vittorie += 1;
          } else if (rigoriPersi) {
            statistiche.sconfitte += 1;
          } else {
            statistiche.pareggi += 1;
          }
        } else {
          statistiche.pareggi += 1;
        }
      }
    }
  }

  const statisticheTornei =
    Array.from(
      statisticheMap.values()
    ).sort((a, b) => {
      if (b.anno !== a.anno) {
        return b.anno - a.anno;
      }

      return a.torneoNome.localeCompare(
        b.torneoNome
      );
    });

  // =========================================================
  // STATISTICHE TOTALI
  // =========================================================

  const golTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.gol,
      0
    );

  const rigoriTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.rigori,
      0
    );

  const golNormaliTotali =
    golTotali - rigoriTotali;

  const partiteTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.partite,
      0
    );

  const vittorieTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.vittorie,
      0
    );

  const pareggiTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.pareggi,
      0
    );

  const sconfitteTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.sconfitte,
      0
    );

  const trofeiTotali =
    statisticheTornei.reduce(
      (totale, torneo) =>
        totale + torneo.trofei,
      0
    );

  const cartelliniRossi =
    calciatore.partecipazioni.reduce(
      (totale, partecipazione) =>
        totale +
        partecipazione.cartelliniRossi
          .length,
      0
    );

  const torneiDisputati =
    new Set(
      statisticheTornei.map(
        (torneo) => torneo.torneoId
      )
    ).size;

  const squadreUtilizzate =
    new Set(
      statisticheTornei.map(
        (torneo) => torneo.squadraId
      )
    ).size;

  const mediaGol =
    partiteTotali > 0
      ? (
          golTotali /
          partiteTotali
        ).toFixed(2)
      : "0.00";

  const percentualeVittorie =
    percentuale(
      vittorieTotali,
      partiteTotali
    );

  const migliorTorneo =
    statisticheTornei.length > 0
      ? [...statisticheTornei].sort(
          (a, b) => {
            if (b.gol !== a.gol) {
              return b.gol - a.gol;
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

            return b.anno - a.anno;
          }
        )[0]
      : null;

  // =========================================================
  // TROFEI INDIVIDUALI
  // =========================================================

  const trofeiIndividuali =
    calciatore.partecipazioni.flatMap(
      (partecipazione) =>
        partecipazione.trofeiVinti.map(
          (trofeo) => ({
            ...trofeo,
            squadra:
              partecipazione.squadra,
          })
        )
    );

  return (
    <main className="min-h-screen bg-[#050b18] text-white selection:bg-amber-300 selection:text-slate-950">
      <div className="relative isolate overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_15%,rgba(45,93,178,0.33),transparent_48%),radial-gradient(ellipse_at_15%_90%,rgba(191,139,47,0.16),transparent_50%),linear-gradient(135deg,#071126,#050b18_65%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-9 sm:px-8 sm:pb-20">
          <Link href="/calciatori" className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur transition hover:border-amber-300/50 hover:text-amber-200"><span className="transition group-hover:-translate-x-1">←</span> Archivio calciatori</Link>
          <div className="mt-12 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-amber-300">PazziTournament <span className="mx-2 text-slate-600">/</span> Player dossier</p>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Scheda storica · ID {calciatore.id}</p>
              <h1 className="mt-3 max-w-4xl break-words text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">{calciatore.nome}</h1>
              <div className="mt-7 h-1 w-32 rounded-full bg-gradient-to-r from-amber-300 via-yellow-500 to-transparent" />
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400">Una carriera raccontata attraverso gol, competizioni, squadre e riconoscimenti. Tutti i numeri provengono dall&apos;archivio storico.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {[
                { label: "Gol segnati", value: golTotali, color: "text-amber-300" },
                { label: "Tornei", value: torneiDisputati, color: "text-white" },
                { label: "Premi", value: trofeiTotali, color: "text-amber-300" },
                { label: "Squadre", value: squadreUtilizzate, color: "text-white" },
              ].map((item) => (
                <div key={item.label} className="min-w-[128px] rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className={`mt-3 text-4xl font-black tabular-nums ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-5 py-14 sm:px-8">
        <section>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">01 / Career overview</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">I numeri della carriera</h2></div><span className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400">Statistiche aggiornate dal database</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "⚽", label: "Gol totali", value: golTotali, detail: `${golNormaliTotali} su azione · ${rigoriTotali} rigori`, tone: "text-amber-300" },
              { icon: "🎮", label: "Partite delle squadre", value: partiteTotali, detail: "Non sono presenze individuali", tone: "text-sky-300" },
              { icon: "📈", label: "Gol per partita della squadra", value: mediaGol, detail: "Media sui match delle squadre", tone: "text-emerald-300" },
              { icon: "🟥", label: "Cartellini rossi", value: cartelliniRossi, detail: "Espulsioni registrate", tone: "text-rose-300" },
            ].map((item) => <div key={item.label} className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d182c] p-6 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-amber-300/30"><div className="absolute right-5 top-5 text-3xl opacity-50 transition group-hover:scale-110 group-hover:opacity-100">{item.icon}</div><p className="max-w-[75%] text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</p><p className={`mt-8 text-5xl font-black tabular-nums ${item.tone}`}>{item.value}</p><p className="mt-3 text-xs text-slate-500">{item.detail}</p></div>)}
          </div>
        </section>

        <section>
          <div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">02 / Performance</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Rendimento storico</h2></div>
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0d182c] p-6 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[{ label: "Vittorie", value: vittorieTotali, color: "text-emerald-300" },{ label: "Pareggi", value: pareggiTotali, color: "text-sky-300" },{ label: "Sconfitte", value: sconfitteTotali, color: "text-rose-300" },{ label: "Trofei individuali", value: trofeiTotali, color: "text-amber-300" }].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.label}</p><p className={`mt-3 text-4xl font-black ${item.color}`}>{item.value}</p></div>)}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Percentuale vittorie delle squadre</p><p className="mt-1 text-3xl font-black text-white">{percentualeVittorie}</p></div><p className="max-w-md text-right text-xs leading-5 text-slate-500">Calcolata sulle partite completate delle squadre del calciatore, non sulle sue presenze individuali.</p></div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 transition-all duration-700" style={{ width: `${partiteTotali ? Math.min(100, vittorieTotali / partiteTotali * 100) : 0}%` }} /></div>
          </div>
        </section>

        {migliorTorneo && <section><div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">03 / Personal best</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Il torneo dei record</h2></div><div className="relative overflow-hidden rounded-[32px] border border-amber-300/25 bg-[radial-gradient(ellipse_at_top_right,rgba(230,174,69,0.17),transparent_55%),linear-gradient(135deg,#142441,#0b1426)] p-7 sm:p-10"><div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">Miglior rendimento realizzativo · {migliorTorneo.anno}</p><Link href={`/tornei/${migliorTorneo.torneoId}`} className="mt-4 block text-3xl font-black transition hover:text-amber-300 sm:text-5xl">{migliorTorneo.torneoNome} ↗</Link><div className="mt-6 flex items-center gap-4">{migliorTorneo.squadraStemma ? <img src={migliorTorneo.squadraStemma} alt={migliorTorneo.squadraNome} className="h-14 w-14 object-contain" /> : <span className="text-3xl">⚽</span>}<span className="font-semibold text-slate-300">{migliorTorneo.squadraNome}</span></div></div><div className="rounded-3xl border border-amber-300/25 bg-amber-300/10 px-10 py-7 text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Gol realizzati</p><p className="mt-2 text-7xl font-black text-amber-300">{migliorTorneo.gol}</p></div></div></div></section>}

        <section><div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">04 / Tournament history</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Il percorso nei tornei</h2><p className="mt-3 text-sm text-slate-400">Ogni stagione, ogni squadra e i risultati ottenuti.</p></div>
          {statisticheTornei.length === 0 ? <div className="rounded-3xl border border-white/10 bg-[#0d182c] p-10 text-center text-slate-400">Nessuna statistica disponibile.</div> : <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0d182c]"><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-white/[0.035] text-[11px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-6 py-5">Competizione</th><th className="px-6 py-5">Squadra</th>{["PG","V","N","P","Gol","Rigori","Premi"].map((col) => <th key={col} className="px-3 py-5 text-center">{col}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.07]">{statisticheTornei.map((s) => <tr key={`${s.torneoId}-${s.squadraId}`} className="transition hover:bg-white/[0.045]"><td className="px-6 py-5"><Link href={`/tornei/${s.torneoId}`} className="font-black text-white transition hover:text-amber-300">{s.torneoNome}</Link><p className="mt-1 text-xs text-amber-300/80">{s.anno}</p></td><td className="px-6 py-5"><div className="flex items-center gap-3">{s.squadraStemma ? <img src={s.squadraStemma} alt={s.squadraNome} className="h-9 w-9 shrink-0 object-contain" /> : <span>⚽</span>}<span className="font-semibold text-slate-300">{s.squadraNome}</span></div></td><td className="px-3 py-5 text-center">{s.partite}</td><td className="px-3 py-5 text-center font-bold text-emerald-300">{s.vittorie}</td><td className="px-3 py-5 text-center">{s.pareggi}</td><td className="px-3 py-5 text-center text-rose-300">{s.sconfitte}</td><td className="px-3 py-5 text-center text-xl font-black text-amber-300">{s.gol}</td><td className="px-3 py-5 text-center">{s.rigori}</td><td className="px-3 py-5 text-center font-bold text-amber-300">{s.trofei || "—"}</td></tr>)}</tbody></table></div></div>}
        </section>

        <section><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">05 / Hall of fame</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">La bacheca dei premi</h2></div><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200">{trofeiTotali} riconoscimenti</span></div>
          {trofeiIndividuali.length === 0 ? <div className="rounded-3xl border border-white/10 bg-[#0d182c] p-10 text-center text-slate-400">Nessun trofeo individuale registrato.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{trofeiIndividuali.map((trofeo) => { const immagine = immagineTrofeo(trofeo.tipo); return <div key={trofeo.id} className="group relative overflow-hidden rounded-[30px] border border-amber-300/20 bg-[radial-gradient(ellipse_at_top,rgba(213,162,68,0.13),transparent_65%),#0d182c] p-7 transition duration-300 hover:-translate-y-2 hover:border-amber-300/60 hover:shadow-[0_25px_70px_-30px_rgba(230,179,82,0.4)]"><div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"/><div className="flex h-40 items-center justify-center">{immagine ? <img src={immagine} alt={trofeo.tipo.replaceAll("_", " ")} className="max-h-36 max-w-full object-contain drop-shadow-[0_12px_20px_rgba(240,187,86,0.18)] transition duration-500 group-hover:scale-110" /> : <span className="text-7xl drop-shadow-xl">🏆</span>}</div><p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-amber-300">{trofeo.tipo.replaceAll("_", " ")}</p><h3 className="mt-3 text-xl font-black">{trofeo.torneo.nome}</h3><p className="mt-1 text-sm text-slate-400">Edizione {trofeo.torneo.anno}</p>{trofeo.valore !== null && trofeo.valore !== undefined && <p className="mt-4 text-2xl font-black text-amber-200">{trofeo.valore}</p>}{trofeo.nota && <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-400">{trofeo.nota}</p>}</div>; })}</div>}
        </section>

        <div className="flex flex-col justify-between gap-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 sm:flex-row sm:items-center"><div><p className="text-sm font-black text-slate-200">Dati storici verificabili</p><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">I gol sono associati al calciatore. Non sono registrate le presenze individuali per ogni partita né gli assist: le statistiche di rendimento delle squadre non rappresentano necessariamente quelle personali del giocatore.</p></div><Link href="/calciatori" className="shrink-0 rounded-full border border-amber-300/30 px-5 py-3 text-center text-sm font-bold text-amber-200 transition hover:bg-amber-300/10">← Tutti i calciatori</Link></div>
      </div>
    </main>
  );
}
