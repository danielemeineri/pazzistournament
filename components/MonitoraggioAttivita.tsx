
"use client";

import { useEffect } from "react";

const INTERVALLO_MS = 15_000;
const INATTIVITA_MONITORAGGIO_MS = 60_000;
const INATTIVITA_LOGOUT_MS = 15 * 60 * 1000;

const CHIAVE_ATTIVITA = "pazzi_ultima_interazione_qr";
const CHIAVE_SESSIONE = "pazzi_sessione_qr";

export default function MonitoraggioAttivita() {
  useEffect(() => {
    let ultimaInterazione = Date.now();
    let richiestaInCorso = false;
    let logoutInCorso = false;

    // localStorage condivide l'attività tra più schede.
    // Non contiene il token QR o altri dati riservati.
    function leggiUltimaInterazione(): number {
      try {
        const valore = Number(
          localStorage.getItem(CHIAVE_ATTIVITA)
        );

        return Number.isFinite(valore) && valore > 0
          ? valore
          : ultimaInterazione;
      } catch {
        return ultimaInterazione;
      }
    }

    function registraInterazione() {
      ultimaInterazione = Date.now();

      try {
        localStorage.setItem(
          CHIAVE_ATTIVITA,
          String(ultimaInterazione)
        );
      } catch {
        // Il monitoraggio continua anche senza storage.
      }
    }

    async function eseguiLogout() {
      if (logoutInCorso) return;

      logoutInCorso = true;

      try {
        const response = await fetch("/api/qr/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "follow",
        });

        if (!response.ok) {
          logoutInCorso = false;
          return;
        }

        try {
          localStorage.removeItem(CHIAVE_ATTIVITA);
          sessionStorage.removeItem(CHIAVE_SESSIONE);
        } catch {
          // Ignoriamo eventuali limitazioni dello storage.
        }

        window.location.replace("/");
      } catch {
        logoutInCorso = false;
      }
    }

    async function inviaSegnale() {
      if (richiestaInCorso || logoutInCorso) return;

      const adesso = Date.now();
      const ultimaAttivita = Math.max(
        ultimaInterazione,
        leggiUltimaInterazione()
      );

      if (
        adesso - ultimaAttivita >=
        INATTIVITA_LOGOUT_MS
      ) {
        await eseguiLogout();
        return;
      }

      if (document.visibilityState !== "visible") return;

      if (
        adesso - ultimaInterazione >
        INATTIVITA_MONITORAGGIO_MS
      ) {
        return;
      }

      richiestaInCorso = true;

      try {
        const response = await fetch(
          "/api/visite/attivita",
          {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            body: "{}",
          }
        );

        if (response.status === 401) {
          await eseguiLogout();
        }
      } catch {
        // Un errore di rete non interrompe la navigazione.
      } finally {
        richiestaInCorso = false;
      }
    }

    function suVisibilita() {
      if (document.visibilityState === "visible") {
        // Prima verifichiamo la scadenza:
        // tornare sulla scheda non deve azzerarla.
        void inviaSegnale();
      }
    }

    function suInterazione() {
      const ultimaAttivita = Math.max(
        ultimaInterazione,
        leggiUltimaInterazione()
      );

      if (
        Date.now() - ultimaAttivita >=
        INATTIVITA_LOGOUT_MS
      ) {
        void eseguiLogout();
        return;
      }

      registraInterazione();
    }

    const eventi: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    for (const evento of eventi) {
      window.addEventListener(
        evento,
        suInterazione,
        { passive: true }
      );
    }

    document.addEventListener(
      "visibilitychange",
      suVisibilita
    );

    // Alla prima apertura inizializziamo il riferimento
    // temporale se non esiste.
    try {
      if (!localStorage.getItem(CHIAVE_ATTIVITA)) {
        registraInterazione();
      }

      sessionStorage.setItem(
        CHIAVE_SESSIONE,
        "attiva"
      );
    } catch {
      // Nessun dato sensibile viene memorizzato.
    }

    const intervallo = window.setInterval(
      () => void inviaSegnale(),
      INTERVALLO_MS
    );

    void inviaSegnale();

    return () => {
      window.clearInterval(intervallo);

      document.removeEventListener(
        "visibilitychange",
        suVisibilita
      );

      for (const evento of eventi) {
        window.removeEventListener(
          evento,
          suInterazione
        );
      }
    };
  }, []);

  return null;
}
