
import { getIncisivitaPartecipante } from "@/lib/statistiche/incisivita-partecipante";

type Props = {
  partecipanteId: number;
};

const VERDE = "#16a34a";
const ROSSO = "#dc2626";

function creaPercorso(
  punti: { x: number; y: number }[]
): string {
  if (punti.length === 0) return "";
  if (punti.length === 1) {
    return `M ${punti[0].x} ${punti[0].y}`;
  }

  let percorso = `M ${punti[0].x} ${punti[0].y}`;

  for (let i = 0; i < punti.length - 1; i++) {
    const precedente = punti[Math.max(0, i - 1)];
    const corrente = punti[i];
    const successivo = punti[i + 1];
    const dopo = punti[Math.min(punti.length - 1, i + 2)];

    const controllo1X =
      corrente.x + (successivo.x - precedente.x) / 6;
    const controllo1Y =
      corrente.y + (successivo.y - precedente.y) / 6;

    const controllo2X =
      successivo.x - (dopo.x - corrente.x) / 6;
    const controllo2Y =
      successivo.y - (dopo.y - corrente.y) / 6;

    percorso +=
      ` C ${controllo1X} ${controllo1Y}` +
      ` ${controllo2X} ${controllo2Y}` +
      ` ${successivo.x} ${successivo.y}`;
  }

  return percorso;
}

export default async function IncisivitaPartecipante({
  partecipanteId,
}: Props) {
  const statistiche =
    await getIncisivitaPartecipante(partecipanteId);

  const fasce = statistiche.fasce;
  const larghezza = Math.max(760, fasce.length * 68);
  const altezza = 270;

  const margineSinistro = 42;
  const margineDestro = 20;
  const margineAlto = 24;
  const margineBasso = 42;

  const areaLarghezza =
    larghezza - margineSinistro - margineDestro;
  const areaAltezza =
    altezza - margineAlto - margineBasso;

  const massimoValore = Math.max(
    1,
    ...fasce.map((fascia) =>
      Math.max(fascia.golFatti, fascia.golSubiti)
    )
  );

  const scalaMassima = Math.ceil(massimoValore * 1.15);

  const puntiFatti = fasce.map((fascia, indice) => ({
    x:
      margineSinistro +
      (fasce.length <= 1
        ? areaLarghezza / 2
        : (indice / (fasce.length - 1)) * areaLarghezza),
    y:
      margineAlto +
      areaAltezza -
      (fascia.golFatti / scalaMassima) * areaAltezza,
  }));

  const puntiSubiti = fasce.map((fascia, indice) => ({
    x:
      margineSinistro +
      (fasce.length <= 1
        ? areaLarghezza / 2
        : (indice / (fasce.length - 1)) * areaLarghezza),
    y:
      margineAlto +
      areaAltezza -
      (fascia.golSubiti / scalaMassima) * areaAltezza,
  }));

  const etichetteAsse = Array.from(
    { length: 5 },
    (_, indice) => Math.round((scalaMassima * indice) / 4)
  );

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-lg sm:p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
          Analisi temporale
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Incisività durante la partita
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          In quali momenti il partecipante segna e subisce
          più gol, considerando il ruolo effettivo nella partita.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-400">Partite analizzate</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {statistiche.partiteAnalizzate}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-400">Gol fatti</p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {statistiche.golFatti}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-400">Gol subiti</p>
          <p className="mt-1 text-2xl font-bold text-red-400">
            {statistiche.golSubiti}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-zinc-400">Differenza reti</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              statistiche.golFatti - statistiche.golSubiti >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {statistiche.golFatti - statistiche.golSubiti > 0
              ? "+"
              : ""}
            {statistiche.golFatti - statistiche.golSubiti}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2 text-green-400">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          Gol fatti
        </span>

        <span className="inline-flex items-center gap-2 text-red-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Gol subiti
        </span>
      </div>

      {statistiche.partiteAnalizzate === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
          <p className="font-medium text-white">
            Nessuna partita disponibile
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Il grafico comparirà quando saranno disponibili partite
            concluse con risultati e dati dei gol registrati.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-black/20 p-2">
            <svg
              viewBox={`0 0 ${larghezza} ${altezza}`}
              className="block w-full"
              style={{ minWidth: `${larghezza}px` }}
              role="img"
              aria-label="Grafico dei gol fatti e subiti nelle diverse fasce temporali"
            >
              {etichetteAsse.map((valore, indice) => {
                const y =
                  margineAlto +
                  areaAltezza -
                  (valore / scalaMassima) * areaAltezza;

                return (
                  <g key={`asse-${indice}`}>
                    <line
                      x1={margineSinistro}
                      y1={y}
                      x2={larghezza - margineDestro}
                      y2={y}
                      stroke="#52525b"
                      strokeDasharray="4 5"
                      strokeOpacity="0.5"
                    />
                    <text
                      x={margineSinistro - 10}
                      y={y + 4}
                      textAnchor="end"
                      fill="#a1a1aa"
                      fontSize="11"
                    >
                      {valore}
                    </text>
                  </g>
                );
              })}

              <path
                d={creaPercorso(puntiFatti)}
                fill="none"
                stroke={VERDE}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d={creaPercorso(puntiSubiti)}
                fill="none"
                stroke={ROSSO}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {fasce.map((fascia, indice) => (
                <g key={fascia.chiave}>
                  <circle
                    cx={puntiFatti[indice].x}
                    cy={puntiFatti[indice].y}
                    r="4"
                    fill={VERDE}
                    stroke="#18181b"
                    strokeWidth="1.5"
                  >
                    <title>
                      {fascia.etichetta}: {fascia.golFatti} gol fatti
                      ({fascia.percentualeGolFatti}%)
                    </title>
                  </circle>

                  <circle
                    cx={puntiSubiti[indice].x}
                    cy={puntiSubiti[indice].y}
                    r="4"
                    fill={ROSSO}
                    stroke="#18181b"
                    strokeWidth="1.5"
                  >
                    <title>
                      {fascia.etichetta}: {fascia.golSubiti} gol subiti
                      ({fascia.percentualeGolSubiti}%)
                    </title>
                  </circle>

                  <text
                    x={puntiFatti[indice].x}
                    y={altezza - 13}
                    textAnchor="middle"
                    fill="#d4d4d8"
                    fontSize="10"
                  >
                    {indice + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            L'asse verticale indica il numero di gol nella singola fascia.
            Passa sui punti del grafico per leggere i valori. I numeri
            sull'asse orizzontale corrispondono all'ordine delle fasce
            riportate nella tabella.
          </p>

          <div className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-white">
              Dettaglio per fascia temporale
            </h3>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="bg-white/5 text-zinc-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fascia</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Gol fatti
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      % fatti
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Gol subiti
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      % subiti
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {fasce.map((fascia, indice) => (
                    <tr
                      key={fascia.chiave}
                      className="transition hover:bg-white/5"
                    >
                      <td className="px-4 py-3 text-zinc-200">
                        <span className="mr-2 text-zinc-500">
                          {indice + 1}.
                        </span>
                        {fascia.etichetta}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-green-400">
                        {fascia.golFatti}
                      </td>

                      <td className="px-4 py-3 text-right text-green-300">
                        {fascia.percentualeGolFatti.toLocaleString("it-IT")}
                        %
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-red-400">
                        {fascia.golSubiti}
                      </td>

                      <td className="px-4 py-3 text-right text-red-300">
                        {fascia.percentualeGolSubiti.toLocaleString("it-IT")}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
