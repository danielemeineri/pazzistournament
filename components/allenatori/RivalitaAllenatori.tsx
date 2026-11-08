import Link from "next/link";
import type { StatisticheAvversarioPartecipante } from "@/lib/statistiche/partecipante";

type Props = {
  nomeAllenatore: string;
  avversari: StatisticheAvversarioPartecipante[];
};

function barra(valore: number, totale: number) {
  return totale > 0 ? `${Math.max(0, Math.min(100, (valore / totale) * 100))}%` : "0%";
}

export default function RivalitaAllenatori({ nomeAllenatore, avversari }: Props) {
  // La fonte ufficiale è getStatistichePartecipante: non si ricalcolano i risultati.
  // Le righe con partecipanteId nullo sono squadre, non allenatori identificati.
  const rivali = avversari
    .filter((avversario) => avversario.partecipanteId !== null && avversario.partite > 0)
    .sort((a, b) => b.partite - a.partite || b.vittorie - a.vittorie || a.nome.localeCompare(b.nome));

  return (
    <section id="rivalita-allenatori" className="relative mb-16 scroll-mt-28 overflow-hidden rounded-[2.5rem] border border-sky-300/20 bg-[#0b1222] p-5 shadow-[0_25px_90px_rgba(0,0,0,.4)] sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(56,189,248,.14),transparent_48%),radial-gradient(ellipse_at_0%_100%,rgba(245,158,11,.12),transparent_48%)]" />
      <div className="relative">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[.3em] text-sky-300">Pazzi Rivalries · Head to head</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">Le grandi <span className="text-amber-300">rivalità</span></h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Gli scontri diretti di {nomeAllenatore} contro gli altri allenatori, secondo lo storico delle partecipazioni registrate.</p>
          </div>
          <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-5 py-3 text-center"><p className="text-3xl font-black text-sky-200">{rivali.length}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rivali</p></div>
        </div>
        {rivali.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center text-slate-400">Nessuno scontro diretto con un allenatore identificato nei dati disponibili.</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {rivali.map((rivale, indice) => (
              <article key={rivale.partecipanteId} className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-[#18243b] via-[#10192b] to-[#0b111d] p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-300/35 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">Rivalità #{String(indice + 1).padStart(2, "0")}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xl font-black sm:text-2xl"><span className="text-white">{nomeAllenatore}</span><span className="text-amber-300">VS</span><span className="text-white">{rivale.nome}</span></div></div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">{rivale.partite} sfide</span>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  {[{label:"Vittorie",valore:rivale.vittorie,colore:"text-emerald-300"},{label:"Pareggi",valore:rivale.pareggi,colore:"text-amber-300"},{label:"Sconfitte",valore:rivale.sconfitte,colore:"text-rose-300"}].map((dato) => (
                    <div key={dato.label} className="rounded-xl border border-white/5 bg-black/20 p-3"><p className={`text-3xl font-black tabular-nums ${dato.colore}`}>{dato.valore}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{dato.label}</p></div>
                  ))}
                </div>
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/10" aria-label={`Bilancio: ${rivale.vittorie} vittorie, ${rivale.pareggi} pareggi, ${rivale.sconfitte} sconfitte`}>
                  <div className="bg-emerald-400" style={{width:barra(rivale.vittorie,rivale.partite)}} />
                  <div className="bg-amber-300" style={{width:barra(rivale.pareggi,rivale.partite)}} />
                  <div className="bg-rose-400" style={{width:barra(rivale.sconfitte,rivale.partite)}} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center"><div><p className="text-xs text-slate-400">Gol fatti</p><p className="mt-1 text-2xl font-black text-emerald-300">{rivale.golFatti}</p></div><div><p className="text-xs text-slate-400">Gol subiti</p><p className="mt-1 text-2xl font-black text-rose-300">{rivale.golSubiti}</p></div><div><p className="text-xs text-slate-400">Vittorie</p><p className="mt-1 text-2xl font-black text-amber-300">{rivale.percentualeVittorie}%</p></div></div>
                <Link href={`/partecipanti/${rivale.partecipanteId}`} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-sky-200 transition hover:text-amber-200">Scopri la carriera di {rivale.nome} <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        )}
        <p className="mt-6 text-xs leading-5 text-slate-500">I risultati provengono dalle statistiche avversari esistenti. L'attribuzione dei sostituti allenatore e i record delle singole partite richiedono una verifica dedicata prima di essere mostrati.</p>
      </div>
    </section>
  );
}
