"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GEO_COUNTRIES } from "./geoCountries";
import { EUROPE_COASTLINES, EUROPE_BORDERS } from "./geoEuropeDetail";

export type VincitoreStorico = {
  iso: string | null;
  squadraId: number;
  nome: string;
  stemma: string | null;
  titoli: { anno: number; torneoId: number; allenatore: string | null }[];
};

const VISTE: Record<string, { box: string; label: string }> = {
  "Europeo": { box: "379 37 193 118", label: "Europa" },
  "Copa América": { box: "0 15 410 395", label: "Americhe" },
  "Coppa d'Africa": { box: "345 150 200 205", label: "Africa" },
  "Coppa d'Asia": { box: "425 0 439 420", label: "Asia e Oceania" },
  "Mondiale per Nazioni": { box: "0 0 864 432", label: "Mondo" },
};

// Le regioni sotto non sono stati indipendenti: le sagome sono indicative,
// posizionate sul planisfero SVG 864×432, senza colorare l'intero Regno Unito o la Spagna.
const REGIONI_SPECIALI = [
  { iso: "REG-BASQUE", nome: "Paesi Baschi", x: 426.1, y: 112.5,
    d: "M423.6 111.2 L426.0 110.6 L428.3 111.5 L428.5 113.8 L426.4 114.4 L423.8 113.4 Z" },
  { iso: "REG-BRETAGNE", nome: "Bretagna", x: 422.2, y: 103.6,
    d: "M418.4 102.1 L422.5 101.6 L425.5 103.3 L424.2 105.0 L420.7 104.8 Z" },
];

type GeoFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates: unknown } | null;
};

function isEngland(feature: GeoFeature): boolean {
  const p = feature.properties ?? {};
  const codes = [p.shapeISO, p.CTRY24CD, p.CTRY23CD, p.CTRY22CD, p.CTRY21CD, p.CTRY20CD, p.CTRY19CD, p.code, p.id];
  if (codes.some(v => v === "GB-ENG" || v === "E92000001")) return true;
  return [p.shapeName, p.CTRY24NM, p.CTRY23NM, p.CTRY22NM, p.CTRY21NM, p.name].some(v => typeof v === "string" && v.toLowerCase() === "england");
}

// Proiezione equirettangolare identica al planisfero 864x432 già utilizzato.
function englandSvgPath(geometry: NonNullable<GeoFeature["geometry"]>): string {
  const point = (coords: number[]) => `${((coords[0] + 180) * 2.4).toFixed(3)} ${((90 - coords[1]) * 2.4).toFixed(3)}`;
  const ringPath = (ring: number[][]) => ring.length > 2 ? `M${ring.map(point).join(" L")} Z` : "";
  const polygonPath = (polygon: number[][][]) => polygon.map(ringPath).join(" ");
  if (geometry.type === "Polygon") return polygonPath(geometry.coordinates as number[][][]);
  if (geometry.type === "MultiPolygon") return (geometry.coordinates as number[][][][]).map(polygonPath).join(" ");
  return "";
}

export default function AtlanteStorico({ tipo, vincitori }: { tipo: string; vincitori: VincitoreStorico[] }) {
  const [scelto, setScelto] = useState<number | null>(null);
  const [inghilterraPath, setInghilterraPath] = useState("");
  const [erroreConfini, setErroreConfini] = useState(false);

  useEffect(() => {
    if (tipo !== "Europeo" || !vincitori.some(v => v.iso === "GB-ENG")) return;
    let annullato = false;
    // Dataset geografico ONS WGS84 già utilizzato nel progetto, non una sagoma stimata.
    fetch("/data/uk-countries-ons-wgs84.geojson")
      .then(async response => {
        if (!response.ok) throw new Error(`GeoJSON non trovato: ${response.status}`);
        return response.json();
      })
      .then((geojson: { features?: GeoFeature[] }) => {
        const england = geojson.features?.find(isEngland);
        if (!england?.geometry) throw new Error("Confine England assente dal GeoJSON");
        const d = englandSvgPath(england.geometry);
        if (!d) throw new Error("Geometria England non supportata");
        if (!annullato) { setInghilterraPath(d); setErroreConfini(false); }
      })
      .catch(() => { if (!annullato) setErroreConfini(true); });
    return () => { annullato = true; };
  }, [tipo, vincitori]);
  const vista = VISTE[tipo];
  const isoTitoli = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vincitori) if (v.iso) map.set(v.iso, (map.get(v.iso) ?? 0) + v.titoli.length);
    return map;
  }, [vincitori]);
  if (!vista || !vincitori.length) return null;
  const attivo = vincitori.find(v => v.squadraId === scelto);
  return <section className="mt-10 overflow-hidden rounded-[30px] border border-[#d9b873]/25 bg-[#0c1627]">
    <div className="px-6 pb-5 pt-8 sm:px-10"><p className="text-[11px] font-black uppercase tracking-[.3em] text-[#d9b873]">Geografia della gloria</p><h2 className="mt-2 text-3xl font-black">Le nazioni che hanno fatto <span className="text-[#e8ca89]">la storia.</span></h2><p className="mt-2 text-sm text-slate-400">{vista.label}: i paesi dorati hanno conquistato almeno un titolo. I territori dorati indicano le nazionali campioni. Il numero di titoli è riportato nelle schede sotto la mappa. Tocca una squadra per vedere gli anni e gli allenatori.</p></div>
    <div className="relative overflow-hidden border-y border-white/10 bg-[radial-gradient(ellipse_at_center,#22324d,#0a1323_75%)]">
      <svg viewBox={vista.box} className="h-auto max-h-[720px] w-full" role="img" aria-label={`Mappa storica ${vista.label} con nazioni vincitrici evidenziate`}>
        {GEO_COUNTRIES.map(p => <path key={p.iso + p.name} d={p.d} fill={isoTitoli.has(p.iso) ? "#e7b968" : "#3e516d"} fillOpacity={isoTitoli.has(p.iso) ? 1 : .92} stroke={tipo === "Europeo" ? "#9baac1" : "#17263c"} strokeOpacity={tipo === "Europeo" ? .72 : .85} strokeWidth={tipo === "Europeo" ? ".28" : ".65"} strokeLinejoin="round"><title>{`${p.name}${isoTitoli.has(p.iso) ? ` · ${isoTitoli.get(p.iso)} titoli` : ""}`}</title></path>)}
        {tipo === "Europeo" && (
          <g aria-hidden="true" pointerEvents="none" fill="none" strokeLinejoin="round" strokeLinecap="round">
            {/* Linee di costa GSHHG a risoluzione intermedia: isole e penisole molto più definite. */}
            <g stroke="#d9e4ee" strokeWidth="0.20" strokeOpacity="0.88">
              {EUROPE_COASTLINES.map((d, i) => <path key={`coast-${i}`} d={d} />)}
            </g>
            {/* Confini nazionali WDBII ad alta densità rispetto al vecchio 110m. */}
            <g stroke="#a9bed4" strokeWidth="0.16" strokeOpacity="0.82">
              {EUROPE_BORDERS.map((d, i) => <path key={`border-${i}`} d={d} />)}
            </g>
          </g>
        )}
        {tipo === "Europeo" && inghilterraPath && (
          <path d={inghilterraPath} fill={isoTitoli.has("GB-ENG") ? "#dfaa61" : "transparent"}
            fillRule="evenodd" stroke={isoTitoli.has("GB-ENG") ? "#ffe2a5" : "transparent"}
            strokeWidth=".18" strokeLinejoin="round" pointerEvents="none">
            <title>Inghilterra</title>
          </path>
        )}
        {REGIONI_SPECIALI.map(r => <path key={r.iso} d={r.d} fill={isoTitoli.has(r.iso) ? "#dfaa61" : "transparent"} fillOpacity=".98" stroke={isoTitoli.has(r.iso) ? "#ffe2a5" : "transparent"} strokeWidth=".28" strokeLinejoin="round"><title>{r.nome}</title></path>)}
        {/* Sullo zoom europeo le coste e i confini sono sottili, così anche le regioni piccole rimangono visibili. */}
        {tipo === "Europeo" && <g pointerEvents="none" fill="#d7e1ee" fontSize="3.1" fontWeight="600" letterSpacing=".16" opacity=".88">
          <text x="405" y="76">ATLANTICO</text>
          <text x="446" y="151">MEDITERRANEO</text>
          <text x="494" y="84">BALTICO</text>
        </g>}
        {/* Indicatori discreti: nessun numero sovrapposto ai territori. */}
        {GEO_COUNTRIES.filter(p => isoTitoli.has(p.iso)).map(p => (
          <g key={p.iso}>
            <circle cx={p.x} cy={p.y} r={tipo === "Europeo" ? "1.15" : "2.1"} fill="#fff0c7" stroke="#182235" strokeWidth=".6" />
            <title>{`${p.name}: ${isoTitoli.get(p.iso)} titoli`}</title>
          </g>
        ))}
        {REGIONI_SPECIALI.filter(r => isoTitoli.has(r.iso)).map(r => (
          <g key={r.iso}>
            <circle cx={r.x} cy={r.y} r={tipo === "Europeo" ? ".75" : "1.3"} fill="#fff0c7" stroke="#182235" strokeWidth=".4" />
            <title>{`${r.nome}: ${isoTitoli.get(r.iso)} titoli`}</title>
          </g>
        ))}
      </svg>
      {tipo === "Europeo" && erroreConfini && <p className="px-5 py-3 text-xs text-amber-200">L’Inghilterra è riconosciuta come vincitrice, ma il suo contorno non è disponibile: manca o non è leggibile public/data/uk-countries-ons-wgs84.geojson.</p>}
    </div>
    <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">{vincitori.map(v => <button type="button" key={v.squadraId} onClick={() => setScelto(scelto === v.squadraId ? null : v.squadraId)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${scelto === v.squadraId ? "border-[#e4b466] bg-[#d9b873]/15" : "border-white/10 bg-white/[.035] hover:border-[#d9b873]/40"}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 p-2">{v.stemma ? <img src={v.stemma} alt="" className="h-full w-full object-contain" /> : <span className="text-[#d9b873]">✦</span>}</div><div className="min-w-0 flex-1"><p className="truncate font-black">{v.nome}</p><p className="text-xs text-[#e8ca89]">{v.titoli.length} {v.titoli.length === 1 ? "titolo" : "titoli"}</p></div><span className="text-[#d9b873]">{scelto === v.squadraId ? "−" : "+"}</span>
    </button>)}</div>
    {attivo && <div className="border-t border-[#d9b873]/25 bg-[#17243a] p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-black">{attivo.nome} · {attivo.titoli.length} titoli</h3><Link href={`/squadre/${attivo.squadraId}`} className="text-sm font-bold text-[#e8ca89]">Profilo squadra ↗</Link></div><div className="mt-4 flex flex-wrap gap-2">{attivo.titoli.map(t => <Link key={t.torneoId} href={`/tornei/${t.torneoId}`} className="rounded-xl border border-[#d9b873]/20 bg-white/5 px-4 py-3 text-sm transition hover:border-[#d9b873]"><span className="font-black text-[#e8ca89]">{t.anno}</span><span className="ml-2 text-slate-300">{t.allenatore ?? "Allenatore non attribuito"}</span></Link>)}</div></div>}
    {vincitori.some(v => !v.iso) && <p className="px-6 pb-5 text-xs text-slate-500">Le rappresentative non corrispondenti a uno stato nella cartina (es. Paesi Baschi, Bretagna) restano nell'elenco dei campioni, senza collocazioni geografiche inesatte.</p>}
  </section>;
}
