
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Calciatore = {
  id: number;
  nome: string;
};

type Props = {
  calciatori: Calciatore[];
};

function normalizzaTesto(testo: string) {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .trim();
}

export default function ListaCalciatori({ calciatori }: Props) {
  const [ricerca, setRicerca] = useState("");

  const calciatoriFiltrati = useMemo(() => {
    const termine = normalizzaTesto(ricerca);

    if (!termine) {
      return calciatori;
    }

    return calciatori.filter((calciatore) =>
      normalizzaTesto(calciatore.nome).includes(termine)
    );
  }, [calciatori, ricerca]);

  return (
    <section>
      {/* BARRA DI RICERCA */}
      <div className="mb-8">
        <label
          htmlFor="ricerca-calciatori"
          className="mb-3 block text-sm font-bold uppercase tracking-wider text-slate-400"
        >
          Cerca un calciatore
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xl">
            🔎
          </span>

          <input
            id="ricerca-calciatori"
            type="search"
            autoComplete="off"
            placeholder="Scrivi un nome, ad esempio Dumfries..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />

          {ricerca && (
            <button
              type="button"
              onClick={() => setRicerca("")}
              aria-label="Cancella ricerca"
              className="absolute inset-y-0 right-4 text-xl text-slate-400 transition hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-500" aria-live="polite">
          {ricerca.trim()
            ? `${calciatoriFiltrati.length} ${
                calciatoriFiltrati.length === 1
                  ? "calciatore trovato"
                  : "calciatori trovati"
              }`
            : "Inizia a scrivere per trovare rapidamente un calciatore."}
        </p>

        {/* SUGGERIMENTI E RISULTATI */}
        {ricerca.trim() && calciatoriFiltrati.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
            {calciatoriFiltrati.slice(0, 8).map((calciatore) => (
              <Link
                key={calciatore.id}
                href={`/calciatori/${calciatore.id}`}
                className="flex items-center gap-4 border-b border-slate-800 px-5 py-4 transition last:border-b-0 hover:bg-slate-800"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl">
                  👤
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">
                    {calciatore.nome}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Visualizza statistiche e carriera
                  </p>
                </div>

                <span className="text-lg text-green-400">→</span>
              </Link>
            ))}

            {calciatoriFiltrati.length > 8 && (
              <p className="px-5 py-3 text-center text-sm text-slate-400">
                Altri {calciatoriFiltrati.length - 8} risultati
                disponibili nell'elenco sottostante.
              </p>
            )}
          </div>
        )}

        {ricerca.trim() && calciatoriFiltrati.length === 0 && (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">
              Nessun calciatore trovato
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Prova a controllare il nome o a scrivere una parte diversa.
            </p>
          </div>
        )}
      </div>

      {/* ELENCO COMPLETO O FILTRATO */}
      {calciatori.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
          <div className="mb-4 text-5xl">👤</div>

          <h3 className="text-2xl font-bold">
            Nessun calciatore presente
          </h3>

          <p className="mt-3 text-slate-500">
            I calciatori compariranno qui quando verranno registrati nel
            database.
          </p>
        </div>
      ) : calciatoriFiltrati.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">
            Modifica la ricerca per visualizzare altri calciatori.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {calciatoriFiltrati.map((calciatore) => (
            <Link
              key={calciatore.id}
              href={`/calciatori/${calciatore.id}`}
              className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-slate-800"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-green-400 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl transition group-hover:bg-blue-500/10">
                👤
              </div>

              <h3 className="mt-6 text-xl font-black transition group-hover:text-blue-400">
                {calciatore.nome}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Visualizza statistiche e carriera
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-sm font-semibold text-slate-400">
                  Scheda giocatore
                </span>

                <span className="text-lg text-green-400 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
