import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import Link from "next/link";

function identitaGioco(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("efootball") || n.includes("pes") || n.includes("pro evolution")) {
    return { etichetta: "FOOTBALL SIMULATION", sigla: "PES", accento: "#74d8ff", rgb: "116,216,255", sfondo: "linear-gradient(145deg,#102b49 0%,#0b1428 48%,#15254a 100%)" };
  }
  if (n.includes("fifa") || n.includes("ea sports") || n.includes("fc ")) {
    return { etichetta: "FOOTBALL EXPERIENCE", sigla: "FC", accento: "#e8d3a0", rgb: "232,211,160", sfondo: "linear-gradient(145deg,#303045 0%,#12192e 52%,#222b40 100%)" };
  }
  return { etichetta: "PAZZITOURNAMENT COLLECTION", sigla: "GAME", accento: "#c1a9ff", rgb: "193,169,255", sfondo: "linear-gradient(145deg,#30254a 0%,#10172b 55%,#20304b 100%)" };
}

export default async function VideogiochiPage() {
  const [videogiochi, admin] = await Promise.all([
    prisma.videogioco.findMany({
      include: { _count: { select: { tornei: true, valutazioniSquadre: true } } },
      orderBy: [{ anno: "desc" }, { nome: "asc" }],
    }),
    isAdmin(),
  ]);

  const torneiTotali = videogiochi.reduce((totale, gioco) => totale + gioco._count.tornei, 0);
  const ratingTotali = videogiochi.reduce((totale, gioco) => totale + gioco._count.valutazioniSquadre, 0);

  return (
    <main className="games-page min-h-screen overflow-hidden bg-[#080e1a] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 games-atmosphere" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-7 sm:px-8 lg:px-10">
        <nav className="mb-10 flex items-center justify-between gap-4 sm:mb-14">
          <Link href="/" className="games-back inline-flex items-center gap-3 text-sm font-semibold text-slate-300 transition hover:text-white"><span aria-hidden="true">←</span> Torna alla home</Link>
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.32em] text-[#d6bd86] sm:block">PazziTournament / Games</span>
        </nav>

        <header className="games-hero relative overflow-hidden rounded-[2rem] border border-white/10 px-7 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          <div className="games-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="games-hero-orbit pointer-events-none absolute -right-32 -top-40 h-[560px] w-[560px] rounded-full border border-[#d6bd86]/20" aria-hidden="true" />
          <div className="games-hero-orbit games-orbit-inner pointer-events-none absolute -right-10 -top-16 h-[360px] w-[360px] rounded-full border border-[#d6bd86]/20" aria-hidden="true" />
          <div className="relative z-10 max-w-3xl">
            <div className="mb-6 flex items-center gap-3"><span className="h-px w-9 bg-[#d6bd86]"/><span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#e3c88f]">La collezione</span></div>
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-[5.8rem]">I nostri<br/><span className="games-gradient-text">videogiochi.</span></h1>
            <p className="mt-7 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Ogni titolo ha dato vita a nuove sfide, tornei e rivalità. Esplora i giochi che hanno scritto la storia di PazziTournament.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#collezione" className="games-primary-link inline-flex items-center justify-center gap-3 rounded-xl px-6 py-3.5 text-sm font-black">Esplora la collezione <span aria-hidden="true">↓</span></a>
              {admin && <Link href="/videogiochi/nuovo" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold transition hover:bg-white/10">＋ Nuovo videogioco</Link>}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-7 right-9 hidden text-[10px] font-black tracking-[0.34em] text-white/25 lg:block">PLAY THE HISTORY</div>
        </header>

        <section aria-label="Statistiche collezione" className="mt-7 grid grid-cols-3 gap-3 sm:gap-5">
          {[
            { label: "Videogiochi", valore: videogiochi.length, descrizione: "Titoli in archivio" },
            { label: "Tornei", valore: torneiTotali, descrizione: "Edizioni associate" },
            { label: "Valutazioni", valore: ratingTotali, descrizione: "Rating delle squadre" },
          ].map((stat) => <div key={stat.label} className="games-stat rounded-2xl border border-white/10 bg-[#111b2d]/90 p-4 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400 sm:text-xs">{stat.label}</p><p className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{stat.valore}</p><p className="mt-2 hidden text-xs text-slate-500 sm:block">{stat.descrizione}</p></div>)}
        </section>

        <section id="collezione" className="mt-16 scroll-mt-10 sm:mt-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div><p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#d6bd86]">Game library</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">La collezione</h2><p className="mt-2 text-sm text-slate-400">Scegli un titolo per vedere i suoi tornei e le valutazioni delle squadre.</p></div>
            <span className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-slate-300">{videogiochi.length} {videogiochi.length === 1 ? "titolo" : "titoli"}</span>
          </div>

          {videogiochi.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-[#111b2d] px-6 py-20 text-center"><div className="mb-5 text-5xl" aria-hidden="true">🎮</div><h3 className="text-2xl font-black">Nessun videogioco presente</h3><p className="mt-3 text-slate-400">I titoli aggiunti appariranno qui.</p>{admin && <Link href="/videogiochi/nuovo" className="games-primary-link mt-7 inline-flex rounded-xl px-6 py-3 font-bold">Aggiungi il primo videogioco</Link>}</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {videogiochi.map((videogioco) => {
                const stile = identitaGioco(videogioco.nome);
                return (
                  <Link key={videogioco.id} href={`/videogiochi/${videogioco.id}`} className="games-card group relative flex min-h-[440px] flex-col overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#101a2b] shadow-[0_20px_55px_rgba(0,0,0,.2)]" style={{ "--game-accent": stile.accento, "--game-rgb": stile.rgb } as React.CSSProperties}>
                    <div className="games-cover relative flex min-h-[250px] flex-1 flex-col overflow-hidden px-7 pb-7 pt-7" style={{ background: stile.sfondo }}>
                      <div className="games-cover-lines absolute inset-0" aria-hidden="true" />
                      <div className="games-cover-circle absolute -right-20 -top-20 h-[310px] w-[310px] rounded-full border border-white/20" aria-hidden="true" />
                      <div className="games-cover-circle absolute -bottom-24 right-8 h-[260px] w-[260px] rounded-full border border-white/10" aria-hidden="true" />
                      <div className="relative z-10 flex items-start justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/65">{stile.etichetta}</span>{videogioco.anno && <span className="rounded-md border border-white/20 bg-black/15 px-3 py-1 text-xs font-bold text-white/85">{videogioco.anno}</span>}</div>
                      <div className="relative z-10 mt-auto pt-16"><span className="games-watermark pointer-events-none absolute -right-4 -top-8 select-none text-[6.2rem] font-black leading-none tracking-[-.1em] opacity-[.08] sm:text-[7rem]" aria-hidden="true">{stile.sigla}</span><div className="mb-4 h-[3px] w-10 rounded-full" style={{ background: stile.accento }}/><h3 className="max-w-[95%] break-words text-[clamp(1.8rem,3vw,2.7rem)] font-black leading-[1.05] tracking-[-.05em] text-white">{videogioco.nome}</h3></div>
                    </div>
                    <div className="relative z-10 p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="text-2xl font-black text-white">{videogioco._count.tornei}</p><p className="mt-1 text-xs text-slate-400">Tornei</p></div><div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="text-2xl font-black text-white">{videogioco._count.valutazioniSquadre}</p><p className="mt-1 text-xs text-slate-400">Rating squadre</p></div></div><div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-sm font-extrabold" style={{ color: stile.accento }}>{admin ? "Gestisci videogioco" : "Esplora videogioco"}</span><span className="games-arrow text-xl" style={{ color: stile.accento }} aria-hidden="true">↗</span></div></div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <style>{`
        .games-atmosphere{background:radial-gradient(ellipse at 15% 12%,rgba(30,65,110,.18),transparent 38%),radial-gradient(ellipse at 92% 45%,rgba(180,143,78,.07),transparent 35%)}
        .games-hero{background:linear-gradient(105deg,#17263e 0%,#101d33 55%,#14243d 100%);box-shadow:0 28px 100px rgba(0,0,0,.23)}
        .games-hero-grid{opacity:.45;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(90deg,transparent 20%,black 100%)}
        .games-hero-orbit{box-shadow:0 0 90px rgba(214,189,134,.05);animation:games-orbit 28s linear infinite}
        .games-orbit-inner{animation-direction:reverse;animation-duration:35s}
        .games-gradient-text{background:linear-gradient(100deg,#fff0c8,#d8b77a 60%,#fff0c8);background-clip:text;-webkit-background-clip:text;color:transparent}
        .games-primary-link{background:linear-gradient(135deg,#f0d69f,#c9a46c);color:#142034;box-shadow:0 8px 30px rgba(207,169,106,.17);transition:transform .3s,box-shadow .3s}
        .games-primary-link:hover{transform:translateY(-3px);box-shadow:0 13px 35px rgba(207,169,106,.3)}
        .games-card{transition:transform .45s cubic-bezier(.2,.7,.2,1),border-color .35s,box-shadow .4s}
        .games-card:hover{transform:translateY(-9px);border-color:rgba(var(--game-rgb),.5);box-shadow:0 28px 75px rgba(0,0,0,.36),0 0 40px rgba(var(--game-rgb),.09)}
        .games-cover:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 15%,rgba(255,255,255,.065) 40%,transparent 65%);transform:translateX(-140%);transition:transform .85s}
        .games-card:hover .games-cover:after{transform:translateX(140%)}
        .games-cover-lines{background:repeating-linear-gradient(115deg,transparent 0,transparent 29px,rgba(255,255,255,.035) 30px,transparent 31px);opacity:.7}
        .games-cover-circle{transition:transform .7s cubic-bezier(.2,.7,.2,1)}
        .games-card:hover .games-cover-circle{transform:scale(1.12) rotate(10deg)}
        .games-arrow{transition:transform .3s}.games-card:hover .games-arrow{transform:translate(3px,-3px)}
        .games-stat{transition:transform .3s,border-color .3s}.games-stat:hover{transform:translateY(-4px);border-color:rgba(214,189,134,.3)}
        @keyframes games-orbit{to{transform:rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.games-page *, .games-page *:before,.games-page *:after{animation:none!important;transition:none!important}}
      `}</style>
    </main>
  );
}
