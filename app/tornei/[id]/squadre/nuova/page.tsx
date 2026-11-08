import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { aggiungiSquadra } from "../actions";
import Link from "next/link";

export default async function NuovaSquadraTorneoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const torneoId = Number(id);

  if (isNaN(torneoId)) {
    notFound();
  }

  const torneo = await prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },
  });

  if (!torneo) {
    notFound();
  }

  // Squadre disponibili
  const squadre = await prisma.squadra.findMany({
    orderBy: {
      nome: "asc",
    },
  });

  // Partecipanti disponibili
  const partecipanti =
    await prisma.partecipante.findMany({
      orderBy: {
        nome: "asc",
      },
    });

  // Gironi del torneo
  const gironi = await prisma.girone.findMany({
    where: {
      torneoId,
    },
    orderBy: {
      nome: "asc",
    },
  });

  // Squadre già inserite
  const partecipazioni =
    await prisma.partecipazione.findMany({
      where: {
        torneoId,
      },
      select: {
        squadraId: true,
      },
    });

  const squadreGiaInserite = new Set(
    partecipazioni.map(
      (partecipazione) =>
        partecipazione.squadraId
    )
  );

  const squadreDisponibili =
    squadre.filter(
      (squadra) =>
        !squadreGiaInserite.has(
          squadra.id
        )
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-xl mx-auto">

        <Link
          href={`/tornei/${torneo.id}/squadre`}
          className="text-green-400 hover:underline"
        >
          ← Torna alle squadre del torneo
        </Link>

        <h1 className="text-4xl font-bold mt-8 mb-3">
          ➕ Aggiungi squadra
        </h1>

        <p className="text-slate-300 mb-8">
          Torneo: {torneo.nome}
        </p>

        {squadreDisponibili.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-6">
            Tutte le squadre disponibili sono già
            state inserite in questo torneo.
          </div>
        ) : (
          <form
            action={aggiungiSquadra}
            className="bg-slate-800 rounded-2xl p-6 space-y-6"
          >

            <input
              type="hidden"
              name="torneoId"
              value={torneo.id}
            />

            {/* SQUADRA */}
            <div>
              <label className="block mb-2 font-semibold">
                Squadra
              </label>

              <select
                name="squadraId"
                required
                className="w-full bg-slate-700 p-3 rounded-xl"
                defaultValue=""
              >
                <option value="" disabled>
                  Seleziona una squadra
                </option>

                {squadreDisponibili.map(
                  (squadra) => (
                    <option
                      key={squadra.id}
                      value={squadra.id}
                    >
                      {squadra.nome}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* PARTECIPANTE */}
            <div>
              <label className="block mb-2 font-semibold">
                Partecipante
              </label>

              <select
                name="partecipanteId"
                required
                className="w-full bg-slate-700 p-3 rounded-xl"
                defaultValue=""
              >
                <option value="" disabled>
                  Seleziona un partecipante
                </option>

                {partecipanti.map(
                  (partecipante) => (
                    <option
                      key={partecipante.id}
                      value={partecipante.id}
                    >
                      {partecipante.nome}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* GIRONE */}
            <div>
              <label className="block mb-2 font-semibold">
                Girone
              </label>

              {gironi.length === 0 ? (
                <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 rounded-xl p-4">
                  <p className="font-semibold">
                    Nessun girone creato
                  </p>

                  <p className="text-sm mt-1">
                    Puoi aggiungere la squadra senza
                    assegnarla a un girone e assegnarla
                    successivamente.
                  </p>
                </div>
              ) : (
                <select
                  name="gironeId"
                  className="w-full bg-slate-700 p-3 rounded-xl"
                  defaultValue=""
                >
                  <option value="">
                    Nessun girone / Da assegnare
                  </option>

                  {gironi.map(
                    (girone) => (
                      <option
                        key={girone.id}
                        value={girone.id}
                      >
                        {girone.nome}
                      </option>
                    )
                  )}
                </select>
              )}
            </div>

            {/* PULSANTE */}
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold transition"
            >
              ➕ Aggiungi squadra al torneo
            </button>

          </form>
        )}

      </div>
    </main>
  );
}