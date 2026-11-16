import "server-only";

import Link from "next/link";
import AccessiEsterniAdmin from "@/components/AccessiEsterniAdmin";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ZONA = "Europe/Rome";
const FINESTRA_ATTIVA_MS = 60_000;
const LIMITE_STORICO = 100;

function dataItalia(data: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function durata(secondi: number): string {
  const valore = Math.max(0, Math.floor(secondi));
  const ore = Math.floor(valore / 3600);
  const minuti = Math.floor((valore % 3600) / 60);
  const restanti = valore % 60;
  if (ore > 0) return `${ore} h ${String(minuti).padStart(2, "0")} min`;
  if (minuti > 0) return `${minuti} min ${String(restanti).padStart(2, "0")} s`;
  return `${restanti} s`;
}

function dataInizioGiornoItalia(ora: Date): Date {
  // Conversione robusta del giorno civile italiano a mezzanotte UTC.
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(ora);
  const anno = Number(parti.find((p) => p.type === "year")?.value);
  const mese = Number(parti.find((p) => p.type === "month")?.value);
  const giorno = Number(parti.find((p) => p.type === "day")?.value);
  const mezzogiorno = new Date(Date.UTC(anno, mese - 1, giorno, 12));
  const oraRoma = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA, hour: "2-digit", hourCycle: "h23",
  }).format(mezzogiorno));
  const offset = oraRoma - 12;
  return new Date(Date.UTC(anno, mese - 1, giorno, -offset));
}

export default async function PaginaAccessiAdmin() {
  await requireAdmin();

  const adesso = new Date();
  const oggi = dataInizioGiornoItalia(adesso);
  const setteGiorni = new Date(adesso.getTime() - 7 * 24 * 60 * 60 * 1000);
  const trentaGiorni = new Date(adesso.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [riepilogo, perPartecipante, visiteRecenti, visiteUltimi30Giorni] = await Promise.all([
    prisma.visitaSito.aggregate({
      _count: { _all: true },
      _sum: { secondiAttivi: true },
    }),
    prisma.visitaSito.groupBy({
      by: ["partecipanteId"],
      _count: { _all: true },
      _sum: { secondiAttivi: true },
      _max: { iniziataIl: true, ultimaAttivitaIl: true },
    }),
    prisma.visitaSito.findMany({
      orderBy: [{ iniziataIl: "desc" }, { id: "desc" }],
      take: LIMITE_STORICO,
      include: { partecipante: { select: { nome: true } } },
    }),
    prisma.visitaSito.findMany({
      where: { iniziataIl: { gte: trentaGiorni } },
      select: {
        partecipanteId: true,
        iniziataIl: true,
        ultimaAttivitaIl: true,
        terminataIl: true,
        secondiAttivi: true,
      },
    }),
  ]);

  const nomi = await prisma.partecipante.findMany({
    where: { id: { in: perPartecipante.map((p) => p.partecipanteId) } },
    select: { id: true, nome: true },
  });
  const nomiPerId = new Map(nomi.map((p) => [p.id, p.nome]));
  const riepiloghi = perPartecipante.map((p) => ({
    id: p.partecipanteId,
    nome: nomiPerId.get(p.partecipanteId) ?? `Partecipante #${p.partecipanteId}`,
    visite: p._count._all,
    secondi: p._sum.secondiAttivi ?? 0,
    ultimaVisita: p._max.iniziataIl,
    ultimaAttivita: p._max.ultimaAttivitaIl,
    recenti: visiteUltimi30Giorni.filter((v) => v.partecipanteId === p.partecipanteId),
  })).sort((a, b) => b.secondi - a.secondi);

  const visiteOggi = visiteUltimi30Giorni.filter((v) => v.iniziataIl >= oggi).length;
  const visite7 = visiteUltimi30Giorni.filter((v) => v.iniziataIl >= setteGiorni).length;
  const visite30 = visiteUltimi30Giorni.length;
  const attiviStimati = visiteUltimi30Giorni.filter((v) =>
    v.terminataIl === null &&
    adesso.getTime() - v.ultimaAttivitaIl.getTime() <= FINESTRA_ATTIVA_MS
  ).length;

  return (
    <main className="min-h-screen bg-[#070e1d] px-4 py-10 text-[#f5e8cb] sm:px-8">
      <div className="mx-auto max-w-7xl space-y-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#c9a45f]">PazziTournament / Amministrazione</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Monitoraggio accessi</h1>
            <p className="mt-3 text-sm text-[#9eacc3]">Visite QR e tempo attivo stimato, aggiornati a ogni caricamento.</p>
          </div>
          <Link href="/admin" className="rounded-full border border-[#c9a45f]/50 px-5 py-3 text-sm font-semibold text-[#e8d3a4] hover:bg-[#c9a45f]/10">← Torna al pannello admin</Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Riepilogo accessi">
          {[
            { titolo: "Visite totali", valore: String(riepilogo._count._all), dettaglio: "Dall'inizio del monitoraggio" },
            { titolo: "Tempo attivo totale", valore: durata(riepilogo._sum.secondiAttivi ?? 0), dettaglio: "Somma dei tempi registrati" },
            { titolo: "Visite negli ultimi 7 giorni", valore: String(visite7), dettaglio: `${visiteOggi} iniziate oggi · ${visite30} negli ultimi 30 giorni` },
            { titolo: "Sessioni attive stimate", valore: String(attiviStimati), dettaglio: "Segnale negli ultimi 60 secondi" },
          ].map((dato) => (
            <div key={dato.titolo} className="rounded-3xl border border-[#d9bb78]/20 bg-[#13223a] p-6 shadow-xl shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#a7b4c8]">{dato.titolo}</p>
              <p className="mt-4 break-words text-3xl font-black text-[#f0dba9]">{dato.valore}</p>
              <p className="mt-3 text-xs text-[#a7b4c8]">{dato.dettaglio}</p>
            </div>
          ))}
        </section>

        <AccessiEsterniAdmin />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Statistiche per partecipante</h2>
          {riepiloghi.length === 0 ? (
            <div className="rounded-2xl border border-[#d9bb78]/20 bg-[#13223a] p-6 text-[#a7b4c8]">Non sono ancora state registrate visite QR.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {riepiloghi.map((p) => (
                <article key={p.id} className="rounded-3xl border border-[#d9bb78]/20 bg-[#13223a] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold text-[#f5e8cb]">{p.nome}</h3>
                    <span className="rounded-full bg-[#c9a45f]/10 px-3 py-1 text-xs text-[#e7c784]">{p.visite} visite</span>
                  </div>
                  <p className="mt-5 text-3xl font-black text-[#e7c784]">{durata(p.secondi)}</p>
                  <p className="mt-1 text-xs text-[#a7b4c8]">Tempo attivo complessivo</p>
                  <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                    <div className="flex justify-between gap-3"><span className="text-[#a7b4c8]">Ultimi 7 giorni</span><strong>{p.recenti.filter((v) => v.iniziataIl >= setteGiorni).length} visite</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-[#a7b4c8]">Ultimi 30 giorni</span><strong>{p.recenti.length} visite</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-[#a7b4c8]">Tempo negli ultimi 30 giorni</span><strong>{durata(p.recenti.reduce((tot, v) => tot + v.secondiAttivi, 0))}</strong></div>
                    <p className="pt-2 text-xs text-[#a7b4c8]">Ultimo accesso: {p.ultimaVisita ? dataItalia(p.ultimaVisita) : "—"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#d9bb78]/20 bg-[#13223a]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-2xl font-bold">Storico delle visite</h2>
            <p className="mt-2 text-sm text-[#a7b4c8]">Le ultime {LIMITE_STORICO} visite al massimo, dalla più recente.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#0b172a] text-xs uppercase tracking-wider text-[#e4c581]">
                <tr>
                  <th className="px-5 py-4">Partecipante</th>
                  <th className="px-5 py-4">Inizio</th>
                  <th className="px-5 py-4">Ultima attività</th>
                  <th className="px-5 py-4">Fine registrata</th>
                  <th className="px-5 py-4">Tempo attivo</th>
                  <th className="px-5 py-4">Stato</th>
                </tr>
              </thead>
              <tbody>
                {visiteRecenti.map((visita) => {
                  const attiva = visita.terminataIl === null &&
                    adesso.getTime() - visita.ultimaAttivitaIl.getTime() <= FINESTRA_ATTIVA_MS;
                  return (
                    <tr key={visita.id} className="border-t border-white/10 text-[#e3e8f1]">
                      <td className="px-5 py-4 font-bold text-[#f0dba9]">{visita.partecipante.nome}</td>
                      <td className="px-5 py-4">{dataItalia(visita.iniziataIl)}</td>
                      <td className="px-5 py-4">{dataItalia(visita.ultimaAttivitaIl)}</td>
                      <td className="px-5 py-4">{visita.terminataIl ? dataItalia(visita.terminataIl) : "—"}</td>
                      <td className="px-5 py-4 font-semibold">{durata(visita.secondiAttivi)}</td>
                      <td className="px-5 py-4">
                        <span className={attiva ? "text-emerald-300" : "text-[#a7b4c8]"}>
                          {attiva ? "Attiva (stimata)" : visita.terminataIl ? "Terminata" : "Senza attività recente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {visiteRecenti.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-[#a7b4c8]">Nessun accesso registrato.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <p className="text-xs leading-6 text-[#a7b4c8]">
          I tempi indicano l'attività stimata registrata dal sistema, non il tempo esatto trascorso sul sito.
          La chiusura improvvisa del browser può non registrare immediatamente la fine della visita.
          Le statistiche a 7 e 30 giorni raggruppano le visite per data di inizio; una visita iniziata prima del periodo non viene ripartita tra giorni.
        </p>
      </div>
    </main>
  );
}
