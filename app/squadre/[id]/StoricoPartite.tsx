"use client";

import { useState } from "react";

type Props = {
  tornei: {
    id: number;
    nome: string;
    anno: number;
    gioco: string;
    numeroPartite: number;
    partite: React.ReactNode;
  }[];
};

export default function StoricoPartite({ tornei }: Props) {
  const [aperti, setAperti] = useState<number[]>([]);

  function toggleTorneo(torneoId: number) {
    setAperti((correnti) =>
      correnti.includes(torneoId)
        ? correnti.filter((id) => id !== torneoId)
        : [...correnti, torneoId]
    );
  }

  if (tornei.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
        Nessuna partita registrata.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tornei.map((torneo) => {
        const aperto = aperti.includes(torneo.id);

        return (
          <div
            key={torneo.id}
            className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10"
          >
            <button
              type="button"
              onClick={() => toggleTorneo(torneo.id)}
              className="group flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-800/70 sm:p-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">🏆</span>

                  <h3 className="truncate text-lg font-black sm:text-xl">
                    {torneo.nome}
                  </h3>

                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                    {torneo.anno}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <span>🎮 {torneo.gioco}</span>

                  <span className="text-slate-700">•</span>

                  <span>
                    {torneo.numeroPartite}{" "}
                    {torneo.numeroPartite === 1
                      ? "partita"
                      : "partite"}
                  </span>
                </div>
              </div>

              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg transition ${
                  aperto
                    ? "rotate-180 bg-green-600 text-white"
                    : "text-slate-400 group-hover:text-white"
                }`}
              >
                ↓
              </span>
            </button>

            {aperto && (
              <div className="border-t border-slate-800 bg-slate-950/40 p-4 sm:p-6">
                <div className="space-y-4">
                  {torneo.partite}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}