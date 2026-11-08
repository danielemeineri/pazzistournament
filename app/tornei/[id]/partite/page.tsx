import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PartiteTorneoPage({
  params,
}: Props) {

  const { id } = await params;

  const torneoId =
    Number(id);

  if (
    !Number.isInteger(torneoId)
  ) {
    notFound();
  }


  // =========================================================
  // RECUPERO TORNEO E PARTITE
  // =========================================================

  const torneo =
    await prisma.torneo.findUnique({

      where: {
        id: torneoId,
      },

      include: {

        partite: {

          include: {

            squadraCasa: true,

            squadraOspite: true,

            girone: true,

          },

          orderBy: [

            // Prima le partite del girone
            {
              gironeId: "asc",
            },

            // Poi la giornata
            {
              giornata: "asc",
            },

            // Infine data e ora
            {
              dataPartita: "asc",
            },

            {
              OraPartita: "asc",
            },

          ],

        },

      },

    });


  if (!torneo) {
    notFound();
  }


  // =========================================================
  // STATISTICHE RAPIDE
  // =========================================================

  const totalePartite =
    torneo.partite.length;


  const partiteCompletate =
    torneo.partite.filter(
      (partita) =>
        partita.Completata === true
    ).length;


  const partiteDaGiocare =
    totalePartite -
    partiteCompletate;


  // =========================================================
  // FORMATTAZIONE DATA
  // =========================================================

  function formattaData(
    data: Date | null
  ) {

    if (!data) {
      return "Data non definita";
    }

    return new Intl.DateTimeFormat(
      "it-IT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(data);
  }


  // =========================================================
  // FORMATTAZIONE ORA
  // =========================================================

  function formattaOra(
    ora: Date | null
  ) {

    if (!ora) {
      return null;
    }

    return new Intl.DateTimeFormat(
      "it-IT",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(ora);
  }


  // =========================================================
  // NOME FASE
  // =========================================================

  function nomeFase(
    fase: string | null
  ) {

    switch (fase) {

      case "Girone":
        return "Girone";

      case "Sedicesimi":
        return "Sedicesimi di finale";

      case "Ottavi":
        return "Ottavi di finale";

      case "Quarti":
        return "Quarti di finale";

      case "Semifinale":
        return "Semifinale";

      case "Finale":
        return "Finale";

      case "Finale 3°/4° posto":
        return "Finale 3°/4° posto";

      default:
        return fase ||
          "Fase non definita";
    }

  }


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <main className="min-h-screen bg-slate-950 p-8 text-white">

      <div className="mx-auto max-w-6xl">


        {/* =====================================================
            TORNA AL TORNEO
        ===================================================== */}

        <Link
          href={`/tornei/${torneo.id}`}
          className="text-green-400 hover:underline"
        >
          ← {torneo.nome}
        </Link>


        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-widest text-green-400">
              Gestione torneo
            </p>

            <h1 className="mt-2 text-4xl font-black">
              ⚽ Partite
            </h1>

            <p className="mt-2 text-slate-400">
              Visualizza e gestisci tutte le partite
              di {torneo.nome}.
            </p>

          </div>


          <Link
            href={`/tornei/${torneo.id}/partite/nuova`}
            className="rounded-xl bg-green-600 px-6 py-3 text-center font-bold transition hover:bg-green-500"
          >
            ➕ Nuova partita
          </Link>

        </div>


        {/* =====================================================
            STATISTICHE
        ===================================================== */}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">


          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Partite totali
            </p>

            <p className="mt-2 text-3xl font-black">
              {totalePartite}
            </p>

          </div>


          <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5">

            <p className="text-sm text-green-400">
              Completate
            </p>

            <p className="mt-2 text-3xl font-black text-green-300">
              {partiteCompletate}
            </p>

          </div>


          <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">

            <p className="text-sm text-yellow-400">
              Da giocare
            </p>

            <p className="mt-2 text-3xl font-black text-yellow-300">
              {partiteDaGiocare}
            </p>

          </div>


        </div>


        {/* =====================================================
            NESSUNA PARTITA
        ===================================================== */}

        {totalePartite === 0 ? (

          <div className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-10 text-center">

            <div className="text-6xl">
              ⚽
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Nessuna partita inserita
            </h2>

            <p className="mt-2 text-slate-400">
              Inizia inserendo la prima partita
              del torneo.
            </p>

            <Link
              href={`/tornei/${torneo.id}/partite/nuova`}
              className="mt-6 inline-block rounded-xl bg-green-600 px-6 py-3 font-bold transition hover:bg-green-500"
            >
              ➕ Inserisci prima partita
            </Link>

          </div>

        ) : (

          <div className="mt-10 space-y-5">


            {/* =================================================
                ELENCO PARTITE
            ================================================= */}

            {torneo.partite.map(
              (partita) => (

                <Link
                  key={String(partita.id)}
                  href={`/tornei/${torneo.id}/partite/${partita.id}`}
                  className="block rounded-3xl border border-slate-700 bg-slate-900 p-6 transition hover:border-green-500 hover:bg-slate-800"
                >


                  {/* ===========================================
                      HEADER PARTITA
                  =========================================== */}

                  <div className="flex flex-col gap-3 border-b border-slate-700 pb-4 md:flex-row md:items-center md:justify-between">


                    <div className="flex flex-wrap items-center gap-2">


                      <span className="rounded-lg bg-purple-900/50 px-3 py-1 text-sm font-bold text-purple-300">
                        {nomeFase(
                          partita.Fase
                        )}
                      </span>


                      {partita.girone && (

                        <span className="rounded-lg bg-blue-900/50 px-3 py-1 text-sm font-bold text-blue-300">
                          {partita.girone.nome}
                        </span>

                      )}


                      {partita.Fase ===
                        "Girone" &&
                        partita.giornata && (

                        <span className="rounded-lg bg-slate-800 px-3 py-1 text-sm font-bold text-slate-300">
                          Giornata{" "}
                          {partita.giornata}
                        </span>

                      )}


                      {torneo.andataRitorno && (

                        <span className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300">

                          {partita.NumeroGara ===
                          1
                            ? "Andata"
                            : "Ritorno"}

                        </span>

                      )}

                    </div>


                    <div className="text-sm text-slate-400">

                      {formattaData(
                        partita.dataPartita
                      )}

                      {formattaOra(
                        partita.OraPartita
                      ) && (

                        <>
                          {" • "}

                          {formattaOra(
                            partita.OraPartita
                          )}
                        </>

                      )}

                    </div>

                  </div>


                  {/* ===========================================
                      SQUADRE E RISULTATO
                  =========================================== */}

                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">


                    {/* CASA */}

                    <div className="flex items-center justify-end gap-3 text-right">

                      <div>

                        <p className="text-lg font-bold">

                          {
                            partita.squadraCasa
                              ?.nome ||
                            "Squadra da definire"
                          }

                        </p>

                        <p className="text-xs text-slate-500">
                          Casa
                        </p>

                      </div>


                      {partita.squadraCasa
                        ?.stemma ? (

                        <img
                          src={
                            partita
                              .squadraCasa
                              .stemma
                          }
                          alt={
                            partita
                              .squadraCasa
                              .nome
                          }
                          className="h-12 w-12 object-contain"
                        />

                      ) : (

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl">
                          ⚽
                        </div>

                      )}

                    </div>


                    {/* RISULTATO */}

                    <div className="text-center">

                      {partita.Completata ? (

                        <>

                          <div className="text-3xl font-black">

                            {partita.GolCasa}

                            <span className="mx-2 text-slate-500">
                              -
                            </span>

                            {partita.GolOspite}

                          </div>


                          {partita.AiRigori && (

                            <p className="mt-1 text-xs font-bold text-yellow-400">

                              Rigori{" "}

                              {partita.RigoriCasa}

                              -

                              {partita.RigoriOspite}

                            </p>

                          )}

                        </>

                      ) : (

                        <span className="rounded-xl bg-yellow-900/40 px-4 py-2 text-sm font-bold text-yellow-300">
                          Da giocare
                        </span>

                      )}

                    </div>


                    {/* OSPITE */}

                    <div className="flex items-center gap-3">


                      {partita.squadraOspite
                        ?.stemma ? (

                        <img
                          src={
                            partita
                              .squadraOspite
                              .stemma
                          }
                          alt={
                            partita
                              .squadraOspite
                              .nome
                          }
                          className="h-12 w-12 object-contain"
                        />

                      ) : (

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl">
                          ⚽
                        </div>

                      )}


                      <div>

                        <p className="text-lg font-bold">

                          {
                            partita
                              .squadraOspite
                              ?.nome ||
                            "Squadra da definire"
                          }

                        </p>

                        <p className="text-xs text-slate-500">
                          Ospite
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* ===========================================
                      DETTAGLIO
                  =========================================== */}

                  <div className="mt-5 border-t border-slate-800 pt-4 text-right">

                    <span className="text-sm font-bold text-green-400">
                      Visualizza dettaglio →
                    </span>

                  </div>


                </Link>

              )
            )}

          </div>

        )}

      </div>

    </main>

  );
}