"use client";

import { useEffect } from "react";

export default function ScrollRipristinoTorneo() {
  useEffect(() => {
    const posizioneSalvata = sessionStorage.getItem(
      "pazziTournamentScroll"
    );

    if (!posizioneSalvata) {
      return;
    }

    const posizione = Number(posizioneSalvata);

    if (!Number.isFinite(posizione)) {
      sessionStorage.removeItem("pazziTournamentScroll");
      return;
    }

    // Evita che il browser gestisca autonomamente
    // il ripristino dello scroll durante la navigazione.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    let tentativi = 0;
    const massimoTentativi = 20;

    const ripristinaScroll = () => {
      window.scrollTo(0, posizione);

      tentativi++;

      if (tentativi < massimoTentativi) {
        requestAnimationFrame(ripristinaScroll);
      } else {
        sessionStorage.removeItem("pazziTournamentScroll");
      }
    };

    requestAnimationFrame(ripristinaScroll);

    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  return null;
}