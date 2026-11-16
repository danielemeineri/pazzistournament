import Link from "next/link";
import MonitoraggioEsterno from "@/components/MonitoraggioEsterno";

export const dynamic = "force-dynamic";

export default function AccessoRiservato() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200/20 bg-slate-900 p-8 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">PazziTournament</p>
        <h1 className="mt-5 text-3xl font-black">Accesso riservato</h1>
        <p className="mt-5 leading-7 text-slate-300">Per entrare usa il tuo link personale oppure scansiona il tuo codice QR. Se la sessione è scaduta, apri nuovamente il link o il QR.</p>
        <Link href="/login" className="mt-7 inline-block rounded-xl bg-amber-200 px-6 py-3 font-bold text-slate-950 hover:bg-amber-100">Accesso amministratore</Link>
        <p className="mt-7 text-xs leading-5 text-slate-400">Registriamo i tentativi di accesso, un identificativo del browser e dati tecnici essenziali. Nome ed email non vengono rilevati automaticamente.</p>
      </div>
      <MonitoraggioEsterno />
    </main>
  );
}
