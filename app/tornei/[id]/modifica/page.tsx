import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { modificaTorneo } from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ModificaTorneoPage({
  params,
}: Props) {
  const { id } = await params;

  const torneoId = Number(id);

  if (isNaN(torneoId)) {
    notFound();
  }

  const torneo = await prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },
    include: {
      partecipazioni: true,
    },
  });

  if (!torneo) {
    notFound();
  }

  const numeroSquadreInserite =
    torneo.partecipazioni.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        {/* TORNA AL TORNEO */}

        <Link
          href={`/tornei/${torneo.id}`}
          className="text-green-400 hover:underline"
        >
          ← Torna al torneo
        </Link>


        {/* INTESTAZIONE */}

        <div className="mt-8">

          <h1 className="text-4xl font-bold">
            ✏️ Modifica torneo
          </h1>

          <p className="text-slate-400 mt-2">
            Modifica le informazioni di {torneo.nome}
          </p>

        </div>


        {/* FORM */}

        <div className="mt-8 bg-slate-900 border border-slate-700 rounded-3xl p-8">

          <form
            action={modificaTorneo}
            className="space-y-6"
          >

            {/* ID TORNEO */}

            <input
              type="hidden"
              name="torneoId"
              value={torneo.id}
            />


            {/* NOME */}

            <div>

              <label className="block mb-2 font-semibold">
                Nome torneo
              </label>

              <input
                type="text"
                name="nome"
                defaultValue={torneo.nome}
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl"
              />

            </div>


            {/* TIPO */}

            <div>

              <label className="block mb-2 font-semibold">
                Tipo competizione
              </label>

              <select
                name="tipo"
                defaultValue={torneo.tipo}
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl"
              >

                <option value="Mondiale per Nazioni">
                  Mondiale per Nazioni
                </option>

                <option value="Mondiale per Club">
                  Mondiale per Club
                </option>

                <option value="Europeo">
                  Europeo
                </option>

              </select>

            </div>


            {/* ANNO */}

            <div>

              <label className="block mb-2 font-semibold">
                Anno
              </label>

              <input
                type="number"
                name="anno"
                defaultValue={torneo.anno}
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl"
              />

            </div>


            {/* VIDEOGIOCO */}

            <div>

              <label className="block mb-2 font-semibold">
                Videogioco
              </label>

              <input
                type="text"
                name="videogioco"
                defaultValue={torneo.videogioco ?? ""}
                placeholder="Es. FIFA 18"
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
              />

              <p className="text-sm text-slate-400 mt-2">
                Inserisci il videogioco con cui è stato disputato il torneo.
              </p>

            </div>


            {/* NUMERO SQUADRE */}

            <div>

              <label className="block mb-2 font-semibold">
                Numero massimo squadre
              </label>

              <select
                name="squadre"
                defaultValue={torneo.squadre}
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl"
              >

                <option value="8">
                  8 squadre
                </option>

                <option value="16">
                  16 squadre
                </option>

                <option value="32">
                  32 squadre
                </option>

              </select>

              <p className="text-sm text-slate-400 mt-2">
                Squadre già inserite:{" "}
                {numeroSquadreInserite}
              </p>

            </div>


            {/* FORMULA */}

            <div>

              <label className="block mb-2 font-semibold">
                Formula
              </label>

              <select
                name="formula"
                defaultValue={torneo.formula}
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl"
              >

                <option value="Gironi + eliminazione diretta">
                  Gironi + eliminazione diretta
                </option>

                <option value="Eliminazione diretta">
                  Eliminazione diretta
                </option>

                <option value="Campionato">
                  Campionato
                </option>

              </select>

            </div>


            {/* ANDATA E RITORNO */}

            <div>

              <label className="block mb-2 font-semibold">
                Andata e ritorno
              </label>

              <select
                name="andataRitorno"
                defaultValue={
                  torneo.andataRitorno
                    ? "Si"
                    : "No"
                }
                required
                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl"
              >

                <option value="Si">
                  Sì
                </option>

                <option value="No">
                  No
                </option>

              </select>

            </div>


            {/* PULSANTI */}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">

              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-bold transition"
              >
                💾 Salva modifiche
              </button>

              <Link
                href={`/tornei/${torneo.id}`}
                className="flex-1 text-center bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-bold transition"
              >
                Annulla
              </Link>

            </div>

          </form>

        </div>

      </div>
    </main>
  );
}