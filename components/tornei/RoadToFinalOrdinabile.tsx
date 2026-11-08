"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Sfida = { id: string; card: ReactNode };
type Turno = { id: string; titolo: string; sfide: Sfida[] };
type Posizione = { id: string; lato: "alto" | "basso"; ordine: number };
type Layout = Record<string, Posizione[]>;

type Props = {
  torneoId: number;
  admin: boolean;
  turni: Turno[];
  finale: ReactNode;
  terzoPosto?: ReactNode;
};

function iniziale(turno: Turno): Posizione[] {
  const meta = Math.ceil(turno.sfide.length / 2);
  return turno.sfide.map((sfida, i) => ({ id: sfida.id, lato: i < meta ? "alto" : "basso", ordine: i < meta ? i : i - meta }));
}

function normalizza(turno: Turno, salvate?: Posizione[]): Posizione[] {
  const defaults = iniziale(turno);
  if (!salvate) return defaults;
  const validi = new Set(turno.sfide.map(s => s.id));
  const usati = new Set<string>();
  const esistenti = salvate.filter(p => validi.has(p.id) && !usati.has(p.id) && (p.lato === "alto" || p.lato === "basso") && (usati.add(p.id), true));
  const mancanti = defaults.filter(p => !usati.has(p.id));
  return [...esistenti, ...mancanti];
}

export default function RoadToFinalOrdinabile({ torneoId, admin, turni, finale, terzoPosto }: Props) {
  const chiave = `pazzitournament:road-to-final:layout:${torneoId}`;
  const [layout, setLayout] = useState<Layout>({});
  const [modifica, setModifica] = useState(false);
  const [caricato, setCaricato] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(chiave);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      setLayout(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Layout : {});
    } catch { setLayout({}); }
    setCaricato(true);
  }, [chiave]);

  const posizioni = useMemo(() => Object.fromEntries(turni.map(t => [t.id, normalizza(t, layout[t.id])])) as Layout, [turni, layout]);

  function aggiorna(turno: Turno, id: string, azione: "su" | "giu" | "cambia") {
    const pos = normalizza(turno, layout[turno.id]);
    const selezionata = pos.find(p => p.id === id);
    if (!selezionata) return;
    const prossimo = pos.map(p => ({ ...p }));
    const target = prossimo.find(p => p.id === id)!;
    if (azione === "cambia") {
      target.lato = target.lato === "alto" ? "basso" : "alto";
      target.ordine = prossimo.filter(p => p.lato === target.lato).length;
    } else {
      const gruppo = prossimo.filter(p => p.lato === target.lato).sort((a,b) => a.ordine - b.ordine);
      const indice = gruppo.findIndex(p => p.id === id);
      const vicino = gruppo[indice + (azione === "su" ? -1 : 1)];
      if (!vicino) return;
      const ordine = target.ordine;
      target.ordine = vicino.ordine;
      vicino.ordine = ordine;
    }
    for (const lato of ["alto", "basso"] as const) {
      prossimo.filter(p => p.lato === lato).sort((a,b) => a.ordine - b.ordine).forEach((p,i) => { p.ordine = i; });
    }
    const nuovo = { ...layout, [turno.id]: prossimo };
    setLayout(nuovo);
    try { window.localStorage.setItem(chiave, JSON.stringify(nuovo)); } catch { /* Memoria browser non disponibile */ }
  }

  function ripristina() {
    setLayout({});
    try { window.localStorage.removeItem(chiave); } catch { /* Memoria browser non disponibile */ }
  }

  function sezione(turno: Turno, lato: "alto" | "basso") {
    const lista = (posizioni[turno.id] ?? iniziale(turno))
      .filter(p => p.lato === lato)
      .sort((a,b) => a.ordine - b.ordine)
      .map(p => ({ posizione: p, sfida: turno.sfide.find(s => s.id === p.id) }))
      .filter((x): x is { posizione: Posizione; sfida: Sfida } => !!x.sfida);
    if (!lista.length && !modifica) return null;
    return (
      <div className="relative space-y-3" key={`${turno.id}-${lato}`}>
        <div className="flex items-center justify-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-300/35" />
          <h4 className="text-center text-[11px] font-black uppercase tracking-[.2em] text-cyan-100">{turno.titolo}</h4>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-300/35" />
        </div>
        <div className={`grid gap-3 ${lista.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : lista.length === 3 ? "grid-cols-2 lg:grid-cols-3" : lista.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-sm mx-auto"}`}>
          {lista.map(({ sfida }, index) => (
            <div key={sfida.id} className="min-w-0">
              {modifica && admin && <div className="mb-1 flex flex-wrap items-center justify-center gap-1 rounded-lg border border-amber-300/30 bg-slate-950/85 p-1">
                <button type="button" onClick={() => aggiorna(turno, sfida.id, "su")} disabled={index === 0} aria-label="Sposta prima" className="rounded px-2 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-25">←</button>
                <button type="button" onClick={() => aggiorna(turno, sfida.id, "giu")} disabled={index === lista.length-1} aria-label="Sposta dopo" className="rounded px-2 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-25">→</button>
                <button type="button" onClick={() => aggiorna(turno, sfida.id, "cambia")} className="rounded bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-400/25">{lato === "alto" ? "↓ In basso" : "↑ In alto"}</button>
              </div>}
              {sfida.card}
            </div>
          ))}
        </div>
        <div className="flex justify-center" aria-hidden="true"><span className="h-5 w-px bg-gradient-to-b from-cyan-300/70 to-amber-300/70" /></div>
      </div>
    );
  }

  const ordine = turni.filter(t => t.sfide.length > 0);
  return <div className="space-y-5">
    {admin && <div className="flex flex-wrap items-center justify-center gap-3">
      <button type="button" onClick={() => setModifica(v => !v)} className="rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-200 hover:bg-amber-300/20">{modifica ? "✓ Termina disposizione" : "✎ Modifica disposizione"}</button>
      {modifica && <button type="button" onClick={ripristina} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">Ripristina ordine iniziale</button>}
    </div>}
    {modifica && <p className="text-center text-xs text-amber-100">Usa le frecce per cambiare l'ordine delle sfide e «In alto / In basso» per spostarle nell'altra metà. Le modifiche vengono salvate automaticamente in questo browser.</p>}
    <p className="text-center text-[10px] font-black uppercase tracking-[.3em] text-cyan-200/65">Parte alta del tabellone</p>
    {ordine.map(t => sezione(t, "alto"))}
    {finale}
    {[...ordine].reverse().map(t => sezione(t, "basso"))}
    <p className="text-center text-[10px] font-black uppercase tracking-[.3em] text-cyan-200/65">Parte bassa del tabellone</p>
    {terzoPosto}
    {caricato && admin && !modifica && <p className="text-center text-[10px] text-slate-500">La disposizione personalizzata è memorizzata su questo dispositivo.</p>}
  </div>;
}
