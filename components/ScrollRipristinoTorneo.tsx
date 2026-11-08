"use client";

import { useEffect } from "react";

export default function ScrollRipristinoTorneo() {
  useEffect(() => {
    const chiaveScroll = "pazziTournamentScroll";

    // =========================================================
    // RIPRISTINO DELLA POSIZIONE
    // =========================================================

    const posizioneSalvata = sessionStorage.getItem(chiaveScroll);

    if (posizioneSalvata) {
      const posizione = Number(posizioneSalvata);

      if (Number.isFinite(posizione)) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: posizione,
              behavior: "instant",
            });

            sessionStorage.removeItem(chiaveScroll);
          });
        });
      } else {
        sessionStorage.removeItem(chiaveScroll);
      }
    }

    // =========================================================
    // SALVATAGGIO DELLA POSIZIONE
    // =========================================================

    const salvaPosizione = () => {
      sessionStorage.setItem(
        chiaveScroll,
        String(window.scrollY)
      );
    };

    // Salviamo la posizione mentre l'utente scorre.
    window.addEventListener("scroll", salvaPosizione, {
      passive: true,
    });

    // Salviamo anche quando la pagina sta per essere
    // abbandonata/nascosta.
    window.addEventListener(
      "pagehide",
      salvaPosizione
    );

    return () => {
      window.removeEventListener(
        "scroll",
        salvaPosizione
      );

      window.removeEventListener(
        "pagehide",
        salvaPosizione
      );
    };
  }, []);

  return null;
}