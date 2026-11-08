import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function PartecipantiPage() {
  const partecipanti = await prisma.partecipante.findMany({
    orderBy: { nome: "asc" },
  });

  // CPU resta nel database per preservare partite e statistiche storiche.
  const allenatori = partecipanti.filter(
    (partecipante) => partecipante.nome.trim().toLocaleLowerCase() !== "cpu"
  );

  const palette = [
    { accent: "#d6b77d", glow: "rgba(214,183,125,.19)", index: "01" },
    { accent: "#83bdf5", glow: "rgba(131,189,245,.18)", index: "02" },
    { accent: "#bb9cf3", glow: "rgba(187,156,243,.18)", index: "03" },
    { accent: "#7fd4b5", glow: "rgba(127,212,181,.18)", index: "04" },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#080e19] text-white">
      <style>{`
        @keyframes playersFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes playersReveal { from { opacity: 0; transform: translateY(25px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes playersSweep { from { transform: translateX(-130%) rotate(-20deg) } to { transform: translateX(280%) rotate(-20deg) } }
        .players-card { animation: playersReveal .7s both; transition: transform .45s ease, border-color .45s ease, box-shadow .45s ease; }
        .players-card:hover { transform: translateY(-10px); border-color: var(--accent); box-shadow: 0 25px 75px var(--glow); }
        .players-card:before { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.055) 45%,transparent 65%); transform:translateX(-130%) rotate(-20deg); }
        .players-card:hover:before { animation:playersSweep 1.1s ease; }
        .players-portrait { transition:transform .6s ease; }
        .players-card:hover .players-portrait { transform:scale(1.07) translateY(-5px); }
        .players-orbit { animation:playersFloat 8s ease-in-out infinite; }
        @media(prefers-reduced-motion:reduce) { .players-card,.players-orbit,.players-card:hover:before { animation:none!important; } .players-card,.players-portrait { transition:none!important; } }
      `}</style>

      <header className="relative isolate border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-40 h-[560px] w-[560px] rounded-full bg-blue-600/15 blur-[110px]" />
          <div className="absolute -bottom-52 left-[-140px] h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-[120px]" />
          <div className="players-orbit absolute right-[12%] top-[15%] h-72 w-72 rotate-45 rounded-[4rem] border border-white/[.07] sm:h-[450px] sm:w-[450px]" />
          <div className="absolute right-[18%] top-[28%] h-64 w-64 rotate-45 rounded-[4rem] border border-amber-200/[.09] sm:h-80 sm:w-80" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-8 sm:pb-24 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-400 transition hover:text-white">← Torna alla home</Link>
            <span className="text-[10px] font-black uppercase tracking-[.3em] text-slate-500">PazziTournament</span>
          </div>
          <div className="mt-20 max-w-4xl sm:mt-24">
            <div className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[.32em] text-[#d6b77d]">
              <span className="h-px w-10 bg-[#d6b77d]" /> I protagonisti
            </div>
            <h1 className="text-5xl font-black leading-[.98] tracking-[-.065em] sm:text-7xl lg:text-[6.5rem]">
              Le storie dietro <span className="block bg-gradient-to-r from-[#f1d6a5] via-[#c3d8f6] to-white bg-clip-text text-transparent">ogni vittoria.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              Rivalità, stagioni indimenticabili e carriere da raccontare. Scopri i profili degli allenatori che hanno scritto la storia di PazziTournament.
            </p>
            <a href="#allenatori" className="mt-9 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[.07] px-6 py-3 text-sm font-bold transition hover:border-[#d6b77d]/60 hover:bg-white/[.12]">
              Scopri i protagonisti <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8" id="allenatori">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.3em] text-[#d6b77d]">Hall of Players</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">I nostri allenatori</h2>
            <p className="mt-3 text-sm text-slate-400">Seleziona una card per entrare nella carriera di un protagonista.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-bold text-slate-300">
            {allenatori.length} {allenatori.length === 1 ? "allenatore" : "allenatori"}
          </span>
        </div>

        {allenatori.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-[#101a2b] p-12 text-center">
            <h3 className="text-2xl font-black">Nessun allenatore presente</h3>
            <p className="mt-3 text-slate-400">I profili appariranno qui non appena saranno disponibili.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {allenatori.map((partecipante, i) => {
              const tema = palette[i % palette.length];
              const iniziali = partecipante.nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
              return (
                <Link
                  key={partecipante.id}
                  href={`/partecipanti/${partecipante.id}`}
                  className="players-card group relative flex min-h-[410px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#111d30]"
                  style={{ "--accent": tema.accent, "--glow": tema.glow, animationDelay: `${i * 100}ms` } as React.CSSProperties}
                >
                  <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 34%, ${tema.glow}, transparent 58%)` }} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg,transparent,${tema.accent},transparent)` }} />
                  <div className="relative flex items-center justify-between px-6 pt-6">
                    <span className="text-[10px] font-black uppercase tracking-[.22em] text-slate-400">Profilo allenatore</span>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tema.accent, boxShadow: `0 0 15px ${tema.accent}` }} />
                  </div>
                  <div className="relative flex flex-1 items-center justify-center py-8">
                    <div className="players-portrait relative flex h-44 w-44 items-center justify-center rounded-full border border-white/10 bg-gradient-to-b from-white/[.08] to-transparent shadow-[0_25px_70px_rgba(0,0,0,.35)]">
                      <div className="absolute inset-3 rounded-full border border-dashed border-white/[.1]" />
                      <span className="text-6xl font-black tracking-[-.08em]" style={{ color: tema.accent }}>{iniziali}</span>
                    </div>
                    <div className="pointer-events-none absolute bottom-6 h-8 w-40 rounded-full bg-black/40 blur-xl" />
                  </div>
                  <div className="relative bg-gradient-to-t from-[#080e19]/90 to-transparent px-6 pb-7 pt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: tema.accent }}>PazziTournament / Coach</p>
                    <h3 className="mt-2 break-words text-3xl font-black tracking-tight text-white">{partecipante.nome}</h3>
                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-sm font-bold">
                      <span>Esplora la carriera</span>
                      <span className="text-xl transition-transform group-hover:translate-x-1" style={{ color: tema.accent }}>↗</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <section className="relative mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#14253e] via-[#111e32] to-[#0d1626] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-indigo-400/10 blur-[80px]" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.3em] text-[#d6b77d]">L'archivio dei numeri</p>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">Ogni partita lascia un segno.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Esplora le statistiche globali, i record e i risultati di tutta la storia di PazziTournament.</p>
            </div>
            <Link href="/statistiche" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-[#d6b77d] px-6 py-4 text-sm font-black text-[#111827] transition hover:-translate-y-1 hover:bg-[#f0d5a5]">
              Vai alle statistiche <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
