import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
params: Promise<{
id: string;
}>;
};

type Squadra = {
id: number;
nome: string;
stemma: string | null;
};

type Partita = {
id: bigint;
Fase: string | null;
NumeroGara: number;
GolCasa: number | null;
GolOspite: number | null;
AiRigori: boolean;
RigoriCasa: number | null;
RigoriOspite: number | null;
squadraCasa: Squadra | null;
squadraOspite: Squadra | null;
};

type Sfida = {
partite: Partita[];
squadraCasa: Squadra | null;
squadraOspite: Squadra | null;
};

const ORDINE_FASI = [
"Sedicesimi",
"Ottavi",
"Quarti",
"Semifinale",
"Finale",
];

const NOMI_FASI: Record<string, string> = {
Sedicesimi: "Sedicesimi di finale",
Ottavi: "Ottavi di finale",
Quarti: "Quarti di finale",
Semifinale: "Semifinali",
Finale: "Finale",
};

/* ============================================================
RAGGRUPPA LE PARTITE IN SFIDE
============================================================ */

function raggruppaSfide(partite: Partita[]): Sfida[] {
const sfide: Sfida[] = [];

for (const partita of partite) {
const casa = partita.squadraCasa;
const ospite = partita.squadraOspite;

if (!casa || !ospite) {
  continue;
}

const esistente = sfide.find((sfida) => {
  const casaId = sfida.squadraCasa?.id;
  const ospiteId = sfida.squadraOspite?.id;

  return (
    (casaId === casa.id && ospiteId === ospite.id) ||
    (casaId === ospite.id && ospiteId === casa.id)
  );
});

if (esistente) {
  esistente.partite.push(partita);
} else {
  sfide.push({
    partite: [partita],
    squadraCasa: casa,
    squadraOspite: ospite,
  });
}

}

sfide.sort((a, b) => {
const numeroA = Math.min(
...a.partite.map((partita) => partita.NumeroGara)
);

const numeroB = Math.min(
  ...b.partite.map((partita) => partita.NumeroGara)
);

return numeroA - numeroB;

});

return sfide;
}

/* ============================================================
CARD DELLA SINGOLA PARTITA
============================================================ */

function PartitaCard({
partita,
torneoId,
}: {
partita: Partita;
torneoId: number;
}) {
const casa = partita.squadraCasa;
const ospite = partita.squadraOspite;

return ( <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg"> <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"> <div className="truncate text-right text-lg font-bold">
{casa?.nome || "Squadra"} </div>

    <div className="whitespace-nowrap text-2xl font-black">
      {partita.GolCasa !== null && partita.GolOspite !== null
        ? `${partita.GolCasa} - ${partita.GolOspite}`
        : "—"}
    </div>

    <div className="truncate text-left text-lg font-bold">
      {ospite?.nome || "Squadra"}
    </div>
  </div>

  {partita.AiRigori &&
    partita.RigoriCasa !== null &&
    partita.RigoriOspite !== null && (
      <div className="mt-2 text-center text-sm text-slate-400">
        Rigori {partita.RigoriCasa} - {partita.RigoriOspite}
      </div>
    )}

  <Link
    href={`/tornei/${torneoId}/partite/${partita.id.toString()}`}
    className="mt-3 block text-center text-sm text-slate-400 transition hover:text-green-400"
  >
    Modifica partita
  </Link>
</div>

);
}

/* ============================================================
CARD DELLA SFIDA
============================================================ */

function SfidaCard({
sfida,
torneoId,
}: {
sfida: Sfida;
torneoId: number;
}) {
const partite = [...sfida.partite].sort(
(a, b) => a.NumeroGara - b.NumeroGara
);

return ( <div className="space-y-3">
{partite.map((partita) => ( <PartitaCard
       key={partita.id.toString()}
       partita={partita}
       torneoId={torneoId}
     />
))} </div>
);
}

/* ============================================================
BRACKET
============================================================ */

function Bracket({
fasi,
torneoId,
}: {
fasi: {
nome: string;
sfide: Sfida[];
}[];
torneoId: number;
}) {
const CARD_WIDTH = 430;
const CARD_HEIGHT = 190;
const COLUMN_GAP = 150;
const ROW_GAP = 60;

/* ==========================================================
CALCOLO POSIZIONI
========================================================== */

const posizioniFasi: number[][] = [];

for (let faseIndex = 0; faseIndex < fasi.length; faseIndex++) {
const fase = fasi[faseIndex];

if (faseIndex === 0) {
  posizioniFasi.push(
    fase.sfide.map(
      (_, index) => index * (CARD_HEIGHT + ROW_GAP)
    )
  );

  continue;
}

const precedente = posizioniFasi[faseIndex - 1];
const nuovePosizioni: number[] = [];

for (let i = 0; i < fase.sfide.length; i++) {
  const prima = precedente[i * 2];
  const seconda = precedente[i * 2 + 1];

  if (prima !== undefined && seconda !== undefined) {
    const centroPrima = prima + CARD_HEIGHT / 2;
    const centroSeconda = seconda + CARD_HEIGHT / 2;

    const centro = (centroPrima + centroSeconda) / 2;

    nuovePosizioni.push(centro - CARD_HEIGHT / 2);
  } else if (prima !== undefined) {
    nuovePosizioni.push(prima);
  }
}

posizioniFasi.push(nuovePosizioni);

}

/* ==========================================================
ALTEZZA BRACKET
========================================================== */

const ultimaPosizione =
posizioniFasi[0]?.[posizioniFasi[0].length - 1] || 0;

const altezzaBracket = Math.max(
500,
ultimaPosizione + CARD_HEIGHT + 50
);

/* ==========================================================
LINEE SVG
========================================================== */

const linee: React.ReactNode[] = [];

for (let faseIndex = 0; faseIndex < fasi.length - 1; faseIndex++) {
const partenza = posizioniFasi[faseIndex];
const arrivo = posizioniFasi[faseIndex + 1];

for (let i = 0; i < arrivo.length; i++) {
  const prima = partenza[i * 2];
  const seconda = partenza[i * 2 + 1];
  const destinazione = arrivo[i];

  if (
    prima === undefined ||
    seconda === undefined ||
    destinazione === undefined
  ) {
    continue;
  }

  const xPartenza =
    faseIndex * (CARD_WIDTH + COLUMN_GAP) + CARD_WIDTH;

  const xVerticale = xPartenza + COLUMN_GAP / 2;

  const xArrivo =
    (faseIndex + 1) * (CARD_WIDTH + COLUMN_GAP);

  const yPrima = prima + CARD_HEIGHT / 2;
  const ySeconda = seconda + CARD_HEIGHT / 2;

  const yCentro = (yPrima + ySeconda) / 2;

  const yDestinazione =
    destinazione + CARD_HEIGHT / 2;

  linee.push(
    <line
      key={`linea-alta-${faseIndex}-${i}`}
      x1={xPartenza}
      y1={yPrima}
      x2={xVerticale}
      y2={yPrima}
      stroke="#475569"
      strokeWidth="2"
    />
  );

  linee.push(
    <line
      key={`linea-bassa-${faseIndex}-${i}`}
      x1={xPartenza}
      y1={ySeconda}
      x2={xVerticale}
      y2={ySeconda}
      stroke="#475569"
      strokeWidth="2"
    />
  );

  linee.push(
    <line
      key={`linea-verticale-${faseIndex}-${i}`}
      x1={xVerticale}
      y1={yPrima}
      x2={xVerticale}
      y2={ySeconda}
      stroke="#475569"
      strokeWidth="2"
    />
  );

  linee.push(
    <line
      key={`linea-centro-${faseIndex}-${i}`}
      x1={xVerticale}
      y1={yCentro}
      x2={xArrivo}
      y2={yDestinazione}
      stroke="#475569"
      strokeWidth="2"
    />
  );
}

}

const larghezzaBracket =
fasi.length * CARD_WIDTH +
(fasi.length - 1) * COLUMN_GAP;

return (
<div
className="relative"
style={{
width: `${larghezzaBracket}px`,
height: `${altezzaBracket}px`,
}}
>
{/* LINEE */}

  <svg
    className="pointer-events-none absolute inset-0 z-0"
    width={larghezzaBracket}
    height={altezzaBracket}
  >
    {linee}
  </svg>

  {/* FASI */}

  {fasi.map((fase, faseIndex) => {
    const x =
      faseIndex * (CARD_WIDTH + COLUMN_GAP);

    return (
      <div
        key={fase.nome}
        className="absolute top-0 z-10"
        style={{
          left: `${x}px`,
          width: `${CARD_WIDTH}px`,
        }}
      >
        {/* TITOLO */}

        <div className="mb-8 text-center">
          <h2 className="text-xl font-black uppercase tracking-wide">
            {NOMI_FASI[fase.nome]}
          </h2>

          <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-green-500" />
        </div>

        {/* SFIDE */}

        {fase.sfide.map((sfida, index) => (
          <div
            key={`${fase.nome}-${index}`}
            className="absolute left-0"
            style={{
              top: `${posizioniFasi[faseIndex][index]}px`,
            }}
          >
            <SfidaCard
              sfida={sfida}
              torneoId={torneoId}
            />
          </div>
        ))}
      </div>
    );
  })}
</div>

);
}

/* ============================================================
PAGINA PRINCIPALE
============================================================ */

export default async function EliminazioneDirettaPage({
params,
}: Props) {
const { id } = await params;

const torneoId = Number(id);

if (Number.isNaN(torneoId)) {
notFound();
}

/* ==========================================================
RECUPERO TORNEO
========================================================== */

const torneo = await prisma.torneo.findUnique({
where: {
id: torneoId,
},

include: {
  partite: {
    where: {
      Fase: {
        in: [
          "Sedicesimi",
          "Ottavi",
          "Quarti",
          "Semifinale",
          "Finale",
          "TerzoPosto",
        ],
      },
    },

    orderBy: {
      NumeroGara: "asc",
    },

    include: {
      squadraCasa: true,
      squadraOspite: true,
    },
  },
},

});

if (!torneo) {
notFound();
}

const partite = torneo.partite as Partita[];

/* ==========================================================
SOLO FASI PRESENTI
========================================================== */

const fasiPresenti = ORDINE_FASI.filter((fase) =>
partite.some((partita) => partita.Fase === fase)
);

/* ==========================================================
CREA FASI
========================================================== */

const fasi = fasiPresenti.map((fase) => ({
nome: fase,

sfide: raggruppaSfide(
  partite.filter(
    (partita) => partita.Fase === fase
  )
),

}));

/* ==========================================================
TERZO / QUARTO POSTO
========================================================== */

const sfideTerzoPosto = raggruppaSfide(
partite.filter(
(partita) => partita.Fase === "TerzoPosto"
)
);

/* ==========================================================
RENDER
========================================================== */

return ( <main className="min-h-screen bg-slate-950 text-white"> <div className="mx-auto max-w-[2400px] px-6 py-10">

    {/* HEADER */}

    <div className="mb-16">
      <Link
        href={`/tornei/${torneo.id}`}
        className="text-green-400 transition hover:text-green-300"
      >
        ← {torneo.nome}
      </Link>

      <h1 className="mt-6 text-5xl font-black">
        Eliminazione diretta
      </h1>

      <p className="mt-3 text-lg text-slate-400">
        Il percorso verso la finale.
      </p>
    </div>

    {/* ==================================================
    BRACKET
    ================================================== */}

    {fasi.length > 0 ? (
      <div className="overflow-x-auto pb-24">
        <Bracket
          fasi={fasi}
          torneoId={torneo.id}
        />
      </div>
    ) : (
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-12 text-center">
        <h2 className="text-2xl font-bold">
          Nessuna partita a eliminazione diretta
        </h2>

        <p className="mt-3 text-slate-400">
          Inserisci le partite per costruire il tabellone.
        </p>
      </div>
    )}

    {/* ==================================================
    TERZO / QUARTO POSTO
    ================================================== */}

    {sfideTerzoPosto.length > 0 && (
      <section className="mt-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black uppercase">
            3° / 4° posto
          </h2>

          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-green-500" />
        </div>

        <div className="flex justify-center">
          {sfideTerzoPosto.map(
            (sfida, index) => (
              <SfidaCard
                key={`terzo-posto-${index}`}
                sfida={sfida}
                torneoId={torneo.id}
              />
            )
          )}
        </div>
      </section>
    )}
  </div>
</main>

);
}
