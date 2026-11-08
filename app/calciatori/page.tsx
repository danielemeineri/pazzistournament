import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { unisciCalciatori } from "./actions";
import ListaCalciatori from "@/components/ListaCalciatori";

export default async function CalciatoriPage() {
  const [calciatori, admin] = await Promise.all([
    prisma.calciatore.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    isAdmin(),
  ]);

  const iniziali = new Set(calciatori.map((c) => c.nome.trim().charAt(0).toUpperCase()).filter(Boolean)).size;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050a16] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[35rem] w-[35rem] rounded-full bg-blue-600/10 blur-[110px]" />
        <div className="absolute -right-40 top-[28rem] h-[38rem] w-[38rem] rounded-full bg-amber-400/[0.07] blur-[120px]" />
      </div>

      <header className="relative isolate overflow-hidden border-b border-white/10">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(56,116,224,0.20),transparent_45%),linear-gradient(135deg,#0d1b37_0%,#050a16_72%)]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:pb-20">
          <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-300 transition hover:text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 transition group-hover:border-amber-300/50 group-hover:bg-amber-300/10">←</span>
              Torna alla home
            </Link>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-200">PazziTournament · Archivio ufficiale</span>
          </nav>

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
                <span className="h-px w-10 bg-amber-300" /> Hall of players
              </div>
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.93] tracking-[-0.055em] sm:text-7xl lg:text-[6.5rem]">
                I protagonisti<br />
                <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">della storia.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Ogni nome, una carriera. Esplora l&apos;archivio dei calciatori che hanno scritto la storia dei nostri tornei.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#archivio-calciatori" className="inline-flex items-center gap-3 rounded-xl bg-amber-300 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(251,191,36,0.16)] transition duration-300 hover:-translate-y-1 hover:bg-yellow-200">Esplora i calciatori <span aria-hidden="true">↗</span></a>
                {admin && calciatori.length >= 2 && <a href="#gestione-calciatori" className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/35 hover:bg-white/10">Gestione archivio <span aria-hidden="true">↓</span></a>}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-[#182844] via-[#0c1830] to-[#080f20] p-7 shadow-2xl shadow-black/40">
              <div aria-hidden="true" className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[28px] border-amber-300/[0.06]" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Archivio storico</p>
              <p className="mt-6 text-6xl font-black tabular-nums tracking-tight text-white sm:text-7xl">{calciatori.length.toLocaleString("it-IT")}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Calciatori registrati</p>
              <div className="my-7 h-px bg-gradient-to-r from-amber-300/40 to-transparent" />
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-3xl font-black text-amber-200">{iniziali}</p><p className="mt-1 text-xs text-slate-400">Iniziali rappresentate</p></div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-3xl">⚽</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl space-y-14 px-5 py-12 sm:px-8 sm:py-16">
        <section id="archivio-calciatori" className="scroll-mt-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3 flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-amber-300"><span className="h-px w-7 bg-amber-300" /> Database giocatori</p>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Tutti i <span className="text-amber-300">calciatori</span></h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Cerca un nome e apri la sua scheda per ripercorrerne le statistiche e le presenze nei tornei.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">{calciatori.length.toLocaleString("it-IT")} profili</div>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0c1528]/95 p-4 shadow-2xl shadow-black/25 sm:p-7">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
            <ListaCalciatori calciatori={calciatori} />
          </div>
        </section>

        {admin && calciatori.length >= 2 && (
          <section id="gestione-calciatori" className="scroll-mt-8 overflow-hidden rounded-[1.75rem] border border-amber-300/20 bg-[#0c1528]/95 shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 bg-gradient-to-r from-amber-300/[0.08] to-transparent p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Area amministratore</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Unisci calciatori duplicati</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Se lo stesso giocatore è stato registrato più volte con nomi differenti, puoi unire le sue schede. I dati storici collegati verranno trasferiti alla scheda principale.</p>
            </div>
            <form action={unisciCalciatori} className="grid gap-5 p-6 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end sm:p-8">
              <div>
                <label htmlFor="calciatorePrincipaleId" className="mb-3 block text-sm font-bold text-slate-200">Calciatore principale</label>
                <select id="calciatorePrincipaleId" name="calciatorePrincipaleId" required defaultValue="" className="w-full min-w-0 rounded-xl border border-white/15 bg-[#071022] px-4 py-3.5 text-white outline-none transition focus:border-amber-300">
                  <option value="">Seleziona il principale</option>
                  {calciatori.map((calciatore) => <option key={calciatore.id} value={calciatore.id}>{calciatore.nome}</option>)}
                </select>
                <p className="mt-2 text-xs text-slate-400">Questa scheda rimarrà nell&apos;archivio.</p>
              </div>
              <span aria-hidden="true" className="hidden pb-8 text-2xl font-black text-amber-300 lg:block">→</span>
              <div>
                <label htmlFor="calciatoreDuplicatoId" className="mb-3 block text-sm font-bold text-slate-200">Calciatore duplicato</label>
                <select id="calciatoreDuplicatoId" name="calciatoreDuplicatoId" required defaultValue="" className="w-full min-w-0 rounded-xl border border-white/15 bg-[#071022] px-4 py-3.5 text-white outline-none transition focus:border-red-400">
                  <option value="">Seleziona il duplicato</option>
                  {calciatori.map((calciatore) => <option key={calciatore.id} value={calciatore.id}>{calciatore.nome}</option>)}
                </select>
                <p className="mt-2 text-xs text-slate-400">Questa scheda verrà eliminata dopo l&apos;unione.</p>
              </div>
              <button type="submit" className="rounded-xl bg-amber-300 px-6 py-3.5 font-black text-slate-950 transition duration-300 hover:-translate-y-0.5 hover:bg-yellow-200">Unisci schede</button>
            </form>
            <div className="border-t border-white/10 bg-amber-300/[0.04] px-6 py-5 text-xs leading-6 text-amber-100/75 sm:px-8"><strong>Attenzione:</strong> l&apos;operazione è definitiva. La scheda duplicata verrà eliminata. Verifica attentamente i due calciatori selezionati.</div>
          </section>
        )}

        <div className="flex justify-center border-t border-white/10 pt-8">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-slate-300 transition hover:border-amber-300/40 hover:text-white"><span>←</span> Torna alla home</Link>
        </div>
      </div>
    </main>
  );
}
