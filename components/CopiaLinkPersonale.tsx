
"use client";

import { useState } from "react";

type Props = {
  url: string;
};

export default function CopiaLinkPersonale({ url }: Props) {
  const [copiato, setCopiato] = useState(false);
  const [errore, setErrore] = useState(false);

  async function copiaLink() {
    try {
      await navigator.clipboard.writeText(url);

      setCopiato(true);
      setErrore(false);
    } catch {
      setCopiato(false);
      setErrore(true);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={copiaLink}
        className={`w-full rounded-xl px-5 py-3 font-bold transition ${
          copiato
            ? "bg-emerald-500 text-slate-950"
            : "bg-amber-300 text-slate-950 hover:bg-amber-200"
        }`}
      >
        {copiato ? "✓ Link copiato!" : "🔗 Copia link personale"}
      </button>

      {errore && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          Impossibile copiare il link. Controlla i permessi del browser.
        </p>
      )}
    </div>
  );
}
