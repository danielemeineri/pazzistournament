
import {
  getPazziInsightsPartita,
  type PazziInsight,
} from "@/lib/insights/partita";

// =========================================================
// PAZZITOURNAMENT — PAZZI INSIGHTS
// COMPONENTE GRAFICO PARTITA
// =========================================================
//
// Componente server:
// - Recupera gli Insights dal motore Prisma
// - Mostra soltanto informazioni reali
// - Non modifica alcun dato
// - Non richiede librerie aggiuntive
//
// =========================================================

type Props = {
  partitaId: bigint | string;
};

type StileInsight = {
  etichetta: string;
  icona: string;
  colore: string;
  bordo: string;
  sfondo: string;
  luce: string;
};

function getStileInsight(
  insight: PazziInsight
): StileInsight {
  switch (insight.tipo) {
    case "TRAGUARDO":
      return {
        etichetta: "Traguardo storico",
        icona: "✦",
        colore: "text-amber-300",
        bordo: "border-amber-400/30",
        sfondo:
          "from-amber-500/15 via-slate-950 to-slate-950",
        luce: "bg-amber-400/20",
      };

    case "STORIA":
      return {
        etichetta: "La storia si scrive",
        icona: "◈",
        colore: "text-cyan-300",
        bordo: "border-cyan-400/30",
        sfondo:
          "from-cyan-500/15 via-slate-950 to-slate-950",
        luce: "bg-cyan-400/20",
      };

    case "CURIOSITA":
    default:
      return {
        etichetta: "Lo sapevi?",
        icona: "✧",
        colore: "text-violet-300",
        bordo: "border-violet-400/30",
        sfondo:
          "from-violet-500/15 via-slate-950 to-slate-950",
        luce: "bg-violet-400/20",
      };
  }
}

// =========================================================
// CARD SINGOLA
// =========================================================

function InsightCard({
  insight,
  indice,
}: {
  insight: PazziInsight;
  indice: number;
}) {
  const stile = getStileInsight(insight);

  return (
    <article
      className={[
        "group relative isolate overflow-hidden",
        "rounded-3xl border",
        "bg-gradient-to-br",
        "p-6 sm:p-7",
        "shadow-xl shadow-black/20",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-2",
        "hover:scale-[1.015]",
        "hover:shadow-2xl",
        stile.bordo,
        stile.sfondo,
      ].join(" ")}
      style={{
        animation: "pazziInsightEntrata 700ms ease-out both",
        animationDelay: `${indice * 120}ms`,
      }}
    >
      {/* Illuminazione ambientale */}
      <div
        className={[
          "pointer-events-none absolute",
          "-right-12 -top-12",
          "h-40 w-40 rounded-full",
          "opacity-60 blur-3xl",
          "transition-all duration-700",
          "group-hover:scale-150",
          "group-hover:opacity-100",
          stile.luce,
        ].join(" ")}
      />

      {/* Riflesso superiore */}
      <div
        className="
          pointer-events-none absolute
          inset-x-8 top-0 h-px
          bg-gradient-to-r
          from-transparent via-white/30 to-transparent
        "
      />

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div
            className={[
              "flex items-center gap-2",
              "text-[10px] font-black",
              "uppercase tracking-[0.24em]",
              stile.colore,
            ].join(" ")}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {stile.etichetta}
          </div>

          <span
            className={[
              "flex h-11 w-11",
              "items-center justify-center",
              "rounded-2xl",
              "border border-white/10",
              "bg-white/5",
              "text-2xl",
              "transition-transform duration-500",
              "group-hover:rotate-12",
              "group-hover:scale-110",
              stile.colore,
            ].join(" ")}
            aria-hidden="true"
          >
            {stile.icona}
          </span>
        </div>

        <h3
          className="
            mb-3 text-xl font-black
            leading-tight tracking-tight
            text-white sm:text-2xl
          "
        >
          {insight.titolo}
        </h3>

        <p
          className="
            max-w-lg text-sm
            leading-relaxed text-slate-300
            sm:text-base
          "
        >
          {insight.descrizione}
        </p>

        <div className="mt-7 flex items-center gap-3">
          <span
            className={[
              "text-[10px] font-black",
              "uppercase tracking-[0.18em]",
              stile.colore,
            ].join(" ")}
          >
            PazziTournament
          </span>

          <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
        </div>
      </div>
    </article>
  );
}

// =========================================================
// COMPONENTE PRINCIPALE
// =========================================================

export default async function PazziInsightsPartita({
  partitaId,
}: Props) {
  const insights = await getPazziInsightsPartita(
    partitaId
  );

  // Nessuna curiosità verificata:
  // non mostriamo sezioni vuote.
  if (insights.length === 0) {
    return null;
  }

  // Limitiamo la visualizzazione alle curiosità
  // più importanti, senza modificare il motore.
  const insightsVisibili = insights.slice(0, 6);

  return (
    <section
      className="relative my-10 w-full"
      aria-labelledby="pazzi-insights-titolo"
    >
      <style>
        {`
          @keyframes pazziInsightEntrata {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .pazzi-insights-grid article {
              animation: none !important;
              transition: none !important;
              transform: none !important;
            }
          }
        `}
      </style>

      {/* ===================================================
          INTESTAZIONE
      =================================================== */}

      <div className="relative mb-7 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 px-6 py-8 sm:px-9">
        <div
          className="
            pointer-events-none absolute
            -right-20 -top-28
            h-64 w-64 rounded-full
            bg-violet-600/20 blur-3xl
          "
        />

        <div
          className="
            pointer-events-none absolute
            -bottom-28 left-1/4
            h-48 w-48 rounded-full
            bg-cyan-500/10 blur-3xl
          "
        />

        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-3">
            <span
              className="
                rounded-full border
                border-violet-400/30
                bg-violet-500/10
                px-3 py-1
                text-[10px] font-black
                uppercase tracking-[0.2em]
                text-violet-300
              "
            >
              Powered by statistics
            </span>

            <span className="h-px w-12 bg-gradient-to-r from-violet-400/70 to-transparent" />
          </div>

          <h2
            id="pazzi-insights-titolo"
            className="
              text-3xl font-black
              uppercase tracking-tight
              text-white sm:text-4xl
            "
          >
            PAZZI{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              INSIGHTS
            </span>
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Ogni partita racconta una storia.
            Scopri i traguardi e le curiosità
            che emergono dai risultati reali
            di PazziTournament.
          </p>

          <div className="mt-5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span
              className="
                text-[10px] font-bold
                uppercase tracking-widest
                text-emerald-300
              "
            >
              Dati calcolati dal database
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================
          GRIGLIA INSIGHTS
      =================================================== */}

      <div
        className="
          pazzi-insights-grid
          grid grid-cols-1
          gap-4 md:grid-cols-2
          xl:grid-cols-3
        "
      >
        {insightsVisibili.map((insight, indice) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            indice={indice}
          />
        ))}
      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="mt-5 flex items-center justify-center gap-3">
        <div className="h-px max-w-20 flex-1 bg-gradient-to-r from-transparent to-white/10" />

        <p
          className="
            text-center text-[10px]
            font-bold uppercase
            tracking-[0.15em]
            text-slate-500
          "
        >
          Le statistiche diventano leggenda
        </p>

        <div className="h-px max-w-20 flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>
    </section>
  );
}
