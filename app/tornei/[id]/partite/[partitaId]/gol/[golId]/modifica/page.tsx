import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { modificaGol } from "./actions";

type Props = {
  params: Promise<{
    id: string;
    partitaId: string;
    golId: string;
  }>;
};

export default async function ModificaGolPage({
  params,
}: Props) {

  const {
    id,
    partitaId,
    golId,
  } = await params;

  const torneoId = Number(id);

  if (
    Number.isNaN(torneoId)
  ) {
    notFound();
  }

  let partitaIdBigInt: bigint;

  try {
    partitaIdBigInt =
      BigInt(partitaId);
  } catch {
    notFound();
  }

  const golIdNumber =
    Number(golId);

  if (
    Number.isNaN(golIdNumber)
  ) {
    notFound();
  }

  // =======================================================
  // TORNEO
  // =======================================================

  const torneo =
    await prisma.torneo.findUnique({
      where: {
        id: torneoId,
      },
    });

  if (!torneo) {
    notFound();
  }

  // =======================================================
  // PARTITA
  // =======================================================

  const partita =
    await prisma.partita.findUnique({
      where: {
        id: partitaIdBigInt,
      },

      include: {
        squadraCasa: true,
        squadraOspite: true,
      },
    });

  if (
    !partita ||
    partita.TorneoId !== torneoId
  ) {
    notFound();
  }

  // =======================================================
  // GOL
  // =======================================================

  const gol =
    await prisma.gol.findUnique({
      where: {
        id: golIdNumber,
      },

      include: {
        calciatoreTorneo: {
          include: {
            calciatore: true,
            squadra: true,
          },
        },
      },
    });

  // =======================================================
  // CONTROLLO IMPORTANTE
  // =======================================================
  //
  // Il gol deve appartenere proprio a questa partita.
  //
  // =======================================================

  if (
    !gol ||
    gol.partitaId !== partitaIdBigInt
  ) {
    notFound();
  }

  // =======================================================
  // CALCIATORI
  // =======================================================

  const calciatori =
    await prisma.calciatoreTorneo.findMany({
      where: {
        torneoId,
      },

      include: {
        calciatore: true,
        squadra: true,
      },

      orderBy: {
        calciatore: {
          nome: "asc",
        },
      },
    });

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-3xl mx-auto">

        {/* =================================================
            TORNA
        ================================================= */}

        <Link
          href={`/tornei/${torneoId}/partite/${partitaId}`}
          className="text-green-400 font-bold hover:underline"
        >
          ← Torna alla partita
        </Link>

        {/* =================================================
            TITOLO
        ================================================= */}

        <div className="mt-8">

          <p className="text-green-400 font-bold">
            {torneo.nome}
          </p>

          <h1 className="text-3xl font-black mt-2">
            ✏️ Modifica gol
          </h1>

          <p className="text-slate-400 mt-2">
            {partita.squadraCasa?.nome ||
              "TBD"}
            {" - "}
            {partita.squadraOspite?.nome ||
              "TBD"}
          </p>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <div className="mt-8 bg-slate-900 border border-slate-700 rounded-3xl p-6">

          <form
            action={modificaGol}
            className="space-y-6"
          >

            {/* TORNEO */}

            <input
              type="hidden"
              name="torneoId"
              value={torneoId}
            />

            {/* PARTITA */}

            <input
              type="hidden"
              name="partitaId"
              value={partitaId}
            />

            {/* GOL */}

            <input
              type="hidden"
              name="golId"
              value={golIdNumber}
            />

            {/* =================================================
                CALCIATORE
            ================================================= */}

            <div>

              <label className="block font-bold mb-2">
                Marcatore
              </label>

              <select
                name="calciatoreTorneoId"
                defaultValue={
                  gol.calciatoreTorneoId
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3"
                required
              >

                {calciatori.map(
                  (c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.calciatore.nome}
                      {" - "}
                      {c.squadra.nome}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* =================================================
                MINUTO
            ================================================= */}

            <div>

              <label className="block font-bold mb-2">
                Minuto
              </label>

              <input
                name="minuto"
                type="number"
                min="1"
                max="130"
                defaultValue={
                  gol.minuto
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3"
                required
              />

            </div>

            {/* =================================================
                RECUPERO
            ================================================= */}

            <div>

              <label className="block font-bold mb-2">
                Recupero
              </label>

              <input
                name="recupero"
                type="number"
                min="0"
                defaultValue={
                  gol.recupero ?? 0
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3"
              />

            </div>

            {/* =================================================
                PERIODO
            ================================================= */}

            <div>

              <label className="block font-bold mb-2">
                Tempo partita
              </label>

              <select
                name="periodo"
                defaultValue={
                  gol.periodo
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3"
                required
              >

                <option value="PT">
                  Primo tempo
                </option>

                <option value="ST">
                  Secondo tempo
                </option>

                <option value="SUPPLEMENTARI">
                  Supplementari
                </option>

              </select>

            </div>

            {/* =================================================
                TIPO
            ================================================= */}

            <div>

              <label className="block font-bold mb-2">
                Tipo gol
              </label>

              <select
                name="tipo"
                defaultValue={
                  gol.tipo
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3"
                required
              >

                <option value="NORMALE">
                  ⚽ Gol
                </option>

                <option value="RIGORE">
                  🥅 Rigore
                </option>

                <option value="AUTOGOL">
                  🔄 Autogol
                </option>

              </select>

            </div>

            {/* =================================================
                SALVA
            ================================================= */}

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 rounded-xl p-4 font-black text-lg transition"
            >
              💾 Salva modifica
            </button>

          </form>

        </div>

      </div>

    </main>
  );
}