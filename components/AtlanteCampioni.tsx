"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GEO_COUNTRIES } from "./geoCountries";

export type CampioneAtlante = {
  tipo: string;
  anno: number | null;
  squadraId: number | null;
  squadra: string | null;
  stemma: string | null;
  allenatore: string | null;
  allenatoreId: number | null;
};

export const IMMAGINI_COPPE: Record<string, string> = {
  "Mondiale per Nazioni": "/trofei/mondiale-nazioni.png",
  "Mondiale per Club": "/trofei/mondiale-club.png",
  "Europeo": "/trofei/europeo.png",
  "Copa América": "/trofei/copa-america.png",
  "Coppa d'Africa": "/trofei/coppa-africa.png",
  "Coppa d'Asia": "/trofei/coppa-asia.png",
};

const TINTE = ["#e4b466", "#69bdf1", "#de91db", "#65d6ad", "#fa907b", "#a7a0f9"];
const CONTINENTE_TIPO: Record<string, string> = {
  Europe: "Europeo", Africa: "Coppa d'Africa", Asia: "Coppa d'Asia",
  Oceania: "Coppa d'Asia", "North America": "Copa América", "South America": "Copa América",
};
const POSIZIONI = [
  { tipo: "Copa América", left: "21%", top: "55%" },
  { tipo: "Europeo", left: "49%", top: "34%" },
  { tipo: "Coppa d'Africa", left: "51%", top: "65%" },
  { tipo: "Coppa d'Asia", left: "77%", top: "47%" },
];

function Vetrina({ campione, compatta = false, onClick }: { campione: CampioneAtlante; compatta?: boolean; onClick?: () => void }) {
  const contenuto = <>
    <div className={`relative mx-auto flex items-center justify-center ${compatta ? "h-20 w-20 sm:h-28 sm:w-28" : "h-24 w-24 sm:h-32 sm:w-32"}`}>
      <div className="absolute inset-3 rounded-full bg-[#d9b873]/20 blur-2xl" />
      <img src={IMMAGINI_COPPE[campione.tipo]} alt="" className="relative h-full w-full object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,.8)]" />
    </div>
    <div className="relative -mt-2 flex items-center justify-center gap-2 rounded-xl border border-[#d9b873]/40 bg-[#090f1c]/95 px-2 py-1.5 shadow-2xl">
      {campione.stemma ? <img src={campione.stemma} alt="" className="h-8 w-8 shrink-0 object-contain" /> : <span className="text-lg text-[#d9b873]">✦</span>}
      <div className="min-w-0 text-left"><p className="truncate text-[10px] font-black text-[#f4d598]">{campione.anno ?? "—"}</p><p className="max-w-28 truncate text-[10px] font-semibold text-white">{campione.squadra ?? "Da assegnare"}</p></div>
    </div>
    <p className="mt-1.5 text-center text-[10px] font-black uppercase tracking-wider text-[#f1d39a] drop-shadow-[0_2px_4px_black]">{campione.tipo}</p>
  </>;
  return onClick ? <button type="button" onClick={onClick} className="group w-full transition duration-300 hover:-translate-y-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d9b873]">{contenuto}</button> : <div className="w-full">{contenuto}</div>;
}

export default function AtlanteCampioni({ campioni }: { campioni: CampioneAtlante[] }) {
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const perTipo = useMemo(() => new Map(campioni.map(c => [c.tipo, c])), [campioni]);
  const allenatori = useMemo(() => [...new Map(campioni.filter(c => c.allenatoreId !== null).map(c => [c.allenatoreId!, c.allenatore ?? ""])).entries()].sort((a, b) => a[0] - b[0]), [campioni]);
  const tinta = (tipo?: string) => {
    const campione = tipo ? perTipo.get(tipo) : undefined;
    if (!campione || campione.allenatoreId === null) return "#33465f";
    const indice = allenatori.findIndex(([id]) => id === campione.allenatoreId);
    return TINTE[(indice < 0 ? 0 : indice) % TINTE.length];
  };
  const selezione = selezionato ? perTipo.get(selezionato) : null;
  return <section className="mt-12 overflow-hidden rounded-[32px] border border-[#d9b873]/30 bg-[#090f1c] shadow-[0_30px_100px_rgba(0,0,0,.45)]">
    <div className="border-b border-white/10 px-6 py-8 sm:px-10">
      <p className="text-[11px] font-black uppercase tracking-[.35em] text-[#d9b873]">PazziTournament · Il trono del mondo</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Il mondo ha i suoi <span className="text-[#e6c184]">campioni.</span></h2>
      <p className="mt-3 max-w-2xl text-sm text-slate-400">Le coppe dei campioni in carica, le squadre e gli anni delle ultime edizioni. Seleziona una coppa per scoprire il suo allenatore.</p>
      <div className="mt-5 flex flex-wrap gap-2">{allenatori.map(([id, nome], indice) => <span key={id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold" style={{ color: TINTE[indice % TINTE.length] }}>● {nome}</span>)}<span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400">Grigio = allenatore non attribuito</span></div>
    </div>
    <div className="overflow-x-auto">
      <div className="relative mx-auto min-w-[790px] max-w-[1200px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#25334b_0%,#10192a_55%,#060b15_100%)]" style={{ aspectRatio: "1000 / 640" }}>
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#d8c29b 0.7px,transparent 0.7px)", backgroundSize: "7px 7px" }} />
        <svg viewBox="0 0 864 432" className="absolute inset-0 h-full w-full opacity-90" preserveAspectRatio="xMidYMid meet" aria-label="Planisfero dei continenti colorati secondo l'allenatore campione" role="img">
          <defs><filter id="atlanteGlow"><feGaussianBlur stdDeviation="3" /></filter></defs>
          <g transform="translate(0 0)">{GEO_COUNTRIES.map(p => {
            const colore = tinta(CONTINENTE_TIPO[p.continent]);
            return <path key={p.iso + p.name} d={p.d} fill={colore} fillOpacity={CONTINENTE_TIPO[p.continent] ? .66 : .15} stroke="#f5dfac" strokeOpacity=".32" strokeWidth=".55" strokeLinejoin="round" />;
          })}</g>
        </svg>
        <div className="absolute inset-x-0 top-[2%] flex justify-center gap-20">
          {campioni.filter(c => c.tipo.startsWith("Mondiale")).map(c => <div key={c.tipo} className="w-40"><Vetrina campione={c} compatta onClick={() => setSelezionato(c.tipo)} /></div>)}
        </div>
        {POSIZIONI.map(p => {
          const c = perTipo.get(p.tipo);
          return c ? <div key={p.tipo} className="absolute w-40 -translate-x-1/2 -translate-y-1/2" style={{ left: p.left, top: p.top }}><Vetrina campione={c} onClick={() => setSelezionato(p.tipo)} /></div> : null;
        })}
        <div className="absolute bottom-3 left-5 text-[10px] font-black uppercase tracking-[.4em] text-[#d9b873]/70">Hall of Fame / World Atlas</div>
      </div>
    </div>
    {selezione && <div className="flex flex-wrap items-center gap-4 border-t border-[#d9b873]/25 bg-[#172339] px-6 py-5 sm:px-10" aria-live="polite">
      {selezione.stemma && <img src={selezione.stemma} alt="" className="h-14 w-14 object-contain" />}
      <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wider text-[#d9b873]">{selezione.tipo} · {selezione.anno ?? "—"}</p><p className="mt-1 text-xl font-black">{selezione.squadra ?? "Titolo non assegnato"}</p><p className="text-sm text-slate-300">Allenatore: {selezione.allenatore ?? "Non attribuito"}</p></div>
      <Link href={`/albo-doro?competizione=${encodeURIComponent(selezione.tipo)}`} className="rounded-full border border-[#d9b873]/40 px-5 py-3 text-sm font-bold text-[#f2d59b] hover:bg-[#d9b873]/10">Apri competizione ↗</Link>
      <button type="button" onClick={() => setSelezionato(null)} className="text-sm text-slate-400 hover:text-white">Chiudi ×</button>
    </div>}
    <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500 sm:px-10">Copa América: tutte le Americhe · Coppa d'Asia: Asia e Oceania · I titoli mondiali sono rappresentati sopra il planisfero. La tinta indica l'allenatore campione continentale.</div>
  </section>;
}
