import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { partecipanteId: number };
type Esito = "V" | "N" | "P";
type Sfida = {
  id: string;
  torneoId: number;
  torneo: string;
  anno: number;
  data: Date | null;
  ora: Date | null;
  casa: string;
  ospite: string;
  golCasa: number;
  golOspite: number;
  golPropri: number;
  golAvversari: number;
  esito: Esito;
  avversarioId: number;
  avversarioNome: string;
};

function dataIt(data: Date | null) {
  return data ? new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(data) : "Data non registrata";
}

export default async function RivalitaStoriche({ partecipanteId }: Props) {
  // Una partita viene attribuita al sostituto, se presente, AL POSTO del titolare.
  const partecipazioni = await prisma.partecipazione.findMany({
    select: { torneoId: true, squadraId: true, partecipanteId: true, partecipante: { select: { nome: true } } },
  });
  const assegnazioni = new Map<string, { id: number; nome: string }>();
  for (const p of partecipazioni) {
    if (p.partecipanteId !== null && p.partecipante) {
      assegnazioni.set(`${p.torneoId}:${p.squadraId}`, { id: p.partecipanteId, nome: p.partecipante.nome });
    }
  }
  const tornei = new Set(partecipazioni.filter(p => p.partecipanteId === partecipanteId).map(p => p.torneoId));
  // Anche le partite in cui il partecipante era soltanto sostituto.
  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
      GolCasa: { not: null },
      GolOspite: { not: null },
      OR: [
        { TorneoId: { in: [...tornei] } },
        { sostitutoCasaId: partecipanteId },
        { sostitutoOspiteId: partecipanteId },
      ],
    },
    select: {
      id: true, TorneoId: true, SquadraCasaId: true, SquadraOspiteId: true,
      GolCasa: true, GolOspite: true, dataPartita: true, OraPartita: true,
      sostitutoCasaId: true, sostitutoOspiteId: true,
      sostitutoCasa: { select: { id: true, nome: true } },
      sostitutoOspite: { select: { id: true, nome: true } },
      torneo: { select: { nome: true, anno: true } },
      squadraCasa: { select: { nome: true } },
      squadraOspite: { select: { nome: true } },
    },
    orderBy: [{ dataPartita: "asc" }, { OraPartita: "asc" }, { id: "asc" }],
  });
  const gruppi = new Map<number, { nome: string; sfide: Sfida[] }>();
  for (const p of partite) {
    if (p.SquadraCasaId === null || p.SquadraOspiteId === null || p.GolCasa === null || p.GolOspite === null) continue;
    const titolareCasa = assegnazioni.get(`${p.TorneoId}:${p.SquadraCasaId}`);
    const titolareOspite = assegnazioni.get(`${p.TorneoId}:${p.SquadraOspiteId}`);
    const casa = p.sostitutoCasaId !== null ? p.sostitutoCasa : titolareCasa;
    const ospite = p.sostitutoOspiteId !== null ? p.sostitutoOspite : titolareOspite;
    if (!casa || !ospite || casa.id === ospite.id) continue;
    if (casa.id !== partecipanteId && ospite.id !== partecipanteId) continue;
    const sonoCasa = casa.id === partecipanteId;
    const avversario = sonoCasa ? ospite : casa;
    const propri = sonoCasa ? p.GolCasa : p.GolOspite;
    const avversari = sonoCasa ? p.GolOspite : p.GolCasa;
    const esito: Esito = propri > avversari ? "V" : propri < avversari ? "P" : "N";
    const gruppo = gruppi.get(avversario.id) ?? { nome: avversario.nome, sfide: [] };
    gruppo.sfide.push({
      id: p.id.toString(), torneoId: p.TorneoId, torneo: p.torneo.nome, anno: p.torneo.anno,
      data: p.dataPartita, ora: p.OraPartita, casa: p.squadraCasa?.nome ?? "Casa",
      ospite: p.squadraOspite?.nome ?? "Ospite", golCasa: p.GolCasa, golOspite: p.GolOspite,
      golPropri: propri, golAvversari: avversari, esito, avversarioId: avversario.id, avversarioNome: avversario.nome,
    });
    gruppi.set(avversario.id, gruppo);
  }
  const rivali = [...gruppi.entries()].sort((a, b) => b[1].sfide.length - a[1].sfide.length);
  if (rivali.length === 0) return null;
  return (
    <section id="rivalita-storiche" className="relative mb-16 overflow-hidden rounded-[2.5rem] border border-amber-300/20 bg-[#0b1222] p-5 text-white shadow-2xl sm:p-9">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(245,158,11,.12),transparent_55%)]" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[.25em] text-amber-300">Pazzi Rivalries · Archivio storico</p>
        <h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">Le sfide <span className="text-amber-300">leggendarie</span></h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Ultimi incontri, record e cronologia ricavati dalle partite concluse. Le sostituzioni vengono attribuite all’allenatore effettivamente indicato nella partita.</p>
        <div className="mt-8 space-y-6">
          {rivali.map(([id, { nome, sfide }]) => {
            const vittorie = sfide.filter(s => s.esito === "V").length;
            const pareggi = sfide.filter(s => s.esito === "N").length;
            const sconfitte = sfide.filter(s => s.esito === "P").length;
            const conScarto = [...sfide].filter(s => s.esito === "V").sort((a,b) => (b.golPropri-b.golAvversari)-(a.golPropri-a.golAvversari));
            const larga = conScarto[0];
            const gol = [...sfide].sort((a,b) => (b.golCasa+b.golOspite)-(a.golCasa+a.golOspite))[0];
            let serie = 0, recordSerie = 0;
            for (const s of sfide) { serie = s.esito === "V" ? serie + 1 : 0; recordSerie = Math.max(recordSerie, serie); }
            const recenti = [...sfide].reverse().slice(0, 5);
            return (
              <article key={id} className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/partecipanti/${id}`} className="text-2xl font-black hover:text-amber-300">VS {nome} <span className="text-amber-300">↗</span></Link>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200">{sfide.length} sfide</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[{label:"Vittorie",n:vittorie,c:"text-emerald-300"},{label:"Pareggi",n:pareggi,c:"text-amber-300"},{label:"Sconfitte",n:sconfitte,c:"text-rose-300"}].map(x => <div key={x.label} className="rounded-xl bg-black/25 p-3"><div className={`text-3xl font-black ${x.c}`}>{x.n}</div><div className="text-[10px] uppercase tracking-wider text-slate-400">{x.label}</div></div>)}
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-slate-400">Vittoria più larga</div><div className="mt-2 text-lg font-black">{larga ? `${larga.golPropri}–${larga.golAvversari}` : "Nessuna vittoria"}</div>{larga && <div className="text-xs text-slate-500">{larga.torneo} {larga.anno}</div>}</div>
                  <div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-slate-400">Partita con più gol</div><div className="mt-2 text-lg font-black">{gol.golCasa}–{gol.golOspite}</div><div className="text-xs text-slate-500">{gol.casa} – {gol.ospite}</div></div>
                  <div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-slate-400">Serie massima di vittorie</div><div className="mt-2 text-lg font-black">{recordSerie}</div><div className="text-xs text-slate-500">Consecutive contro {nome}</div></div>
                </div>
                <h3 className="mt-7 text-xs font-black uppercase tracking-[.2em] text-amber-300">Ultimi cinque incontri</h3>
                <div className="mt-3 space-y-2">
                  {recenti.map(s => <Link key={s.id} href={`/tornei/${s.torneoId}/partite/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-amber-300/40">
                    <div><div className="text-sm font-semibold">{s.casa} <span className="mx-2 text-amber-300">{s.golCasa} : {s.golOspite}</span> {s.ospite}</div><div className="mt-1 text-xs text-slate-400">{s.torneo} {s.anno} · {dataIt(s.data)}</div></div>
                    <span className={`rounded-lg px-3 py-1 text-xs font-black ${s.esito === "V" ? "bg-emerald-400/15 text-emerald-300" : s.esito === "P" ? "bg-rose-400/15 text-rose-300" : "bg-amber-300/15 text-amber-300"}`}>{s.esito}</span>
                  </Link>)}
                </div>
                <details className="mt-5 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-bold text-sky-200">Cronologia completa · {sfide.length} incontri</summary><div className="mt-4 flex flex-wrap gap-2">{sfide.map(s => <Link key={s.id} title={`${dataIt(s.data)} · ${s.casa} ${s.golCasa}-${s.golOspite} ${s.ospite}`} href={`/tornei/${s.torneoId}/partite/${s.id}`} className={`rounded-lg border px-3 py-2 text-xs font-black ${s.esito === "V" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : s.esito === "P" ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}>{s.anno} · {s.esito}</Link>)}</div></details>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-500">I risultati ai rigori sono mostrati come pareggi nei tempi di gioco, coerentemente con il conteggio delle statistiche esistenti. Le partite senza allenatori identificabili sono escluse.</p>
      </div>
    </section>
  );
}
