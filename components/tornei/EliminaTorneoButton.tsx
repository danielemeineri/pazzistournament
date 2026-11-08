
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminaTorneo } from "@/app/tornei/actions";

type Props = {
  torneoId: number;
  nome: string;
};

export default function EliminaTorneoButton({
  torneoId,
  nome,
}: Props) {
  const router = useRouter();

  const [inAttesa, startTransition] = useTransition();
  const [errore, setErrore] = useState("");
  const [messaggio, setMessaggio] = useState("");

  function gestisciEliminazione() {
    const conferma = window.confirm(
      `ATTENZIONE!\n\nVuoi eliminare definitivamente il torneo "${nome}"?\n\nVerranno eliminate anche tutte le partite, i risultati, i gironi, le partecipazioni, i trofei e le foto associate.\n\nQuesta operazione non può essere annullata.`
    );

    if (!conferma) return;

    setErrore("");
    setMessaggio("");

    startTransition(async () => {
      try {
        const risultato = await eliminaTorneo(torneoId);

        if (!risultato.success) {
          setErrore(risultato.error);
          return;
        }

        setMessaggio(risultato.message);

        router.refresh();
      } catch {
        setErrore(
          "Errore imprevisto durante l'eliminazione del torneo."
        );
      }
    });
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={gestisciEliminazione}
        disabled={inAttesa}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>🗑️</span>

        {inAttesa
          ? "Eliminazione in corso..."
          : "Elimina torneo"}
      </button>

      {errore && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {errore}
        </p>
      )}

      {messaggio && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"
        >
          {messaggio}
        </p>
      )}
    </div>
  );
}
