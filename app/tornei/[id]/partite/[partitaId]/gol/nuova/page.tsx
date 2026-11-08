import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aggiungiGol } from "./actions";

type Props = {
  params: Promise<{
    id: string;
    partitaId: string;
  }>;
};

export default async function NuovoGolPage({
  params,
}: Props) {

  const { id, partitaId } = await params;

  const torneoId = Number(id);

  if (Number.isNaN(torneoId)) {
    notFound();
  }


  let partitaIdBigInt: bigint;

  try {

    partitaIdBigInt = BigInt(partitaId);

  } catch {

    notFound();

  }



  // ==========================
  // TORNEO
  // ==========================

  const torneo =
    await prisma.torneo.findUnique({

      where: {
        id: torneoId,
      },

    });



  if (!torneo) {
    notFound();
  }



  // ==========================
  // PARTITA
  // ==========================

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



  if (!partita) {
    notFound();
  }



  if (
    partita.TorneoId !== torneoId
  ) {

    notFound();

  }



  // ==========================
  // CALCIATORI
  // ==========================

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



  const calciatoriDisponibili =
    calciatori.filter(

      (calciatoreTorneo) =>

        calciatoreTorneo.squadraId === partita.SquadraCasaId ||
        calciatoreTorneo.squadraId === partita.SquadraOspiteId

    );



  return (

    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-8">

      <div className="mx-auto max-w-4xl">


        {/* TORNA */}

        <Link

          href={`/tornei/${torneo.id}/partite/${partita.id.toString()}`}

          className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold transition"

        >

          ← Torna alla partita

        </Link>



        {/* HEADER */}

        <div className="mt-8">

          <p className="text-sm font-semibold uppercase tracking-wider text-green-400">

            {torneo.nome}

          </p>


          <h1 className="mt-2 text-3xl md:text-4xl font-black">

            ⚽ Aggiungi marcatore

          </h1>

        </div>



        {/* RIEPILOGO */}

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">


          <p className="text-center text-sm uppercase tracking-wider text-slate-400">

            {partita.Fase || "Partita"}

          </p>



          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">


            <div className="text-right">

              <p className="font-black text-lg">

                {partita.squadraCasa?.nome || "TBD"}

              </p>

            </div>



            <div className="text-4xl font-black">

              {partita.GolCasa ?? 0}

              <span className="mx-3 text-slate-600">

                -

              </span>

              {partita.GolOspite ?? 0}

            </div>



            <div className="text-left">

              <p className="font-black text-lg">

                {partita.squadraOspite?.nome || "TBD"}

              </p>

            </div>


          </div>


        </div>





        {/* FORM */}

        <form

          action={aggiungiGol}

          className="mt-8 space-y-8 rounded-3xl border border-slate-700 bg-slate-900 p-6 md:p-8 shadow-xl"

        >


          <input

            type="hidden"

            name="torneoId"

            value={torneo.id}

          />


          <input

            type="hidden"

            name="partitaId"

            value={partita.id.toString()}

          />





          {/* CALCIATORE */}

          <div>


            <label

              htmlFor="calciatoreTorneoId"

              className="mb-2 block text-sm font-bold text-slate-300"

            >

              Calciatore

            </label>



            <select

              id="calciatoreTorneoId"

              name="calciatoreTorneoId"

              required

              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"

            >


              <option value="">

                Seleziona calciatore

              </option>



              {calciatoriDisponibili.map(

                (calciatoreTorneo) => (

                  <option

                    key={calciatoreTorneo.id}

                    value={calciatoreTorneo.id}

                  >

                    {calciatoreTorneo.calciatore.nome}

                    {" — "}

                    {calciatoreTorneo.squadra.nome}

                  </option>

                )

              )}


            </select>


          </div>





          {/* MINUTO + RECUPERO */}

          <div className="grid gap-5 md:grid-cols-2">


            <div>

              <label

                htmlFor="minuto"

                className="mb-2 block text-sm font-bold text-slate-300"

              >

                Minuto

              </label>


              <input

                id="minuto"

                name="minuto"

                type="number"

                min="1"

                max="130"

                required

                placeholder="37"

                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"

              />

            </div>



            <div>

              <label

                htmlFor="recupero"

                className="mb-2 block text-sm font-bold text-slate-300"

              >

                Recupero

              </label>


              <input

                id="recupero"

                name="recupero"

                type="number"

                min="0"

                max="20"

                defaultValue="0"

                placeholder="2"

                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"

              />


            </div>


          </div>





          {/* PERIODO */}

          <div>


            <label

              htmlFor="periodo"

              className="mb-2 block text-sm font-bold text-slate-300"

            >

              Periodo partita

            </label>



            <select

              id="periodo"

              name="periodo"

              defaultValue="ST"

              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"

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





          {/* TIPO GOL */}

          <div>


            <label

              htmlFor="tipo"

              className="mb-2 block text-sm font-bold text-slate-300"

            >

              Tipo gol

            </label>



            <select

              id="tipo"

              name="tipo"

              defaultValue="NORMALE"

              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"

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





          <button

            type="submit"

            disabled={
              calciatoriDisponibili.length === 0
            }

            className="w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-black transition hover:bg-green-500 disabled:bg-slate-700"

          >

            💾 Registra gol

          </button>



        </form>


      </div>


    </main>

  );

}