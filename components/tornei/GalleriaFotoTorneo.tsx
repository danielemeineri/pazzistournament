
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  caricaFotoTorneo,
  eliminaFotoTorneo,
} from "@/app/tornei/[id]/foto/actions";

type FotoGalleria = {
  id: number;
  url: string;
  didascalia: string | null;
  creatoIl: string;
};

type Props = {
  torneoId: number;
  admin: boolean;
  foto: FotoGalleria[];
};

export default function GalleriaFotoTorneo({
  torneoId,
  admin,
  foto,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [didascalia, setDidascalia] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [errore, setErrore] = useState("");
  const [inAttesa, startTransition] = useTransition();

  function gestisciUpload(formData: FormData) {
    setMessaggio("");
    setErrore("");

    startTransition(async () => {
      try {
        const risultato = await caricaFotoTorneo(formData);

        if (!risultato.success) {
          setErrore(risultato.error);
          return;
        }

        setMessaggio(risultato.message);
        setDidascalia("");
        formRef.current?.reset();
        router.refresh();
      } catch {
        setErrore("Errore durante il caricamento della foto.");
      }
    });
  }

  function gestisciEliminazione(fotoId: number) {
    const conferma = window.confirm(
      "Vuoi eliminare definitivamente questa foto?"
    );

    if (!conferma) return;

    setMessaggio("");
    setErrore("");

    startTransition(async () => {
      try {
        const risultato = await eliminaFotoTorneo(torneoId, fotoId);

        if (!risultato.success) {
          setErrore(risultato.error);
          return;
        }

        setMessaggio(risultato.message);
        router.refresh();
      } catch {
        setErrore("Errore durante l'eliminazione della foto.");
      }
    });
  }

  return (
    <section
      id="galleria-fotografica"
      className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg sm:p-7"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Archivio fotografico
          </p>

          <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
            📸 Galleria del torneo
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {foto.length === 1
              ? "1 foto"
              : `${foto.length} foto`}
          </p>
        </div>
      </div>

      {admin && (
        <form
          ref={formRef}
          action={gestisciUpload}
          className="mb-7 rounded-xl border border-dashed border-cyan-500/40 bg-slate-950/70 p-4"
        >
          <input type="hidden" name="torneoId" value={torneoId} />

          <h3 className="mb-3 text-lg font-bold text-white">
            Aggiungi una foto
          </h3>

          <label
            htmlFor={`foto-${torneoId}`}
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Seleziona un'immagine (JPG, PNG, WEBP o GIF; massimo 5 MB)
          </label>

          <input
            id={`foto-${torneoId}`}
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            disabled={inAttesa}
            className="block w-full cursor-pointer rounded-lg border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:file:bg-cyan-400 disabled:opacity-50"
          />

          <label
            htmlFor={`didascalia-${torneoId}`}
            className="mb-2 mt-4 block text-sm font-medium text-slate-300"
          >
            Didascalia (facoltativa)
          </label>

          <input
            id={`didascalia-${torneoId}`}
            name="didascalia"
            type="text"
            maxLength={200}
            value={didascalia}
            onChange={(event) => setDidascalia(event.target.value)}
            placeholder="Es. Finale del torneo, ottobre 2026"
            disabled={inAttesa}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={inAttesa}
            className="mt-4 rounded-lg bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inAttesa ? "Operazione in corso..." : "Carica foto"}
          </button>
        </form>
      )}

      {messaggio && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
        >
          {messaggio}
        </p>
      )}

      {errore && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {errore}
        </p>
      )}

      {foto.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-slate-950/40 px-5 py-10 text-center">
          <p className="text-4xl">📷</p>
          <p className="mt-3 font-semibold text-white">
            Nessuna foto ancora
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {admin
              ? "Carica la prima foto per iniziare l'archivio del torneo."
              : "Le foto di questo torneo appariranno qui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {foto.map((elemento) => (
            <article
              key={elemento.id}
              className="group overflow-hidden rounded-xl border border-white/10 bg-slate-950/70"
            >
              <a
                href={elemento.url}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  elemento.didascalia
                    ? `Apri foto: ${elemento.didascalia}`
                    : "Apri foto a dimensione originale"
                }
                className="block overflow-hidden bg-slate-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={elemento.url}
                  alt={elemento.didascalia || "Foto del torneo"}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              </a>

              <div className="p-4">
                <p className="break-words text-sm text-slate-200">
                  {elemento.didascalia || "Foto del torneo"}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {new Date(elemento.creatoIl).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>

                {admin && (
                  <button
                    type="button"
                    onClick={() => gestisciEliminazione(elemento.id)}
                    disabled={inAttesa}
                    className="mt-4 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Elimina foto
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
