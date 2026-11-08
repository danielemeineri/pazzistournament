"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
// @ts-ignore - Il pacchetto espone i dati dei Paesi senza tipi completi.
import countriesData from "world-countries";

type Squadra = {
  id: number;
  nome: string;
  tipo: string;
  nazione: string | null;
  stemma: string | null;
};
type Props = { squadre: Squadra[]; admin: boolean };
type Paese = {
  cca3: string;
  name: { common: string; official: string };
  translations?: { ita?: { common: string; official: string } };
  region?: string;
  subregion?: string;
};

function normalizzaTesto(testo: string) {
  return testo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT").replace(/[’']/g, " ")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const alias: Record<string, string> = {
  usa: "USA", "stati uniti": "USA", "stati uniti d america": "USA",
  "corea del sud": "KOR", "corea del nord": "PRK",
  "costa d avorio": "CIV", "repubblica ceca": "CZE",
  olanda: "NLD", "paesi bassi": "NLD", "emirati arabi": "ARE",
  "emirati arabi uniti": "ARE", "nuova zelanda": "NZL",
  "macedonia del nord": "MKD", "arabia saudita": "SAU",
  "sud africa": "ZAF", sudafrica: "ZAF", "capo verde": "CPV", "burkina faso": "BFA",
  "guinea equatoriale": "GNQ", "repubblica democratica del congo": "COD",
  "congo dr": "COD", congo: "COG", iran: "IRN", cina: "CHN",
  russia: "RUS", turchia: "TUR", vietnam: "VNM", bolivia: "BOL",
  venezuela: "VEN", paraguay: "PRY", uruguay: "URY",
  messico: "MEX", brasile: "BRA", argentina: "ARG", giappone: "JPN",
};
// Nazionali storiche, regionali o con denominazioni non presenti nel catalogo.
// La classificazione riguarda soltanto la visualizzazione dell'archivio.
const continentiSpeciali: Record<string, string> = {
  "paesi baschi": "Europa",
  bretagna: "Europa",
  sudafrica: "Africa",
  "sud africa": "Africa",
  tahiti: "Oceania",
  "antille olandesi": "Nord America",
};
const britanniche = new Set(["inghilterra", "scozia", "galles", "irlanda del nord"]);
const ordineContinenti = ["Europa", "Sud America", "Nord America", "Africa", "Asia", "Oceania", "Antartide", "Altre nazionali"];

const catalogo = countriesData as unknown as Paese[];
const paesiPerNome = new Map<string, Paese>();
const paesiPerCodice = new Map<string, Paese>();
for (const paese of catalogo) {
  paesiPerCodice.set(paese.cca3, paese);
  for (const nome of [paese.name.common, paese.name.official, paese.translations?.ita?.common, paese.translations?.ita?.official]) {
    if (nome) paesiPerNome.set(normalizzaTesto(nome), paese);
  }
}

function continenteDellaNazionale(nome: string): string {
  const chiave = normalizzaTesto(nome);
  if (continentiSpeciali[chiave]) return continentiSpeciali[chiave];
  if (britanniche.has(chiave)) return "Europa";
  const paese = paesiPerNome.get(chiave) ?? paesiPerCodice.get(alias[chiave] ?? "");
  if (!paese) return "Altre nazionali";
  switch (paese.region) {
    case "Europe": return "Europa";
    case "Africa": return "Africa";
    case "Asia": return "Asia";
    case "Oceania": return "Oceania";
    case "Antarctic": return "Antartide";
    case "Americas": return paese.subregion === "South America" ? "Sud America" : "Nord America";
    default: return "Altre nazionali";
  }
}

function SquadraCard({ squadra, admin }: { squadra: Squadra; admin: boolean }) {
  return (
    <article className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0d1930] shadow-[0_16px_42px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/45 hover:shadow-[0_20px_48px_rgba(218,165,32,0.10)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(231,187,92,0.11),transparent_65%)] opacity-60 transition group-hover:opacity-100" />
      <div className="relative p-5 sm:p-6">
        <div className="flex h-28 items-center justify-center">
          {squadra.stemma ? (
            <img src={squadra.stemma} alt={`Stemma ${squadra.nome}`} className="h-24 w-24 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl">⚽</div>
          )}
        </div>
        <h3 className="mt-4 text-center text-xl font-black tracking-tight text-white">{squadra.nome}</h3>
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-amber-200/75">
          {squadra.tipo === "Nazionale" ? "Nazionale" : squadra.nazione || "Club"}
        </p>
      </div>
      <div className="relative grid gap-2 border-t border-white/10 bg-black/15 p-4" style={{ gridTemplateColumns: admin ? "1fr 1fr" : "1fr" }}>
        <Link href={`/squadre/${squadra.id}`} className="rounded-xl border border-amber-300/30 bg-amber-300 px-3 py-3 text-center text-sm font-extrabold text-[#142039] transition hover:bg-amber-200">Visualizza</Link>
        {admin && <Link href={`/squadre/${squadra.id}/modifica`} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center text-sm font-bold text-white transition hover:bg-white/20">Modifica</Link>}
      </div>
    </article>
  );
}

function Gruppo({ titolo, squadre, admin, ricercaAttiva, inizialmenteAperto = false }: {
  titolo: string; squadre: Squadra[]; admin: boolean; ricercaAttiva: boolean; inizialmenteAperto?: boolean;
}) {
  // key differenziata in base alla ricerca: i gruppi con risultati si aprono subito.
  return (
    <details key={`${titolo}-${ricercaAttiva ? "ricerca" : "normale"}`} open={ricercaAttiva || inizialmenteAperto ? true : undefined}
      className="group/gruppo overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] open:border-amber-300/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-5 transition hover:bg-white/[0.045] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 text-base font-extrabold text-white sm:text-lg">{titolo}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">{squadre.length}</span>
          <span className="text-amber-200 transition-transform group-open/gruppo:rotate-180" aria-hidden="true">⌄</span>
        </span>
      </summary>
      <div className="grid gap-4 border-t border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5 xl:p-5">
        {squadre.map((squadra) => <SquadraCard key={squadra.id} squadra={squadra} admin={admin} />)}
      </div>
    </details>
  );
}

export default function ListaSquadre({ squadre, admin }: Props) {
  const [ricerca, setRicerca] = useState("");
  const [sezione, setSezione] = useState<"tutte" | "nazionali" | "club">("tutte");
  const squadreFiltrate = useMemo(() => {
    const termine = normalizzaTesto(ricerca);
    return termine ? squadre.filter((squadra) => [squadra.nome, squadra.tipo, squadra.nazione ?? ""].some((valore) => normalizzaTesto(valore).includes(termine))) : squadre;
  }, [squadre, ricerca]);

  const nazionali = useMemo(() => squadreFiltrate.filter((s) => s.tipo === "Nazionale"), [squadreFiltrate]);
  const club = useMemo(() => squadreFiltrate.filter((s) => s.tipo !== "Nazionale"), [squadreFiltrate]);
  const continenti = useMemo(() => {
    const mappa = new Map<string, Squadra[]>();
    for (const squadra of nazionali) {
      const continente = continenteDellaNazionale(squadra.nome);
      if (!mappa.has(continente)) mappa.set(continente, []);
      mappa.get(continente)!.push(squadra);
    }
    return Array.from(mappa.entries()).sort((a, b) => ordineContinenti.indexOf(a[0]) - ordineContinenti.indexOf(b[0]));
  }, [nazionali]);
  const clubPerNazione = useMemo(() => {
    const mappa = new Map<string, Squadra[]>();
    for (const squadra of club) {
      const nazione = squadra.nazione?.trim() || "Senza nazione";
      if (!mappa.has(nazione)) mappa.set(nazione, []);
      mappa.get(nazione)!.push(squadra);
    }
    return Array.from(mappa.entries()).sort((a, b) => a[0].localeCompare(b[0], "it"));
  }, [club]);
  const ricercaAttiva = ricerca.trim().length > 0;

  return (
    <section className="text-white">
      <div className="mb-8 rounded-[1.8rem] border border-white/10 bg-[#101d35]/90 p-5 shadow-2xl sm:p-7">
        <label htmlFor="ricerca-squadre" className="mb-3 block text-xs font-black uppercase tracking-[0.2em] text-amber-200">Cerca una squadra</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xl" aria-hidden="true">⌕</span>
          <input id="ricerca-squadre" type="search" autoComplete="off" placeholder="Scrivi Inter, Italia, Brasile..." value={ricerca} onChange={(e) => setRicerca(e.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-[#080f20] py-4 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/10" />
          {ricerca && <button type="button" onClick={() => setRicerca("")} aria-label="Cancella ricerca" className="absolute inset-y-0 right-4 text-xl text-slate-400 hover:text-white">×</button>}
        </div>
        <p className="mt-3 text-sm text-slate-400" aria-live="polite">{ricercaAttiva ? `${squadreFiltrate.length} ${squadreFiltrate.length === 1 ? "squadra trovata" : "squadre trovate"}` : "Cerca per nome, tipo di squadra o nazione."}</p>
        {ricercaAttiva && squadreFiltrate.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#091327]">
            {squadreFiltrate.slice(0, 8).map((squadra) => (
              <Link key={squadra.id} href={`/squadre/${squadra.id}`} className="flex items-center gap-4 border-b border-white/10 px-4 py-3 transition last:border-0 hover:bg-white/10">
                {squadra.stemma ? <img src={squadra.stemma} alt="" className="h-10 w-10 shrink-0 object-contain" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">⚽</span>}
                <span className="min-w-0 flex-1"><span className="block font-bold">{squadra.nome}</span><span className="block text-xs text-slate-400">{squadra.tipo === "Nazionale" ? "Nazionale" : `Club${squadra.nazione ? ` · ${squadra.nazione}` : ""}`}</span></span>
                <span className="text-amber-300">→</span>
              </Link>
            ))}
            {squadreFiltrate.length > 8 && <p className="px-4 py-3 text-center text-sm text-slate-400">Altri {squadreFiltrate.length - 8} risultati nell'elenco.</p>}
          </div>
        )}
        {ricercaAttiva && squadreFiltrate.length === 0 && <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4"><p className="font-semibold">Nessuna squadra trovata</p><p className="mt-1 text-sm text-slate-400">Prova con un altro nome o con la nazione.</p></div>}
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Filtra tipologia squadre">
          {([ ["tutte", "Tutte", squadreFiltrate.length], ["nazionali", "Nazionali", nazionali.length], ["club", "Club", club.length] ] as const).map(([valore, titolo, conteggio]) => (
            <button key={valore} type="button" onClick={() => setSezione(valore)} aria-pressed={sezione === valore}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${sezione === valore ? "border-amber-300 bg-amber-300 text-[#0c1730]" : "border-white/15 bg-white/5 text-slate-200 hover:border-amber-300/40"}`}>
              {titolo} <span className="ml-1 opacity-70">{conteggio}</span>
            </button>
          ))}
        </div>
      </div>

      {squadre.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">Nessuna squadra presente.</div>
      ) : squadreFiltrate.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">Modifica la ricerca per visualizzare altre squadre.</div>
      ) : (
        <div className="space-y-12">
          {(sezione === "tutte" || sezione === "nazionali") && (
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
                <div><p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Selezioni nazionali</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Nazionali <span className="text-slate-500">/ Continenti</span></h2></div>
                <span className="text-sm text-slate-400">{nazionali.length} squadre</span>
              </div>
              {continenti.length ? <div className="space-y-3">{continenti.map(([nome, elenco], i) => <Gruppo key={nome} titolo={nome} squadre={elenco} admin={admin} ricercaAttiva={ricercaAttiva} inizialmenteAperto={i === 0} />)}</div> : <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-slate-400">Nessuna nazionale corrispondente.</p>}
            </section>
          )}
          {(sezione === "tutte" || sezione === "club") && (
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
                <div><p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Squadre di club</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Club <span className="text-slate-500">/ Nazioni</span></h2></div>
                <span className="text-sm text-slate-400">{club.length} squadre</span>
              </div>
              {clubPerNazione.length ? <div className="space-y-3">{clubPerNazione.map(([nome, elenco], i) => <Gruppo key={nome} titolo={nome} squadre={elenco} admin={admin} ricercaAttiva={ricercaAttiva} inizialmenteAperto={i === 0} />)}</div> : <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-slate-400">Nessun club corrispondente.</p>}
            </section>
          )}
        </div>
      )}
    </section>
  );
}
