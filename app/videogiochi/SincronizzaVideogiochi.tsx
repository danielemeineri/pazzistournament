"use client";

import { useState } from "react";
import { sincronizzaVideogiochiTornei } from "./actions";

export default function SincronizzaVideogiochi() {
  const [caricamento, setCaricamento] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  async function sincronizza() {
    try {
      setCaricamento(true);
      setMessaggio("");

      const risultato = await sincronizzaVideogiochiTornei();

      setMessaggio(
        `✅ ${risultato.collegati} tornei collegati. ` +
        `${risultato.videogiochiCreati} videogiochi creati.`
      );
    } catch (errore) {
      console.error(errore);

      setMessaggio(
        "❌ Errore durante la sincronizzazione."
      );
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div className="mt-6">

      <button
        type="button"
        onClick={sincronizza}
        disabled={caricamento}
        className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 font-bold text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {caricamento
          ? "⏳ Sincronizzazione..."
          : "🔄 Sincronizza tornei"}
      </button>

      {messaggio && (
        <p className="mt-3 text-sm text-slate-400">
          {messaggio}
        </p>
      )}

    </div>
  );
}