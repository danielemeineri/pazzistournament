"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

type AllenatoreConteggio = {
  id: number;
  nome: string;
  partecipazioni: number;
};

type PaeseAtlante = {
  codice: string;
  nome: string;
  continente: string;
  allenatori: AllenatoreConteggio[];
  leaders: AllenatoreConteggio[];
  totale: number;
};

type Props = {
  paesi: PaeseAtlante[];
};

const Mappamondo3D = dynamic(
  () => import("@/components/Mappamondo3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[450px] items-center justify-center rounded-2xl bg-slate-950">
        <div className="text-center">
          <div className="animate-spin text-5xl">🌍</div>
          <p className="mt-4 text-sm text-slate-400">
            Preparazione del mappamondo...
          </p>
        </div>
      </div>
    ),
  }
);

export default function AtlanteSquadre({ paesi }: Props) {
  const [aperto, setAperto] = useState(false);

  return (
    <section className="mb-10 overflow-hidden rounded-3xl border border-cyan-900/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-2xl shadow-cyan-950/20">
      <button
        type="button"
        onClick={() => setAperto((valore) => !valore)}
        aria-expanded={aperto}
        className="group flex w-full flex-col gap-5 p-6 text-left transition hover:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-4xl shadow-lg shadow-cyan-500/10 transition group-hover:scale-110">
            🌍
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
              PazziTournament · Storia mondiale
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Atlante delle nazionali
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Scopri quali allenatori hanno guidato più spesso
              le nazionali nei nostri tornei.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
          <span className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition group-hover:bg-cyan-400/20">
            {aperto ? "Chiudi atlante" : "Esplora il mondo"}
          </span>

          <span
            className={`text-2xl text-cyan-400 transition-transform duration-300 ${
              aperto ? "rotate-180" : ""
            }`}
          >
            ↓
          </span>
        </div>
      </button>

      {aperto && (
        <div className="border-t border-slate-800 p-3 sm:p-6">
          <Mappamondo3D paesi={paesi} />
        </div>
      )}
    </section>
  );
}