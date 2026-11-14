"use client";

import { useEffect } from "react";

const INTERVALLO_MS = 15_000;
const INATTIVITA_MS = 60_000;

export default function MonitoraggioAttivita() {
  useEffect(() => {
    let ultimaInterazione = Date.now();
    let richiestaInCorso = false;

    function registraInterazione() {
      ultimaInterazione = Date.now();
    }

    async function inviaSegnale() {
      if (richiestaInCorso || document.visibilityState !== "visible") return;
      if (Date.now() - ultimaInterazione > INATTIVITA_MS) return;

      richiestaInCorso = true;
      try {
        await fetch("/api/visite/attivita", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
      } catch {
        // La navigazione non deve interrompersi se il monitoraggio non risponde.
      } finally {
        richiestaInCorso = false;
      }
    }

    const eventi: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    for (const evento of eventi) {
      window.addEventListener(evento, registraInterazione, { passive: true });
    }

    function suVisibilita() {
      if (document.visibilityState === "visible") {
        registraInterazione();
        void inviaSegnale();
      }
    }

    document.addEventListener("visibilitychange", suVisibilita);
    const intervallo = window.setInterval(() => void inviaSegnale(), INTERVALLO_MS);
    void inviaSegnale();

    return () => {
      window.clearInterval(intervallo);
      document.removeEventListener("visibilitychange", suVisibilita);
      for (const evento of eventi) {
        window.removeEventListener(evento, registraInterazione);
      }
    };
  }, []);

  return null;
}
