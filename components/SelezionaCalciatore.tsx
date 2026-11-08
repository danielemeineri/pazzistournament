
"use client";

import { useMemo, useState } from "react";

type Calciatore = {
  id: number;
  nome: string;
};

type Props = {
  calciatori: Calciatore[];
  calciatoriGiaPresenti: number[];
};

function normalizza(testo: string) {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .trim();
}

export default function SelezionaCalciatore({
  calciatori,
  calciatoriGiaPresenti,
}: Props) {
  const [ricerca, setRicerca] = useState("");
  const [calciatoreSelezionato, setCalciatoreSelezionato] =
    useState<Calciatore | null>(null);

  const presenti = useMemo(
    () => new Set(calciatoriGiaPresenti),
    [calciatoriGiaPresenti]
  );

  const risultati = useMemo(() => {
    const testo = normalizza(ricerca);

    if (!testo) {
      return [];
    }

    return calciatori
      .filter((calciatore) =>
        normalizza(calciatore.nome).includes(testo)
      )
      .sort((a, b) => {
        const aPresente = presenti.has(a.id);
        const bPresente = presenti.has(b.id);

        if (aPresente !== bPresente) {
          return aPresente ? 1 : -1;
        }

        return a.nome.localeCompare(b.nome, "it");
      })
      .slice(0, 8);
  }, [calciatori, ricerca, presenti]);

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="calciatoreId"
        value={calciatoreSelezionato?.id ?? ""}
      />

      <label className="block text-sm font-semibold">
        Cerca un calciatore esistente
      </label>

      <input
        type="text"
        value={ricerca}
        onChange={(event) => {
          setRicerca(event.target.value);
          setCalciatoreSelezionato(null);
        }}
        placeholder="🔎 Digita il nome del calciatore..."
        autoComplete="off"
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
      />

      {calciatoreSelezionato ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-700/60 bg-green-950/40 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-400">
              CALCIATORE SELEZIONATO
            </p>
            <p className="mt-1 truncate font-bold">
              ⚽ {calciatoreSelezionato.nome}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCalciatoreSelezionato(null);
              setRicerca("");
            }}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Cambia
          </button>
        </div>
      ) : ricerca.trim() !== "" ? (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          {risultati.length > 0 ? (
            risultati.map((calciatore) => {
              const giaPresente = presenti.has(calciatore.id);

              return (
                <button
                  key={calciatore.id}
                  type="button"
                  disabled={giaPresente}
                  onClick={() => {
                    setCalciatoreSelezionato(calciatore);
                    setRicerca(calciatore.nome);
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-left last:border-b-0 ${
                    giaPresente
                      ? "cursor-not-allowed text-slate-600"
                      : "text-white transition hover:bg-green-950/60"
                  }`}
                >
                  <span className="min-w-0 truncate font-medium">
                    ⚽ {calciatore.nome}
                  </span>

                  <span className="shrink-0 text-xs">
                    {giaPresente ? "✓ Già in rosa" : "Seleziona →"}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-slate-400">
              Nessun calciatore trovato. Puoi provare un altro nome
              oppure crearne uno nuovo qui sotto.
            </p>
          )}

          {risultati.length === 8 && (
            <p className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
              Mostrati i primi 8 risultati. Continua a digitare per
              restringere la ricerca.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Scrivi almeno una parte del nome per visualizzare i risultati.
        </p>
      )}
    </div>
  );
}
