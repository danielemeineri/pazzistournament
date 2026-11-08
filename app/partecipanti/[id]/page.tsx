import Link from "next/link";
import { notFound } from "next/navigation";
import IncisivitaPartecipante from "@/components/statistiche/IncisivitaPartecipante";
import HallOfFameAllenatore from "@/components/allenatori/HallOfFameAllenatore";
import RivalitaAllenatori from "@/components/allenatori/RivalitaAllenatori";
import RivalitaStoriche from "@/components/allenatori/RivalitaStoriche";
import { getStatistichePartecipante } from "@/lib/statistiche/partecipante";

export default async function PartecipantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const partecipanteId = Number(id);

  if (
    !Number.isInteger(partecipanteId) ||
    partecipanteId <= 0
  ) {
    notFound();
  }

  /*
  |--------------------------------------------------------------------------
  | STATISTICHE
  |--------------------------------------------------------------------------
  |
  | Tutta la logica statistica viene gestita da:
  |
  | lib/statistiche/partecipante.ts
  |
  | In questo modo la pagina si limita a visualizzare
  | i dati e non li ricalcola autonomamente.
  |
  */

  const statistiche =
    await getStatistichePartecipante(
      partecipanteId
    );

  if (!statistiche) {
    notFound();
  }

  const {
    nome,
    torneiDisputati,
    titoliVinti,

    partite,
    vittorie,
    pareggi,
    sconfitte,

    golFatti,
    golSubiti,
    differenzaReti,

    percentualeVittorie,

    golPerPartita,
    golSubitiPerPartita,

    squadre,
    tornei,
    videogiochi,
    avversari,

    squadraPiuUtilizzata,
    migliorSquadra,
    migliorVideogioco,

    torneiVinti,

    serieMassimaVittorie,
    serieMassimaSconfitte,
  } = statistiche;

  // Ordinamento cronologico della timeline senza modificare i dati statistici.
  const carrieraCronologica = [...tornei].sort((a, b) =>
    a.anno - b.anno || a.torneoId - b.torneoId
  );

  return (
    <main className="min-h-screen bg-[#070a11] text-white">
      {/* HERO CINEMATOGRAFICO: i dati restano quelli del motore statistico */}
      <header className="relative isolate overflow-hidden border-b border-amber-300/20 bg-[#070a11]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_5%,rgba(245,158,11,.21),transparent_43%),radial-gradient(ellipse_at_8%_90%,rgba(59,130,246,.18),transparent_42%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.06] bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_94px,white_95px,transparent_96px)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-4 h-80 w-80 rounded-full border border-amber-200/10 shadow-[0_0_100px_rgba(245,158,11,.12)] sm:h-[30rem] sm:w-[30rem]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-8 sm:pb-20 sm:pt-10">
          <Link href="/partecipanti" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-300/10">← Tutti gli allenatori</Link>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.25em] text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" /> PazziTournament · Legends</div>
              <p className="mt-7 text-xs font-black uppercase tracking-[.4em] text-slate-400">La storia di un allenatore</p>
              <h1 className="mt-3 break-words bg-gradient-to-br from-white via-amber-100 to-amber-500 bg-clip-text text-5xl font-black uppercase leading-[1.05] tracking-tight text-transparent sm:text-7xl lg:text-8xl">{nome}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Ogni partita lascia un segno. Ogni vittoria costruisce una leggenda. Scopri la carriera, le statistiche e i trofei conquistati.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#hall-of-fame" className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_10px_35px_rgba(245,158,11,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_15px_45px_rgba(245,158,11,.4)]">🏆 Entra nella Trophy Room</a>
                <a href="#statistiche-carriera" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10">Esplora le statistiche ↓</a>
              </div>
            </div>
            <div className="relative mx-auto flex h-60 w-60 items-center justify-center rounded-full border border-amber-300/20 bg-gradient-to-br from-amber-300/15 via-slate-900 to-black shadow-[0_0_95px_rgba(245,158,11,.15)] sm:h-72 sm:w-72">
              <div className="absolute inset-5 rounded-full border border-dashed border-amber-200/20" />
              <div className="absolute -inset-3 rounded-full border border-amber-300/10" />
              <div className="text-center"><div className="text-7xl font-black tracking-tighter text-amber-200 drop-shadow-[0_0_30px_rgba(245,158,11,.45)]">{titoliVinti}</div><div className="mt-4 text-[11px] font-black uppercase tracking-[.35em] text-amber-300">Hall of Fame</div><div className="mt-2 text-xs uppercase tracking-widest text-slate-400">Titoli conquistati</div></div>
            </div>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.04] px-6 py-5 backdrop-blur-sm"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Partite giocate</p><p className="mt-2 text-4xl font-black tabular-nums text-white">{partite}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.04] px-6 py-5 backdrop-blur-sm"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Vittorie</p><p className="mt-2 text-4xl font-black tabular-nums text-emerald-400">{vittorie}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.04] px-6 py-5 backdrop-blur-sm"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Percentuale vittorie</p><p className="mt-2 text-4xl font-black tabular-nums text-amber-300">{percentualeVittorie}%</p></div>
          </div>
        </div>
      </header>
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <nav aria-label="Navigazione carriera" className="sticky top-2 z-20 mb-10 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a1020]/95 p-2 shadow-2xl backdrop-blur-xl">
          {[
            { href: "#hall-of-fame", label: "🏆 Trofei" },
            { href: "#rivalita-allenatori", label: "⚔️ Rivalità" },
            { href: "#statistiche-carriera", label: "📊 Statistiche" },
            { href: "#timeline-carriera", label: "✦ Carriera" },
            { href: "#squadre-allenate", label: "⚽ Squadre" },
            { href: "#videogiochi-carriera", label: "🎮 Videogiochi" },
          ].map((item) => <a key={item.href} href={item.href} className="shrink-0 rounded-xl px-4 py-3 text-xs font-black text-slate-200 transition hover:bg-amber-300/15 hover:text-amber-200">{item.label}</a>)}
        </nav>
        <div id="hall-of-fame" className="scroll-mt-28 mb-16 rounded-[2.5rem] border border-amber-300/20 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,.10),transparent_65%),#0b111f] p-3 shadow-[0_25px_100px_rgba(0,0,0,.45)] sm:p-6">
          <div className="mb-5 px-3 pt-4"><p className="text-xs font-black uppercase tracking-[.3em] text-amber-300">PazziTournament · Hall of Fame</p><h2 className="mt-2 text-3xl font-black text-white sm:text-5xl">La bacheca di {nome}</h2><p className="mt-2 text-sm text-slate-400">I trofei ufficiali conquistati nella carriera da allenatore.</p></div>
          <HallOfFameAllenatore partecipanteId={partecipanteId} />
        </div>

        {/* ===================================================== */}
        {/* TIMELINE CARRIERA — dati già prodotti dal motore statistiche */}
        {/* ===================================================== */}
        <section id="timeline-carriera" className="relative mb-16 scroll-mt-28 overflow-hidden rounded-[2.5rem] border border-amber-300/20 bg-[#0c1322] p-5 shadow-[0_25px_100px_rgba(0,0,0,.35)] sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_0%,rgba(245,158,11,.13),transparent_50%),radial-gradient(ellipse_at_0%_90%,rgba(59,130,246,.12),transparent_50%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
              <div><p className="text-xs font-black uppercase tracking-[.3em] text-amber-300">Career journey · PazziTournament</p><h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">Il percorso di una <span className="text-amber-300">leggenda</span></h2><p className="mt-3 text-sm text-slate-400">Tutte le competizioni disputate, in ordine cronologico.</p></div>
              <div className="flex gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center"><p className="text-3xl font-black text-white">{torneiDisputati}</p><p className="text-[10px] uppercase tracking-widest text-slate-400">Tornei</p></div><div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-center"><p className="text-3xl font-black text-amber-300">{titoliVinti}</p><p className="text-[10px] uppercase tracking-widest text-amber-100/70">Titoli</p></div></div>
            </div>
            {carrieraCronologica.length === 0 ? <p className="mt-8 text-slate-400">Nessun torneo registrato.</p> : (
              <div className="relative mt-9 space-y-5 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-gradient-to-b before:from-amber-300 before:via-sky-400/50 before:to-transparent sm:before:left-[23px]">
                {carrieraCronologica.map((torneo, index) => (
                  <div key={torneo.torneoId} className="relative pl-12 sm:pl-16">
                    <div className={`absolute left-[7px] top-6 z-10 h-[22px] w-[22px] rounded-full border-[5px] border-[#0c1322] shadow-[0_0_15px_rgba(245,158,11,.35)] sm:left-[13px] ${torneo.titolo ? "bg-amber-300" : "bg-sky-400"}`} />
                    <Link href={`/tornei/${torneo.torneoId}`} className={`group block overflow-hidden rounded-[1.7rem] border p-5 transition duration-300 hover:-translate-y-1 sm:p-7 ${torneo.titolo ? "border-amber-300/35 bg-gradient-to-r from-amber-300/15 via-[#192237] to-[#111a2a] hover:border-amber-200/70" : "border-white/10 bg-gradient-to-r from-[#17243a] to-[#0e1728] hover:border-sky-300/40"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-4"><span className="text-3xl font-black tabular-nums text-amber-300 sm:text-4xl">{torneo.anno}</span><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-400">Capitolo {String(index + 1).padStart(2, "0")} · {torneo.videogioco}</p><h3 className="mt-2 text-xl font-black text-white transition group-hover:text-amber-200 sm:text-2xl">{torneo.nome}</h3><p className="mt-2 text-xs text-slate-400">{torneo.partite} partite · {torneo.vittorie} vittorie · {torneo.pareggi} pareggi · {torneo.sconfitte} sconfitte</p></div></div>{torneo.titolo ? <span className="rounded-full border border-amber-300/35 bg-amber-300/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-200">🏆 Campione</span> : <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">Torneo disputato</span>}</div>
                      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs font-bold text-slate-400"><span>GF <strong className="text-emerald-300">{torneo.golFatti}</strong></span><span>GS <strong className="text-rose-300">{torneo.golSubiti}</strong></span><span>DR <strong className="text-white">{torneo.differenzaReti > 0 ? `+${torneo.differenzaReti}` : torneo.differenzaReti}</strong></span><span className="ml-auto text-amber-200">Apri torneo →</span></div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================== */}
        <RivalitaAllenatori nomeAllenatore={nome} avversari={avversari} />
        <RivalitaStoriche partecipanteId={partecipanteId} />

        {/* DASHBOARD STATISTICHE — tutti i valori provengono dal motore esistente */}
        <section id="statistiche-carriera" className="relative mb-16 scroll-mt-12 overflow-hidden rounded-[2.5rem] border border-amber-300/20 bg-[#0c101b] p-5 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(245,158,11,.12),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(37,99,235,.10),transparent_50%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-7">
              <div><p className="text-xs font-black uppercase tracking-[.35em] text-amber-300">Performance center · PazziTournament</p><h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-5xl">I numeri della <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">leggenda</span></h2><p className="mt-3 text-sm text-slate-400">Statistiche ufficiali della carriera di {nome}</p></div>
              <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-center"><p className="text-3xl font-black text-amber-300">{titoliVinti}</p><p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/70">Titoli</p></div>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Tornei disputati", value: torneiDisputati, mark: "01", color: "text-amber-300", glow: "from-amber-400/15" },
                { label: "Partite giocate", value: partite, mark: "02", color: "text-sky-300", glow: "from-sky-400/15" },
                { label: "Vittorie", value: vittorie, mark: "03", color: "text-emerald-300", glow: "from-emerald-400/15" },
                { label: "Percentuale vittorie", value: `${percentualeVittorie}%`, mark: "04", color: "text-violet-300", glow: "from-violet-400/15" },
              ].map((item) => (
                <div key={item.mark} className={`group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-br ${item.glow} to-[#111725] p-6 transition duration-500 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-[0_15px_45px_rgba(245,158,11,.10)]`}>
                  <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">{item.label}</span><span className="text-xs font-black text-white/20">{item.mark}</span></div>
                  <p className={`mt-8 text-5xl font-black tracking-tight tabular-nums sm:text-6xl ${item.color}`}>{item.value}</p>
                  <div className="mt-6 h-px bg-gradient-to-r from-white/35 to-transparent" />
                </div>
              ))}
            </div>
            <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[1.8rem] border border-white/10 bg-[#111827]/80 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.25em] text-sky-300">Match analysis</p><h3 className="mt-2 text-2xl font-black">Bilancio risultati</h3></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{partite} partite</span></div>
                <div className="mt-7 flex h-5 overflow-hidden rounded-full bg-slate-800" aria-label="Distribuzione di vittorie, pareggi e sconfitte">
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700" style={{ width: `${partite > 0 ? (vittorie / partite) * 100 : 0}%` }} />
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-700" style={{ width: `${partite > 0 ? (pareggi / partite) * 100 : 0}%` }} />
                  <div className="bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-700" style={{ width: `${partite > 0 ? (sconfitte / partite) * 100 : 0}%` }} />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[{ label: "Vittorie", value: vittorie, color: "text-emerald-400", dot: "bg-emerald-400" }, { label: "Pareggi", value: pareggi, color: "text-amber-300", dot: "bg-amber-300" }, { label: "Sconfitte", value: sconfitte, color: "text-rose-400", dot: "bg-rose-400" }].map((item) => <div key={item.label} className="rounded-2xl border border-white/5 bg-white/[.035] p-3 text-center sm:p-5"><div className="flex items-center justify-center gap-2"><span className={`h-2 w-2 rounded-full ${item.dot}`} /><span className="text-xs text-slate-400">{item.label}</span></div><p className={`mt-3 text-3xl font-black tabular-nums ${item.color}`}>{item.value}</p></div>)}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[1.8rem] border border-amber-300/15 bg-gradient-to-br from-amber-300/10 to-[#111827] p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[.25em] text-amber-300">Win rate</p><h3 className="mt-2 text-2xl font-black">Indice di vittoria</h3>
                <div className="relative mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-full" style={{ background: `conic-gradient(#fbbf24 ${Math.max(0, Math.min(100, Number(percentualeVittorie) || 0))}%, rgba(255,255,255,.08) 0)` }}>
                  <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-[#101622]"><p className="text-4xl font-black tabular-nums text-amber-200">{percentualeVittorie}%</p><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vittorie</p></div>
                </div>
                <p className="mt-4 text-center text-xs text-slate-400">Percentuale calcolata dalle partite registrate</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[{ label: "Gol fatti", value: golFatti, color: "text-emerald-300", sub: "Attacco" }, { label: "Gol subiti", value: golSubiti, color: "text-rose-300", sub: "Difesa" }, { label: "Differenza reti", value: differenzaReti > 0 ? `+${differenzaReti}` : differenzaReti, color: differenzaReti >= 0 ? "text-sky-300" : "text-rose-300", sub: "Bilancio" }, { label: "Gol per partita", value: golPerPartita, color: "text-amber-300", sub: "Media offensiva" }].map((item) => <div key={item.label} className="rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-[#1a2232] to-[#0f1520] p-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">{item.sub}</p><p className={`mt-5 text-4xl font-black tabular-nums ${item.color}`}>{item.value}</p><p className="mt-3 text-sm font-semibold text-slate-300">{item.label}</p></div>)}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-300/15 bg-sky-300/[.04] px-6 py-4"><span className="text-sm font-semibold text-slate-300">Gol subiti per partita</span><span className="text-2xl font-black text-sky-300">{golSubitiPerPartita}</span></div>
          </div>
        </section>

        {/* Il grafico di incisività mantiene il componente originale e i suoi calcoli */}
        <div className="mb-16 rounded-[2rem] border border-white/10 bg-[#0d1320]/70 p-3 shadow-2xl sm:p-6"><IncisivitaPartecipante partecipanteId={partecipanteId} /></div>

        <section className="mb-16 scroll-mt-12">
          <div className="mb-7"><p className="text-xs font-black uppercase tracking-[.3em] text-rose-300">Momentum · Record personali</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Le serie <span className="text-amber-300">memorabili</span></h2></div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="group relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 via-[#121b27] to-[#090e17] p-8 transition duration-500 hover:-translate-y-1 hover:border-emerald-400/50"><div className="absolute -right-6 -top-12 text-[11rem] font-black text-emerald-400/[.06]">W</div><p className="relative text-xs font-black uppercase tracking-[.25em] text-emerald-300">Winning streak</p><p className="relative mt-7 text-7xl font-black tabular-nums text-emerald-300">{serieMassimaVittorie}</p><p className="relative mt-3 text-lg font-bold">Vittorie consecutive</p><p className="relative mt-2 text-sm text-slate-400">Massima serie positiva registrata</p></div>
            <div className="group relative overflow-hidden rounded-[2rem] border border-rose-400/20 bg-gradient-to-br from-rose-400/10 via-[#121b27] to-[#090e17] p-8 transition duration-500 hover:-translate-y-1 hover:border-rose-400/50"><div className="absolute -right-6 -top-12 text-[11rem] font-black text-rose-400/[.06]">L</div><p className="relative text-xs font-black uppercase tracking-[.25em] text-rose-300">Losing streak</p><p className="relative mt-7 text-7xl font-black tabular-nums text-rose-300">{serieMassimaSconfitte}</p><p className="relative mt-3 text-lg font-bold">Sconfitte consecutive</p><p className="relative mt-2 text-sm text-slate-400">Massima serie negativa registrata</p></div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* SQUADRE */}
        {/* ===================================================== */}

        <section id="squadre-allenate" className="mb-16 scroll-mt-28">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-400">
              Squadre
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              🏟️ Squadre utilizzate
            </h2>
          </div>

          {squadre.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-8 text-center text-slate-400">
              Nessuna partita completata disponibile.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {squadre.map((squadra) => (
                <Link
                  href={`/squadre/${squadra.squadraId}`}
                  key={squadra.squadraId}
                  className="block rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-[#192338] via-[#111827] to-[#0b101a] p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300/30 hover:shadow-[0_15px_35px_rgba(0,0,0,.35)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {squadra.stemma ? (
                        <img
                          src={squadra.stemma}
                          alt={squadra.nome}
                          className="h-14 w-14 object-contain"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                          ⚽
                        </div>
                      )}

                      <div>
                        <h3 className="text-xl font-black">
                          {squadra.nome}
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                          {squadra.partite}{" "}
                          {squadra.partite === 1
                            ? "partita"
                            : "partite"}
                        </p>
                      </div>
                    </div>

                    {squadra.titoli > 0 && (
                      <div className="text-center">
                        <div className="text-2xl">
                          🏆
                        </div>

                        <p className="text-xs font-bold text-yellow-400">
                          {squadra.titoli}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-4 gap-2">
                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        V
                      </p>

                      <p className="mt-1 font-black text-emerald-400">
                        {squadra.vittorie}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        N
                      </p>

                      <p className="mt-1 font-black text-yellow-400">
                        {squadra.pareggi}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        P
                      </p>

                      <p className="mt-1 font-black text-red-400">
                        {squadra.sconfitte}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        %
                      </p>

                      <p className="mt-1 font-black text-blue-400">
                        {squadra.percentualeVittorie}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-400">
                        GF
                      </p>

                      <p className="mt-1 font-bold">
                        {squadra.golFatti}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        GS
                      </p>

                      <p className="mt-1 font-bold">
                        {squadra.golSubiti}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        DR
                      </p>

                      <p
                        className={`mt-1 font-bold ${
                          squadra.differenzaReti > 0
                            ? "text-emerald-400"
                            : squadra.differenzaReti < 0
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {squadra.differenzaReti > 0
                          ? `+${squadra.differenzaReti}`
                          : squadra.differenzaReti}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================== */}
        {/* HIGHLIGHTS */}
        {/* ===================================================== */}

        <section className="mb-16 scroll-mt-12">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-purple-400">
              Analisi
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              🧠 Identikit del giocatore
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* SQUADRA PIÙ UTILIZZATA */}

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Squadra più utilizzata
              </p>

              {squadraPiuUtilizzata ? (
                <>
                  <h3 className="mt-3 text-2xl font-black">
                    {squadraPiuUtilizzata.nome}
                  </h3>

                  <p className="mt-2 text-slate-400">
                    Utilizzata in{" "}
                    <span className="font-bold text-white">
                      {squadraPiuUtilizzata.partite}
                    </span>{" "}
                    partite.
                  </p>
                </>
              ) : (
                <p className="mt-3 text-slate-400">
                  Nessun dato disponibile.
                </p>
              )}
            </div>

            {/* MIGLIOR SQUADRA */}

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Miglior rendimento
              </p>

              {migliorSquadra ? (
                <>
                  <h3 className="mt-3 text-2xl font-black">
                    {migliorSquadra.nome}
                  </h3>

                  <p className="mt-2 text-slate-400">
                    {migliorSquadra.vittorie}{" "}
                    vittorie su{" "}
                    {migliorSquadra.partite}{" "}
                    partite.
                  </p>

                  <p className="mt-2 text-sm font-bold text-emerald-400">
                    {migliorSquadra.percentualeVittorie}%
                    di vittorie
                  </p>
                </>
              ) : (
                <p className="mt-3 text-slate-400">
                  Nessun dato disponibile.
                </p>
              )}
            </div>

            {/* MIGLIOR VIDEOGIOCO */}

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Miglior videogioco
              </p>

              {migliorVideogioco ? (
                <>
                  <h3 className="mt-3 text-2xl font-black">
                    {migliorVideogioco.videogioco}
                  </h3>

                  <p className="mt-2 text-slate-400">
                    {migliorVideogioco.vittorie}{" "}
                    vittorie su{" "}
                    {migliorVideogioco.partite}{" "}
                    partite.
                  </p>

                  <p className="mt-2 text-sm font-bold text-purple-400">
                    {migliorVideogioco.percentualeVittorie}%
                    di vittorie
                  </p>
                </>
              ) : (
                <p className="mt-3 text-slate-400">
                  Nessun dato disponibile.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* VIDEOGIOCHI */}
        {/* ===================================================== */}

        <section id="videogiochi-carriera" className="mb-16 scroll-mt-28">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-400">
              Videogiochi
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              🎮 Rendimento per videogioco
            </h2>
          </div>

          {videogiochi.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-8 text-center text-slate-400">
              Nessun dato disponibile.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {videogiochi.map((gioco) => (
                <div
                  key={gioco.videogioco}
                  className="rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-[#192338] via-[#111827] to-[#0b101a] p-6 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300/30 hover:shadow-[0_15px_35px_rgba(0,0,0,.35)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">
                        {gioco.videogioco}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {gioco.tornei}{" "}
                        {gioco.tornei === 1
                          ? "torneo"
                          : "tornei"}{" "}
                        • {gioco.partite}{" "}
                        {gioco.partite === 1
                          ? "partita"
                          : "partite"}
                      </p>
                    </div>

                    <p className="text-2xl font-black text-purple-400">
                      {gioco.percentualeVittorie}%
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        V
                      </p>

                      <p className="mt-1 font-black text-emerald-400">
                        {gioco.vittorie}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        N
                      </p>

                      <p className="mt-1 font-black text-yellow-400">
                        {gioco.pareggi}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#080c14] p-3 text-center">
                      <p className="text-xs text-slate-400">
                        P
                      </p>

                      <p className="mt-1 font-black text-red-400">
                        {gioco.sconfitte}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-400">
                        GF
                      </p>

                      <p className="mt-1 font-bold">
                        {gioco.golFatti}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        GS
                      </p>

                      <p className="mt-1 font-bold">
                        {gioco.golSubiti}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        DR
                      </p>

                      <p
                        className={`mt-1 font-bold ${
                          gioco.differenzaReti > 0
                            ? "text-emerald-400"
                            : gioco.differenzaReti < 0
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {gioco.differenzaReti > 0
                          ? `+${gioco.differenzaReti}`
                          : gioco.differenzaReti}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================== */}
        {/* STORICO TORNEI */}
        {/* ===================================================== */}

        <section className="mb-16 scroll-mt-12">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-yellow-400">
              Storico
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              📚 Tornei disputati
            </h2>
          </div>

          {tornei.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-8 text-center text-slate-400">
              Nessun torneo disponibile.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-4 text-left">
                        Torneo
                      </th>

                      <th className="px-5 py-4 text-left">
                        Videogioco
                      </th>

                      <th className="px-4 py-4 text-center">
                        PG
                      </th>

                      <th className="px-4 py-4 text-center">
                        V
                      </th>

                      <th className="px-4 py-4 text-center">
                        N
                      </th>

                      <th className="px-4 py-4 text-center">
                        P
                      </th>

                      <th className="px-4 py-4 text-center">
                        GF
                      </th>

                      <th className="px-4 py-4 text-center">
                        GS
                      </th>

                      <th className="px-4 py-4 text-center">
                        DR
                      </th>

                      <th className="px-4 py-4 text-center">
                        Esito
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {tornei.map((torneo) => (
                      <tr
                        key={torneo.torneoId}
                        className="transition hover:bg-slate-800/60"
                      >
                        <td className="px-5 py-5">
                          <Link
                            href={`/tornei/${torneo.torneoId}`}
                            className="font-bold transition hover:text-emerald-400"
                          >
                            {torneo.nome}
                          </Link>

                          <p className="mt-1 text-xs text-slate-400">
                            {torneo.anno}
                          </p>
                        </td>

                        <td className="px-5 py-5 text-slate-400">
                          {torneo.videogioco}
                        </td>

                        <td className="px-4 py-5 text-center">
                          {torneo.partite}
                        </td>

                        <td className="px-4 py-5 text-center font-bold text-emerald-400">
                          {torneo.vittorie}
                        </td>

                        <td className="px-4 py-5 text-center font-bold text-yellow-400">
                          {torneo.pareggi}
                        </td>

                        <td className="px-4 py-5 text-center font-bold text-red-400">
                          {torneo.sconfitte}
                        </td>

                        <td className="px-4 py-5 text-center">
                          {torneo.golFatti}
                        </td>

                        <td className="px-4 py-5 text-center">
                          {torneo.golSubiti}
                        </td>

                        <td
                          className={`px-4 py-5 text-center font-bold ${
                            torneo.differenzaReti > 0
                              ? "text-emerald-400"
                              : torneo.differenzaReti < 0
                              ? "text-red-400"
                              : "text-white"
                          }`}
                        >
                          {torneo.differenzaReti > 0
                            ? `+${torneo.differenzaReti}`
                            : torneo.differenzaReti}
                        </td>

                        <td className="px-4 py-5 text-center">
                          {torneo.titolo ? (
                            <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-400">
                              🏆 VINCITORE
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ===================================================== */}
        {/* TORNEI VINTI */}
        {/* ===================================================== */}

        <section className="mb-16 scroll-mt-12">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-yellow-400">
              Palmares
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              🏆 Tornei vinti
            </h2>
          </div>

          {torneiVinti.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151c2b] to-[#0c101a] p-8 text-center text-slate-400">
              Nessun titolo conquistato.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {torneiVinti.map((torneo) => (
                <Link
                  key={torneo.torneoId}
                  href={`/tornei/${torneo.torneoId}`}
                  className="group rounded-3xl border border-yellow-500/20 bg-slate-900 p-6 transition hover:border-yellow-500/40 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                        {torneo.anno}
                      </p>

                      <h3 className="mt-2 text-xl font-black transition group-hover:text-yellow-400">
                        {torneo.nome}
                      </h3>

                      <p className="mt-2 text-sm text-slate-400">
                        {torneo.videogioco}
                      </p>
                    </div>

                    <span className="text-3xl">
                      🏆
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================== */}
        {/* FUTURA IA */}
        {/* ===================================================== */}

        <section>
          <div className="overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-slate-900 to-purple-950/20 p-8 shadow-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-purple-400">
                  🤖 PazziTournament AI
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Analizza la carriera di{" "}
                  {nome}
                </h2>

                <p className="mt-3 max-w-3xl text-slate-400">
                  In questa sezione collegheremo
                  l'intelligenza artificiale alle
                  statistiche reali del profilo,
                  permettendo di chiedere analisi,
                  confronti e previsioni senza
                  inventare i dati.
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-purple-500/20 bg-slate-950 px-6 py-4 text-center">
                <p className="text-3xl">
                  🧠
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-purple-400">
                  Prossimamente
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}