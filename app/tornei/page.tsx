import type { CSSProperties } from "react";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import EliminaTorneoButton from "@/components/tornei/EliminaTorneoButton";

export default async function TorneiPage() {
  const admin = await isAdmin();

  const tornei = await prisma.torneo.findMany({
    orderBy: [
      { anno: "desc" },
      { creatoIl: "desc" },
    ],
    include: {
      partite: true,
    },
  });

  /*
  ==========================================================
  STATISTICHE GENERALI
  ==========================================================
  */

  const torneiTotali = tornei.length;

  const torneiInCorso = tornei.filter((torneo) => {
    if (torneo.partite.length === 0) return false;

    return torneo.partite.some(
      (partita) => !partita.Completata
    );
  }).length;

  const torneiConclusi = tornei.filter((torneo) => {
    if (torneo.partite.length === 0) return false;

    return torneo.partite.every(
      (partita) => partita.Completata
    );
  }).length;

  const partiteTotali = tornei.reduce(
    (totale, torneo) => totale + torneo.partite.length,
    0
  );

  /*
  ==========================================================
  DIVISIONE COMPETIZIONI
  ==========================================================
  */

  const TIPI_COMPETIZIONI_NAZIONALI = [
    "Mondiale per Nazioni",
    "Europeo",
    "Coppa d'Africa",
    "Copa América",
    "Coppa d'Asia",
  ];

  const mondialiNazioni = tornei.filter(
    (torneo) =>
      torneo.tipo.trim() === "Mondiale per Nazioni"
  );

  const europei = tornei.filter(
    (torneo) => torneo.tipo.trim() === "Europeo"
  );

  const coppaAfrica = tornei.filter(
    (torneo) => torneo.tipo.trim() === "Coppa d'Africa"
  );

  const copaAmerica = tornei.filter(
    (torneo) => torneo.tipo.trim() === "Copa América"
  );

  const coppaAsia = tornei.filter(
    (torneo) => torneo.tipo.trim() === "Coppa d'Asia"
  );

  const mondialiClub = tornei.filter(
    (torneo) =>
      torneo.tipo.trim() === "Mondiale per Club"
  );

  const torneiAltri = tornei.filter((torneo) => {
    const tipo = torneo.tipo.trim();

    return (
      !TIPI_COMPETIZIONI_NAZIONALI.includes(tipo) &&
      tipo !== "Mondiale per Club"
    );
  });

  type Torneo = (typeof tornei)[number];
  type Tema = "mondiale" | "europa" | "africa" | "america" | "asia" | "club" | "altro";
  const temi: Record<Tema, { accent: string; soft: string; codice: string; dettaglio: string }> = {
    mondiale: { accent: "#8cbaff", soft: "rgba(74,135,224,.24)", codice: "WORLD CUP", dettaglio: "MONDIALE PER NAZIONI" },
    europa: { accent: "#b5adff", soft: "rgba(126,111,231,.24)", codice: "EURO", dettaglio: "CAMPIONATO EUROPEO" },
    africa: { accent: "#ffbc87", soft: "rgba(218,119,65,.23)", codice: "AFRICA", dettaglio: "COPPA D'AFRICA" },
    america: { accent: "#7fe0d1", soft: "rgba(56,174,165,.24)", codice: "AMÉRICA", dettaglio: "COPA AMÉRICA" },
    asia: { accent: "#ff9cae", soft: "rgba(215,83,119,.23)", codice: "ASIA", dettaglio: "COPPA D'ASIA" },
    club: { accent: "#f2cb82", soft: "rgba(214,158,61,.25)", codice: "CLUB WORLD", dettaglio: "MONDIALE PER CLUB" },
    altro: { accent: "#a8c7e9", soft: "rgba(113,145,184,.22)", codice: "EDITION", dettaglio: "COMPETIZIONE" },
  };

  function Card({ torneo, tema }: { torneo: Torneo; tema: Tema }) {
    const visual = temi[tema];
    const giocate = torneo.partite.filter((partita) => partita.Completata).length;
    const totale = torneo.partite.length;
    const percentuale = totale ? Math.round((giocate / totale) * 100) : 0;
    const concluso = totale > 0 && giocate === totale;
    const inCorso = totale > 0 && !concluso;
    // Slot per i futuri loghi delle singole edizioni. Se il campo non è ancora
    // presente nel Prisma Client, il layout continua a funzionare senza logo.
    const logo = (torneo as Torneo & { logo?: string | null }).logo;
    return (
      <div className="edition-wrap">
        <Link href={`/tornei/${torneo.id}`} className="edition group" style={{ "--accent": visual.accent, "--soft": visual.soft } as CSSProperties}>
          <div className="edition-visual">
            <div className="edition-grain" aria-hidden="true" />
            <div className="edition-stage" aria-hidden="true"><span className="stage-arc arc-a"/><span className="stage-arc arc-b"/><span className="stage-beam beam-a"/><span className="stage-beam beam-b"/><span className="stage-flare"/></div>
            <div className="edition-header"><span>PAZZITOURNAMENT <span className="opacity-40">/</span> {visual.dettaglio}</span></div>
            <div className="edition-feature">
              {logo ? (
                <div className="edition-logo-frame"><img src={logo} alt={`Logo ${torneo.nome} ${torneo.anno}`} className="edition-logo" /></div>
              ) : (
                <div className="edition-typography" aria-label={`${visual.codice} ${torneo.anno}`}>
                  <span className="edition-small">THE {torneo.anno} EDITION</span>
                  <span className="edition-word">{visual.codice}</span>
                  <span className="edition-rule" />
                  <span className="edition-year">{torneo.anno}</span>
                </div>
              )}
            </div>
            <div className="edition-bottom"><span>EDIZIONE {torneo.anno}</span><span className="edition-bottom-mark" aria-hidden="true">✦</span></div>
          </div>
          <div className="edition-info">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="edition-kicker">{torneo.tipo}</p><h3 className="edition-name">{torneo.nome}</h3></div><span className="edition-arrow" aria-hidden="true">↗</span></div>
            <div className="mt-5 flex flex-wrap items-center gap-2"><span className={`edition-status ${concluso ? "done" : inCorso ? "live" : "pending"}`}>{concluso ? "● Concluso" : inCorso ? "● In corso" : "○ Da iniziare"}</span><span className="edition-game">{torneo.videogioco || "Videogioco non specificato"}</span></div>
            <div className="edition-data"><div><small>SQUADRE</small><strong>{torneo.squadre}</strong></div><div><small>PARTITE</small><strong>{giocate}<span className="text-slate-500"> / {totale}</span></strong></div><div><small>FORMULA</small><strong className="edition-formula">{torneo.formula || "—"}</strong></div></div>
            <div className="mt-5"><div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.15em] text-slate-400"><span>Avanzamento</span><span style={{ color: visual.accent }}>{percentuale}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentuale}%`, background: visual.accent }} /></div></div>
          </div>
        </Link>
        {admin && <div className="mt-3"><EliminaTorneoButton torneoId={torneo.id} nome={torneo.nome} /></div>}
      </div>
    );
  }
  function Sezione({ id, titolo, descrizione, tema, lista }: { id: string; titolo: string; descrizione: string; tema: Tema; lista: typeof tornei }) {
    if (!lista.length) return null;
    return <section id={id} className="archive-section scroll-mt-28" style={{ "--section-accent": temi[tema].accent } as CSSProperties}><div className="section-heading"><div><p className="archive-overline" style={{ color: temi[tema].accent }}>COLLEZIONE / {temi[tema].dettaglio}</p><h2 className="section-title">{titolo}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{descrizione}</p></div><span className="section-count">{lista.length} {lista.length === 1 ? "EDIZIONE" : "EDIZIONI"}</span></div><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{lista.map((torneo) => <Card key={torneo.id} torneo={torneo} tema={tema} />)}</div></section>;
  }
  const nazioniPresenti = mondialiNazioni.length + europei.length + coppaAfrica.length + copaAmerica.length + coppaAsia.length > 0;
  return (
    <main className="archive min-h-screen text-white">
      <style>{`
        .archive{background:#080e19;color:#f8f7f4;overflow:hidden}.archive *{box-sizing:border-box}
        .archive-hero{position:relative;isolation:isolate;background:radial-gradient(ellipse at 75% 12%,rgba(210,169,104,.12),transparent 38%),linear-gradient(115deg,#14223a 0%,#0b1424 53%,#080e19 100%);border-bottom:1px solid rgba(255,255,255,.07)}
        .archive-hero:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.22;background:repeating-linear-gradient(90deg,transparent 0 11%,rgba(255,255,255,.04) 11.1% 11.2%,transparent 11.3% 22%)}
        .archive-overline{font-size:10px;letter-spacing:.26em;font-weight:900;text-transform:uppercase;color:#e8c48b}
        .archive-heading{font-size:clamp(3.4rem,8vw,7.4rem);line-height:.94;letter-spacing:-.075em;font-weight:950;text-transform:uppercase;max-width:950px}
        .archive-heading em{font-style:normal;color:#e9c68d}.archive-lead{max-width:560px;font-size:15px;line-height:1.85;color:#aab8cd}
        .archive-button{display:inline-flex;align-items:center;gap:12px;padding:13px 21px;border-radius:10px;background:#eac991;color:#101b2d;font-size:12px;font-weight:900;transition:transform .25s,background .25s}.archive-button:hover{transform:translateY(-3px);background:#ffe1aa}
        .archive-nav{display:inline-flex;align-items:center;padding:10px 14px;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:rgba(255,255,255,.035);font-size:11px;font-weight:800;color:#cdd7e7;transition:background .25s}.archive-nav:hover{background:rgba(255,255,255,.1)}
        .hero-index{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:340px;padding:40px 10px 40px 60px;border-left:1px solid rgba(255,255,255,.12)}
        .hero-index:before{content:"";position:absolute;left:0;top:0;width:1px;height:40%;background:#eac991}
        .hero-index-year{font-size:clamp(5.5rem,13vw,11rem);line-height:.82;font-weight:950;letter-spacing:-.1em;color:transparent;-webkit-text-stroke:1px rgba(232,199,144,.43)}
        .hero-index-word{font-size:clamp(2rem,4vw,4rem);font-weight:950;line-height:1;letter-spacing:-.065em;color:#e8c68d;margin-top:16px}
        .hero-index-note{font-size:10px;letter-spacing:.22em;color:#a6b6cd;margin-top:24px;font-weight:900}
        .archive-stat{border:1px solid rgba(255,255,255,.09);border-radius:16px;background:linear-gradient(145deg,#18263e,#0e192c);padding:22px;transition:transform .3s,border-color .3s}.archive-stat:hover{transform:translateY(-4px);border-color:rgba(234,201,145,.3)}
        .archive-stat strong{display:block;margin-top:12px;font-size:clamp(2rem,4vw,3.3rem);line-height:1;font-weight:950;letter-spacing:-.065em}
        .archive-section{margin-bottom:85px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:22px;margin-bottom:25px}.section-title{font-size:clamp(2.1rem,4vw,3.5rem);line-height:1;letter-spacing:-.055em;font-weight:950;margin-top:10px}.section-count{font-size:10px;letter-spacing:.14em;font-weight:900;color:#d3bd9a;white-space:nowrap}
        .edition{--accent:#eac991;--soft:rgba(210,160,95,.2);display:block;overflow:hidden;border-radius:17px;border:1px solid rgba(255,255,255,.13);background:#101b2e;box-shadow:0 15px 40px rgba(0,0,0,.22);transition:transform .35s,border-color .35s,box-shadow .35s}.edition:hover{transform:translateY(-7px);border-color:var(--accent);box-shadow:0 26px 55px rgba(0,0,0,.38),0 0 28px var(--soft)}
        .edition-visual{height:260px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 65% 50%,var(--soft),transparent 55%),linear-gradient(135deg,#1c304e,#101e33 50%,#0c1729)}
        .edition-visual:before{content:"";position:absolute;inset:0;opacity:.2;background:linear-gradient(125deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);transform:translateX(-140%);transition:transform .8s}.edition:hover .edition-visual:before{transform:translateX(140%)}
        .edition-grain{position:absolute;inset:0;opacity:.13;background:repeating-linear-gradient(0deg,transparent 0 25px,rgba(255,255,255,.13) 26px 27px),repeating-linear-gradient(90deg,transparent 0 25px,rgba(255,255,255,.09) 26px 27px);mask-image:linear-gradient(to bottom,black,transparent)}
        .edition-header,.edition-bottom{position:absolute;z-index:2;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center;gap:10px;color:#cbd6e8;font-size:9px;font-weight:900;letter-spacing:.12em}.edition-header{top:20px}.edition-bottom{bottom:18px;color:var(--accent)}.edition-serial{color:var(--accent)}.edition-bottom-mark{font-size:18px}
        .edition-feature{position:absolute;inset:45px 20px 32px;display:grid;place-items:center}.edition-typography{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:100%;gap:7px}.edition-small{color:var(--accent);font-size:9px;letter-spacing:.25em;font-weight:900}.edition-word{font-size:clamp(2.2rem,3.3vw,3.3rem);line-height:1;font-weight:950;letter-spacing:-.065em;color:#f8f8fa;text-shadow:0 10px 30px rgba(0,0,0,.35);overflow-wrap:anywhere}.edition-rule{height:1px;width:72px;background:var(--accent);opacity:.7}.edition-year{font-size:32px;font-weight:950;letter-spacing:-.045em;color:var(--accent)}
        .edition-logo-frame{width:100%;height:100%;display:grid;place-items:center}.edition-logo{max-width:78%;max-height:155px;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 15px 24px rgba(0,0,0,.35))}
        .edition-info{padding:23px;background:linear-gradient(160deg,#142239,#0d182a)}.edition-kicker{font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:var(--accent)}.edition-name{font-size:clamp(1.3rem,2vw,1.7rem);font-weight:950;letter-spacing:-.04em;line-height:1.18;margin-top:7px;overflow-wrap:anywhere}.edition-arrow{display:grid;place-items:center;flex-shrink:0;width:34px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:50%;color:var(--accent);transition:transform .3s}.edition:hover .edition-arrow{transform:translate(3px,-3px)}
        .edition-status,.edition-game{font-size:10px;font-weight:800;padding:6px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.12);color:#c8d4e6}.edition-status.done{color:#f4cd8c}.edition-status.live{color:#78e8b7}.edition-game{color:#aabbd2}
        .edition-data{display:grid;grid-template-columns:.7fr .9fr 1.4fr;gap:10px;border-top:1px solid rgba(255,255,255,.09);margin-top:20px;padding-top:18px}.edition-data>div{min-width:0}.edition-data small{display:block;font-size:9px;font-weight:800;letter-spacing:.12em;color:#91a5c1}.edition-data strong{display:block;margin-top:6px;font-size:17px;font-weight:900;line-height:1.3}.edition-data .edition-formula{font-size:11px;overflow-wrap:anywhere}
        @media(max-width:640px){.hero-index{min-height:180px;padding:22px 0 22px 22px}.hero-index-year{font-size:6rem}.section-heading{align-items:start;flex-direction:column}.edition-visual{height:245px}}

        /* Intestazione rinnovata: architettura grafica astratta, senza monogrammi o coppe */
        .archive-hero{background:linear-gradient(180deg,#080e19,#0b1526);border-bottom:0}
        .archive-banner-art{position:absolute;inset:0;overflow:hidden;pointer-events:none;background:radial-gradient(ellipse at 90% 50%,rgba(63,109,174,.27),transparent 52%),linear-gradient(110deg,#172842,#0c182c)}
        .archive-banner-art:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#101c31 5%,rgba(16,28,49,.94) 35%,rgba(16,28,49,.28) 100%)}
        .archive-banner-ring{position:absolute;right:-110px;top:50%;width:520px;height:520px;border:1px solid rgba(234,201,145,.36);border-radius:28%;transform:translateY(-50%) rotate(35deg);animation:archiveRing 20s linear infinite}
        .archive-banner-ring.ring-two{right:-25px;width:355px;height:355px;border-color:rgba(175,207,255,.3);border-radius:40%;animation-duration:28s;animation-direction:reverse}
        .archive-banner-line{position:absolute;right:0;top:0;height:100%;width:1px;background:rgba(234,201,145,.25);transform:rotate(35deg);transform-origin:top}
        .archive-banner-line.line-one{right:14%}.archive-banner-line.line-two{right:24%;background:rgba(175,207,255,.2)}
        .archive-banner-glow{position:absolute;right:7%;top:17%;height:280px;width:280px;border-radius:50%;background:rgba(234,201,145,.13);filter:blur(75px)}
        .archive-banner-corner{position:absolute;bottom:22px;right:27px;z-index:3;font-size:9px;font-weight:900;letter-spacing:.24em;color:rgba(234,201,145,.55)}
        @keyframes archiveRing{to{transform:translateY(-50%) rotate(395deg)}}
        @media(max-width:640px){.archive-banner-ring{right:-290px;opacity:.5}.archive-banner-corner{display:none}}
        
        /* EXPERIENCE: scenografia cinematografica senza coppe, numerazioni o monogrammi */
        .archive{background:radial-gradient(ellipse at 50% 12%,#10223b 0%,#080e19 38%,#080e19 100%)}
        .archive-main-banner{box-shadow:0 45px 120px rgba(0,0,0,.46),0 0 85px rgba(96,143,212,.08);isolation:isolate}
        .archive-main-banner:after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;box-shadow:inset 0 1px rgba(255,255,255,.14),inset 0 -1px rgba(232,193,125,.15)}
        .archive-banner-grid{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 47px,rgba(200,220,255,.045) 48px 49px),repeating-linear-gradient(90deg,transparent 0 47px,rgba(200,220,255,.04) 48px 49px);transform:perspective(450px) rotateX(50deg) scale(1.7);transform-origin:70% 100%;opacity:.6;mask-image:linear-gradient(90deg,transparent 20%,#000 90%)}
        .archive-banner-horizon{position:absolute;right:-12%;bottom:-55%;width:85%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,transparent 38%,rgba(236,197,131,.11) 39%,transparent 41%,rgba(124,173,247,.1) 49%,transparent 52%);filter:drop-shadow(0 0 30px rgba(230,189,121,.2));animation:archiveHorizon 9s ease-in-out infinite alternate}
        .archive-main-banner h1{filter:drop-shadow(0 10px 30px rgba(0,0,0,.32))}
        .archive-stat-dramatic{position:relative;overflow:hidden;box-shadow:0 22px 45px rgba(0,0,0,.22);transition:transform .35s,border-color .35s,box-shadow .35s}
        .archive-stat-dramatic:after{content:"";position:absolute;right:-24px;top:-38px;width:110px;height:110px;border:1px solid rgba(255,255,255,.09);border-radius:50%;box-shadow:0 0 0 20px rgba(255,255,255,.018),0 0 0 45px rgba(255,255,255,.013);pointer-events:none}
        .archive-stat-dramatic:hover{transform:translateY(-6px);border-color:rgba(234,201,145,.42);box-shadow:0 30px 60px rgba(0,0,0,.36)}
        .archive-section{position:relative;padding-top:24px}
        .archive-section:before{content:"";position:absolute;top:0;left:0;width:110px;height:2px;background:linear-gradient(90deg,var(--section-accent),transparent);box-shadow:0 0 20px var(--section-accent)}
        .archive-section .section-heading{position:relative}
        .edition{position:relative;transform:translateZ(0);box-shadow:0 24px 55px rgba(0,0,0,.32);transition:transform .45s cubic-bezier(.18,.8,.2,1),box-shadow .45s,border-color .35s}
        .edition:hover{transform:translateY(-10px);box-shadow:0 40px 75px rgba(0,0,0,.5),0 0 38px var(--soft);border-color:var(--accent)}
        .edition-visual{isolation:isolate;overflow:hidden}
        .edition-visual:after{content:"";position:absolute;inset:-80% -120%;z-index:5;pointer-events:none;background:linear-gradient(110deg,transparent 43%,rgba(255,255,255,.09) 49%,transparent 55%);transform:translateX(-55%) rotate(-10deg);transition:transform 1s cubic-bezier(.2,.7,.2,1)}
        .edition:hover .edition-visual:after{transform:translateX(55%) rotate(-10deg)}
        .edition-stage{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
        .stage-arc{position:absolute;left:50%;top:52%;width:290px;height:290px;border:1px solid var(--accent);border-radius:37%;opacity:.2;transform:translate(-50%,-50%) rotate(28deg);transition:transform 1s,opacity .7s}
        .stage-arc.arc-b{width:205px;height:205px;transform:translate(-50%,-50%) rotate(65deg);opacity:.14}
        .edition:hover .stage-arc.arc-a{transform:translate(-50%,-50%) rotate(50deg);opacity:.36}
        .edition:hover .stage-arc.arc-b{transform:translate(-50%,-50%) rotate(40deg);opacity:.25}
        .stage-beam{position:absolute;top:-30%;left:15%;width:90px;height:150%;background:linear-gradient(90deg,transparent,var(--soft),transparent);transform:rotate(30deg);filter:blur(18px);opacity:.8}
        .stage-beam.beam-b{left:auto;right:8%;transform:rotate(-32deg);opacity:.5}
        .stage-flare{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 60%,var(--soft),transparent 64%);opacity:.7;transition:opacity .5s}
        .edition:hover .stage-flare{opacity:1}
        .edition-header,.edition-feature,.edition-bottom{z-index:2}
        .edition-typography{position:relative;z-index:2;transition:transform .5s}
        .edition:hover .edition-typography{transform:scale(1.045)}
        .edition-logo-frame{position:relative;z-index:2;transition:transform .5s}
        .edition:hover .edition-logo-frame{transform:scale(1.07)}
        .edition-bottom-mark{filter:drop-shadow(0 0 9px var(--accent))}
        @keyframes archiveHorizon{from{transform:translateY(0) scale(1)}to{transform:translateY(-22px) scale(1.08)}}
        @media(max-width:640px){.archive-banner-grid{opacity:.25}.archive-banner-horizon{right:-60%;width:150%}.stage-arc{width:230px;height:230px}.stage-arc.arc-b{width:155px;height:155px}}
        @media(prefers-reduced-motion:reduce){.archive *, .archive *:before,.archive *:after{animation:none!important;transition:none!important}}
      `}</style>
      <section className="archive-hero">
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-7 sm:px-8 lg:pb-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="archive-nav">← Home</Link>
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400">Archivio competizioni</span>
          </div>
          <div className="archive-main-banner relative mt-10 overflow-hidden rounded-[28px] border border-white/10 bg-[#101c31] sm:mt-14 lg:rounded-[36px]">
            <div className="archive-banner-art" aria-hidden="true">
              <div className="archive-banner-ring ring-one" />
              <div className="archive-banner-ring ring-two" />
              <div className="archive-banner-line line-one" />
              <div className="archive-banner-line line-two" />
              <div className="archive-banner-glow" /><div className="archive-banner-grid" /><div className="archive-banner-horizon" />
            </div>
            <div className="relative z-10 flex min-h-[370px] flex-col justify-center px-7 py-14 sm:px-12 lg:min-h-[430px] lg:px-16">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-[2px] w-9 bg-[#eac991]" />
                <span className="archive-overline">La storia delle nostre competizioni</span>
              </div>
              <h1 className="max-w-[720px] text-[clamp(2.7rem,6vw,5.6rem)] font-black leading-[1.02] tracking-[-.065em] text-white">
                Archivio <span className="text-[#eac991]">tornei.</span>
              </h1>
              <p className="mt-6 max-w-[550px] text-sm leading-7 text-slate-300 sm:text-base">
                Ogni edizione ha la sua identità. Esplora i tornei, rivivi i risultati e scopri le competizioni che hanno fatto la storia di PazziTournament.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href="#archivio" className="archive-button">Scopri le edizioni <span aria-hidden="true">↓</span></a>
                {admin && <Link href="/tornei/nuovo" className="archive-nav">＋ Nuovo torneo</Link>}
              </div>
            </div>
            <div className="archive-banner-corner" aria-hidden="true">COMPETITIONS / ARCHIVE</div>
          </div>
        </div>
      </section>
      <div className="relative mx-auto max-w-7xl px-5 pb-20 sm:px-8"><section className="-mt-7 relative z-10 mb-20 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        { label: "Edizioni", value: torneiTotali, color: "#f0d29c" }, { label: "In corso", value: torneiInCorso, color: "#8ae6ba" }, { label: "Concluse", value: torneiConclusi, color: "#b0caff" }, { label: "Partite", value: partiteTotali, color: "#d7b5f7" },
      ].map(s => <div className="archive-stat archive-stat-dramatic" key={s.label}><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{s.label}</span><strong style={{color:s.color}}>{s.value}</strong></div>)}</section>
      {tornei.length === 0 ? <section className="rounded-2xl border border-white/15 bg-[#13233b] p-12 text-center"><h2 className="text-3xl font-black">Nessun torneo creato</h2><p className="mt-3 text-slate-400">La prima edizione darà inizio all'archivio.</p>{admin && <Link href="/tornei/nuovo" className="archive-button mt-7">＋ Crea il primo torneo</Link>}</section> : <div id="archivio" className="scroll-mt-20"><nav className="mb-16 flex flex-wrap items-center gap-2"><span className="archive-overline mr-3">Vai a</span>{[
        ["mondiali", "Mondiali", mondialiNazioni.length], ["europei", "Europei", europei.length], ["africa", "Africa", coppaAfrica.length], ["america", "América", copaAmerica.length], ["asia", "Asia", coppaAsia.length], ["club", "Club", mondialiClub.length], ["altre", "Altre", torneiAltri.length],
      ].filter((x) => Number(x[2]) > 0).map(([id, label]) => <a key={id} href={`#${id}`} className="archive-nav">{label}</a>)}</nav>
      {nazioniPresenti && <div className="mb-12"><p className="archive-overline">COMPETIZIONI NAZIONALI</p><h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">Per nazioni<span className="text-[#e9c68d]">.</span></h2></div>}
      <Sezione id="mondiali" titolo="Mondiale per Nazioni" descrizione="Le edizioni della competizione mondiale per nazionali." tema="mondiale" lista={mondialiNazioni}/>
      <Sezione id="europei" titolo="Europei" descrizione="Le edizioni dei Campionati Europei." tema="europa" lista={europei}/>
      <Sezione id="africa" titolo="Coppa d'Africa" descrizione="Le edizioni della competizione africana." tema="africa" lista={coppaAfrica}/>
      <Sezione id="america" titolo="Copa América" descrizione="Le edizioni della competizione americana." tema="america" lista={copaAmerica}/>
      <Sezione id="asia" titolo="Coppa d'Asia" descrizione="Le edizioni della competizione asiatica." tema="asia" lista={coppaAsia}/>
      {mondialiClub.length > 0 && <div className="mb-12 mt-20"><p className="archive-overline">COMPETIZIONI PER CLUB</p><h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">Per club<span className="text-[#e9c68d]">.</span></h2></div>}
      <Sezione id="club" titolo="Mondiale per Club" descrizione="Le edizioni del Mondiale per Club." tema="club" lista={mondialiClub}/>
      <Sezione id="altre" titolo="Altre competizioni" descrizione="Tutte le altre edizioni dell'archivio." tema="altro" lista={torneiAltri}/></div>}
      <footer className="border-t border-white/10 pt-8"><Link href="/" className="archive-nav">← Torna alla home</Link></footer></div>
    </main>
  );
}
