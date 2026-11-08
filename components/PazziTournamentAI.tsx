"use client";

import { FormEvent, useState } from "react";

type Messaggio = {
  id: number;
  ruolo: "utente" | "ai";
  testo: string;
};

type Partecipante = {
  id: number;
  nome: string;
};

type RispostaAPI = {
  risposta?: string;
  errore?: string;
  partecipante?: Partecipante;
};

const suggerimenti = [
  {
    emoji: "📊",
    testo: "Analizza le mie statistiche",
  },
  {
    emoji: "⚔️",
    testo: "Quali sono i miei punti di forza?",
  },
  {
    emoji: "🏆",
    testo: "Analizza la mia carriera",
  },
];

export default function PazziTournamentAI() {
  const [aperto, setAperto] = useState(false);
  const [domanda, setDomanda] = useState("");
  const [caricamento, setCaricamento] = useState(false);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);

  // Identità mantenuta per tutta la durata della chat.
  const [partecipanteAttivo, setPartecipanteAttivo] =
    useState<Partecipante | null>(null);

  async function inviaDomanda(testoPersonalizzato?: string) {
    const testo = (testoPersonalizzato ?? domanda).trim();

    if (!testo || caricamento) {
      return;
    }

    const nuovoMessaggio: Messaggio = {
      id: Date.now(),
      ruolo: "utente",
      testo,
    };

    setMessaggi((precedenti) => [
      ...precedenti,
      nuovoMessaggio,
    ]);

    setDomanda("");
    setCaricamento(true);

    try {
      const response = await fetch("/api/ia/partecipante", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domanda: testo,

          // Inviamo al server il partecipante riconosciuto
          // nelle domande precedenti della stessa chat.
          nomeIdentita: partecipanteAttivo?.nome ?? null,
        }),
      });

      let data: RispostaAPI;

      try {
        data = (await response.json()) as RispostaAPI;
      } catch {
        data = {
          errore:
            "Il server ha restituito una risposta non valida.",
        };
      }

      if (!response.ok) {
        throw new Error(
          data.errore ??
            "Si è verificato un errore durante l'analisi."
        );
      }

      if (!data.risposta) {
        throw new Error(
          "L'API non ha restituito una risposta."
        );
      }

      // Memorizziamo l'identità restituita dal server.
      // Il server ha già verificato il partecipante nel database.
      if (data.partecipante) {
        setPartecipanteAttivo(data.partecipante);
      }

      const risposta: Messaggio = {
        id: Date.now() + 1,
        ruolo: "ai",
        testo: data.risposta,
      };

      setMessaggi((precedenti) => [
        ...precedenti,
        risposta,
      ]);
    } catch (error) {
      console.error("Errore PazziTournament AI:", error);

      const messaggioErrore =
        error instanceof Error
          ? error.message
          : "Si è verificato un errore durante l'analisi.";

      const rispostaErrore: Messaggio = {
        id: Date.now() + 1,
        ruolo: "ai",
        testo: `⚠️ ${messaggioErrore}`,
      };

      setMessaggi((precedenti) => [
        ...precedenti,
        rispostaErrore,
      ]);
    } finally {
      setCaricamento(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void inviaDomanda();
  }

  function cliccaSuggerimento(testo: string) {
    setDomanda(testo);
    void inviaDomanda(testo);
  }

  return (
    <>
      {aperto && (
        <>
          {/* OVERLAY MOBILE */}
          <button
            type="button"
            aria-label="Chiudi PazziTournament AI"
            onClick={() => setAperto(false)}
            className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-[2px] sm:hidden"
          />

          <div className="fixed bottom-24 right-4 z-[9998] flex max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-green-500/20 bg-slate-950 shadow-2xl shadow-green-500/10 sm:right-6">
            {/* GLOW */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_70%)]" />

            {/* HEADER */}
            <div className="relative flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-green-400/30 bg-green-500/10 text-xl shadow-lg shadow-green-500/10">
                  <span>🤖</span>
                  <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-green-400" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    PazziTournament AI
                  </p>

                  <p className="text-xs font-medium text-green-400">
                    Assistente statistico
                  </p>

                  {partecipanteAttivo && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Partecipante: {partecipanteAttivo.nome}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAperto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>

            {/* CHAT */}
            <div className="relative flex-1 overflow-y-auto px-5 py-5">
              {messaggi.length === 0 && (
                <div className="rounded-2xl border border-green-500/10 bg-slate-900/80 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-sm">
                      🤖
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">
                        Ciao! 👋
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Sono l'assistente di PazziTournament.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Posso aiutarti ad analizzare giocatori,
                        squadre, tornei e statistiche.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {messaggi.length > 0 && (
                <div className="space-y-4">
                  {messaggi.map((messaggio) => (
                    <div
                      key={messaggio.id}
                      className={`flex ${
                        messaggio.ruolo === "utente"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${
                          messaggio.ruolo === "utente"
                            ? "rounded-br-md bg-green-500 font-medium text-slate-950"
                            : "rounded-bl-md border border-slate-800 bg-slate-900 text-slate-300"
                        }`}
                      >
                        {messaggio.testo}
                      </div>
                    </div>
                  ))}

                  {caricamento && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-slate-800 bg-slate-900 px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-green-400 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-green-400 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-green-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {messaggi.length === 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    Analisi rapide
                  </p>

                  <div className="space-y-2">
                    {suggerimenti.map((suggerimento) => (
                      <button
                        key={suggerimento.testo}
                        type="button"
                        disabled={caricamento}
                        onClick={() =>
                          cliccaSuggerimento(suggerimento.testo)
                        }
                        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition hover:border-green-500/30 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-base transition group-hover:bg-green-500/10">
                          {suggerimento.emoji}
                        </span>

                        <span className="text-sm font-semibold text-slate-300 transition group-hover:text-white">
                          {suggerimento.testo}
                        </span>

                        <span className="ml-auto text-slate-700 transition group-hover:translate-x-1 group-hover:text-green-400">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* INPUT */}
            <div className="relative shrink-0 border-t border-slate-800 bg-slate-950 p-4">
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={domanda}
                    onChange={(event) =>
                      setDomanda(event.target.value)
                    }
                    disabled={caricamento}
                    placeholder="Scrivi una domanda..."
                    className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-green-500/50 focus:ring-2 focus:ring-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!domanda.trim() || caricamento}
                  aria-label="Invia domanda"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500 text-xl font-black text-slate-950 shadow-lg shadow-green-500/20 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ➤
                </button>
              </form>

              <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-700">
                Analisi statistica gratuita
              </p>
            </div>
          </div>
        </>
      )}

      {/* PULSANTE FLOTTANTE */}
      <button
        type="button"
        onClick={() => setAperto((value) => !value)}
        aria-label="Apri PazziTournament AI"
        aria-expanded={aperto}
        className="group fixed bottom-6 right-6 z-[9999] flex h-16 w-16 items-center justify-center rounded-full border border-green-300/30 bg-green-500 text-white shadow-2xl shadow-green-500/30 transition-all duration-300 hover:scale-110 hover:bg-green-400 hover:shadow-green-400/40 focus:outline-none focus:ring-4 focus:ring-green-500/20 active:scale-95"
      >
        <span className="absolute inset-0 animate-pulse rounded-full bg-green-400 opacity-30 blur-xl transition-opacity duration-300 group-hover:opacity-60" />

        <span className="absolute inset-1 rounded-full border border-white/20" />

        <span className="relative flex flex-col items-center justify-center">
          <span className="text-2xl leading-none">🤖</span>
          <span className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-white/90">
            AI
          </span>
        </span>

        {!aperto && (
          <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-300 shadow-lg shadow-emerald-300/50" />
        )}
      </button>
    </>
  );
}