
import type { FasciaGolAllenatore } from "@/lib/statistiche/gol-allenatore";

type Props = {
  nome: string;
  ruolo: string;
  partite: {
    id: string;
    avversario: string;
    fatti: number;
    subiti: number;
    data: string;
  }[];
  fasce: FasciaGolAllenatore[];
};

const LARGHEZZA = 720;
const ALTEZZA = 310;
const MARGINE_SINISTRO = 38;
const MARGINE_DESTRO = 15;
const MARGINE_ALTO = 28;
const MARGINE_BASSO = 75;

export default function GraficoGolAllenatore({
  nome,
  ruolo,
  partite,
  fasce,
}: Props) {
  const totaleFatti = fasce.reduce(
    (totale, fascia) => totale + fascia.fatti,
    0,
  );

  const totaleSubiti = fasce.reduce(
    (totale, fascia) => totale + fascia.subiti,
    0,
  );

  const massimo = Math.max(
    1,
    ...fasce.flatMap((fascia) => [
      fascia.fatti,
      fascia.subiti,
    ]),
  );

  const areaLarghezza =
    LARGHEZZA - MARGINE_SINISTRO - MARGINE_DESTRO;

  const areaAltezza =
    ALTEZZA - MARGINE_ALTO - MARGINE_BASSO;

  const scalaY = (valore: number) =>
    MARGINE_ALTO +
    areaAltezza -
    (valore / massimo) * areaAltezza;

  const larghezzaGruppo = areaLarghezza / fasce.length;
  const larghezzaBarra = Math.min(19, larghezzaGruppo * 0.28);

  if (partite.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <h3 className="break-words font-bold">{nome}</h3>
        <p className="mt-1 text-xs text-purple-300">{ruolo}</p>
        <p className="mt-3 text-sm text-slate-400">
          Nessuna partita conclusa disponibile per questo allenatore.
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="break-words font-bold">{nome}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-purple-300">
            {ruolo}
          </p>
        </div>

        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-slate-400">
          Ultime {partite.length} partite
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-400">Gol fatti</p>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            {totaleFatti}
          </p>
        </div>

        <div className="rounded-lg bg-slate-900 p-3">
          <p className="text-xs text-slate-400">Gol subiti</p>
          <p className="mt-1 text-2xl font-black text-red-400">
            {totaleSubiti}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-2 text-emerald-300">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Gol segnati
        </span>

        <span className="flex items-center gap-2 text-red-300">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          Gol subiti
        </span>
      </div>

      <div className="mt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
          role="img"
          aria-label={`Gol segnati e subiti da ${nome}, suddivisi per fascia temporale nelle ultime ${partite.length} partite`}
          className="w-full"
          style={{ minWidth: 480 }}
        >
          {Array.from({ length: massimo + 1 }, (_, valore) => (
            <g key={valore}>
              <line
                x1={MARGINE_SINISTRO}
                x2={LARGHEZZA - MARGINE_DESTRO}
                y1={scalaY(valore)}
                y2={scalaY(valore)}
                stroke="#334155"
                strokeDasharray="3 5"
              />

              <text
                x={MARGINE_SINISTRO - 9}
                y={scalaY(valore) + 4}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="end"
              >
                {valore}
              </text>
            </g>
          ))}

          {fasce.map((fascia, indice) => {
            const centro =
              MARGINE_SINISTRO +
              larghezzaGruppo * indice +
              larghezzaGruppo / 2;

            const xFatti = centro - larghezzaBarra - 2;
            const xSubiti = centro + 2;

            const yFatti = scalaY(fascia.fatti);
            const ySubiti = scalaY(fascia.subiti);

            const base = MARGINE_ALTO + areaAltezza;

            return (
              <g key={fascia.id}>
                <rect
                  x={xFatti}
                  y={yFatti}
                  width={larghezzaBarra}
                  height={Math.max(0, base - yFatti)}
                  rx="3"
                  fill="#10b981"
                >
                  <title>
                    {`${fascia.nome}: ${fascia.fatti} gol segnati`}
                  </title>
                </rect>

                <rect
                  x={xSubiti}
                  y={ySubiti}
                  width={larghezzaBarra}
                  height={Math.max(0, base - ySubiti)}
                  rx="3"
                  fill="#ef4444"
                >
                  <title>
                    {`${fascia.nome}: ${fascia.subiti} gol subiti`}
                  </title>
                </rect>

                <text
                  x={xFatti + larghezzaBarra / 2}
                  y={Math.max(MARGINE_ALTO + 12, yFatti - 6)}
                  fill="#6ee7b7"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {fascia.fatti}
                </text>

                <text
                  x={xSubiti + larghezzaBarra / 2}
                  y={Math.max(MARGINE_ALTO + 12, ySubiti - 6)}
                  fill="#fca5a5"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {fascia.subiti}
                </text>

                <text
                  x={centro}
                  y={base + 19}
                  fill="#cbd5e1"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {fascia.nome === "Recupero 1° tempo"
                    ? "Rec. PT"
                    : fascia.nome === "Recupero 2° tempo"
                      ? "Rec. ST"
                      : fascia.nome === "Supplementari"
                        ? "Supp."
                        : fascia.nome}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Ogni barra rappresenta il totale dei gol registrati in quella fascia
        nelle ultime {partite.length} partite concluse.
      </p>
    </section>
  );
}
