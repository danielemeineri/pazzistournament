"use client";

import { useEffect } from "react";

export default function MonitoraggioEsterno() {
  useEffect(() => {
    let ultimaInterazione = Date.now();
    let inCorso = false;
    const interazione = () => { ultimaInterazione = Date.now(); };
    const eventi = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
    eventi.forEach((evento) => window.addEventListener(evento, interazione, { passive: true }));
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible" || Date.now() - ultimaInterazione > 60_000 || inCorso) return;
      inCorso = true;
      try { await fetch("/api/visite-esterne", { method: "POST", cache: "no-store", credentials: "same-origin" }); }
      catch { /* Nessuna interruzione della schermata in caso di rete assente. */ }
      finally { inCorso = false; }
    }, 15_000);
    return () => {
      window.clearInterval(timer);
      eventi.forEach((evento) => window.removeEventListener(evento, interazione));
    };
  }, []);
  return null;
}
