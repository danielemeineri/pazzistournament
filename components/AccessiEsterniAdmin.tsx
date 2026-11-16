import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function data(value: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }).format(value);
}
function tempo(value: number) {
  return `${Math.floor(value / 60)} min ${value % 60} s`;
}

export default async function AccessiEsterniAdmin() {
  await requireAdmin();
  const [totale, recenti] = await Promise.all([
    prisma.visitaEsterna.aggregate({ _count: { _all: true }, _sum: { richieste: true, secondiAttivi: true } }),
    prisma.visitaEsterna.findMany({ orderBy: [{ iniziataIl: "desc" }, { id: "desc" }], take: 100 }),
  ]);
  return (
    <section className="overflow-hidden rounded-3xl border border-amber-300/30 bg-[#13223a]">
      <div className="space-y-3 border-b border-white/10 p-6">
        <h2 className="text-2xl font-bold text-amber-100">Visitatori esterni anonimi</h2>
        <p className="text-sm text-slate-300">{totale._count._all} visite · {totale._sum.richieste ?? 0} richieste di pagine · {tempo(totale._sum.secondiAttivi ?? 0)} di attività stimata sulla schermata riservata</p>
        <p className="text-xs leading-6 text-slate-400">Ultime 100 visite. Lo stesso identificativo indica lo stesso browser finché conserva il cookie (fino a 30 giorni), non una persona verificata. Una nuova visita inizia dopo 15 minuti senza segnali. Sono comprese le aperture del login e della schermata riservata; i reindirizzamenti possono generare più richieste. Nessun nome, email o indirizzo IP viene rilevato.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-[#0b172a] text-amber-200"><tr>
            {["Visitatore", "Inizio", "Ultimo segnale", "Dispositivo dichiarato", "Prima pagina richiesta", "Ultima pagina richiesta", "Tempo attivo"].map((titolo) => <th key={titolo} className="px-5 py-4">{titolo}</th>)}
          </tr></thead>
          <tbody>
            {recenti.map((visita) => (
              <tr key={visita.id} className="border-t border-white/10 text-slate-200">
                <td className="px-5 py-4 font-bold" title={visita.visitatoreId}>Anonimo {visita.visitatoreId.slice(0, 8)}</td>
                <td className="px-5 py-4">{data(visita.iniziataIl)}</td>
                <td className="px-5 py-4">{data(visita.ultimaAttivitaIl)}</td>
                <td className="px-5 py-4">{visita.dispositivo}</td>
                <td className="max-w-xs break-all px-5 py-4">{visita.primoPercorso}</td>
                <td className="max-w-xs break-all px-5 py-4">{visita.ultimoPercorso}</td>
                <td className="px-5 py-4">{tempo(visita.secondiAttivi)}</td>
              </tr>
            ))}
            {recenti.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Nessuna visita esterna registrata.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
