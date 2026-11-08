import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ClassificaSquadra = {
  squadraId: number;
  nome: string;
  stemma: string | null;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
  differenzaReti: number;
  punti: number;
};

export default async function GironiPage({
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
      gironi: {
        orderBy: {
          nome: "asc",
        },

        include: {
          partecipazioni: {
            include: {
              squadra: true,
            },
          },

          partite: {
            include: {
              squadraCasa: true,
              squadraOspite: true,
            },

            orderBy: [
              {
                giornata: "asc",
              },
              {
                dataPartita: "asc",
              },
            ],
          },
        },
      },
    },
  });

  if (!torneo) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <Link
              href={`/tornei/${torneo.id}`}
              className="text-green-400 hover:underline"
            >
              ← {torneo.nome}
            </Link>

            <h1 className="mt-6 text-4xl font-bold">
              🏆 Gironi
            </h1>

            <p className="mt-2 text-slate-400">
              Classifiche e risultati della fase a gironi.
            </p>
          </div>

          <Link
            href={`/tornei/${torneo.id}`}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700"
          >
            Torna al torneo
          </Link>

        </div>

        {/* ================================================= */}
        {/* NESSUN GIRONE */}
        {/* ================================================= */}

        {torneo.gironi.length === 0 ? (

          <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-900 p-10 text-center">

            <div className="mb-4 text-5xl">
              📊
            </div>

            <h2 className="text-2xl font-bold">
              Nessun girone creato
            </h2>

            <p className="mt-3 text-slate-400">
              Per visualizzare le classifiche devi prima
              creare i gironi e assegnare le squadre.
            </p>

          </div>

        ) : (

          <div className="mt-10 space-y-12">

            {torneo.gironi.map((girone) => {

              /* ================================================= */
              /* CREIAMO LA CLASSIFICA */
              /* ================================================= */

              const classificaMap =
                new Map<number, ClassificaSquadra>();

              for (
                const partecipazione of girone.partecipazioni
              ) {

                classificaMap.set(
                  partecipazione.squadraId,
                  {
                    squadraId:
                      partecipazione.squadraId,

                    nome:
                      partecipazione.squadra.nome,

                    stemma:
                      partecipazione.squadra.stemma,

                    partite: 0,

                    vittorie: 0,

                    pareggi: 0,

                    sconfitte: 0,

                    golFatti: 0,

                    golSubiti: 0,

                    differenzaReti: 0,

                    punti: 0,
                  }
                );
              }

              /* ================================================= */
              /* CALCOLIAMO I RISULTATI */
              /* ================================================= */

              for (
                const partita of girone.partite
              ) {

                if (
                  partita.SquadraCasaId === null ||
                  partita.SquadraOspiteId === null
                ) {
                  continue;
                }

                if (
                  partita.GolCasa === null ||
                  partita.GolOspite === null
                ) {
                  continue;
                }

                const casa =
                  classificaMap.get(
                    partita.SquadraCasaId
                  );

                const ospite =
                  classificaMap.get(
                    partita.SquadraOspiteId
                  );

                if (!casa || !ospite) {
                  continue;
                }

                /*
                 * Il risultato ai rigori NON modifica
                 * la classifica dei gironi.
                 */

                casa.partite += 1;
                ospite.partite += 1;

                casa.golFatti +=
                  partita.GolCasa;

                casa.golSubiti +=
                  partita.GolOspite;

                ospite.golFatti +=
                  partita.GolOspite;

                ospite.golSubiti +=
                  partita.GolCasa;

                /* =============================== */
                /* VITTORIA CASA */
                /* =============================== */

                if (
                  partita.GolCasa >
                  partita.GolOspite
                ) {

                  casa.vittorie += 1;
                  casa.punti += 3;
                  ospite.sconfitte += 1;

                }

                /* =============================== */
                /* VITTORIA OSPITE */
                /* =============================== */

                else if (
                  partita.GolOspite >
                  partita.GolCasa
                ) {

                  ospite.vittorie += 1;
                  ospite.punti += 3;
                  casa.sconfitte += 1;

                }

                /* =============================== */
                /* PAREGGIO */
                /* =============================== */

                else {

                  casa.pareggi += 1;
                  ospite.pareggi += 1;

                  casa.punti += 1;
                  ospite.punti += 1;

                }
              }

              /* ================================================= */
              /* DIFFERENZA RETI */
              /* ================================================= */

              const classifica =
                Array.from(
                  classificaMap.values()
                )
                  .map((squadra) => ({
                    ...squadra,

                    differenzaReti:
                      squadra.golFatti -
                      squadra.golSubiti,
                  }))

                  .sort((a, b) => {

                    /* 1. PUNTI */

                    if (
                      b.punti !==
                      a.punti
                    ) {
                      return (
                        b.punti -
                        a.punti
                      );
                    }

                    /* 2. DIFFERENZA RETI */

                    if (
                      b.differenzaReti !==
                      a.differenzaReti
                    ) {
                      return (
                        b.differenzaReti -
                        a.differenzaReti
                      );
                    }

                    /* 3. GOL FATTI */

                    if (
                      b.golFatti !==
                      a.golFatti
                    ) {
                      return (
                        b.golFatti -
                        a.golFatti
                      );
                    }

                    /* 4. ORDINE ALFABETICO */

                    return a.nome.localeCompare(
                      b.nome
                    );
                  });

              return (

                <section
                  key={girone.id}
                  className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"
                >

                  {/* ================================================= */}
                  {/* TITOLO GIRONE */}
                  {/* ================================================= */}

                  <div className="border-b border-slate-700 p-6">

                    <h2 className="text-2xl font-bold">
                      {girone.nome}
                    </h2>

                    <p className="mt-1 text-slate-400">
                      {girone.partecipazioni.length}{" "}
                      {girone.partecipazioni.length === 1
                        ? "squadra"
                        : "squadre"}
                    </p>

                  </div>

                  {/* ================================================= */}
                  {/* CLASSIFICA */}
                  {/* ================================================= */}

                  <div className="overflow-x-auto">

                    <table className="w-full">

                      <thead className="bg-slate-800">

                        <tr>

                          <th className="px-4 py-4 text-left">
                            #
                          </th>

                          <th className="px-4 py-4 text-left">
                            Squadra
                          </th>

                          <th className="px-3 py-4 text-center">
                            PG
                          </th>

                          <th className="px-3 py-4 text-center">
                            V
                          </th>

                          <th className="px-3 py-4 text-center">
                            N
                          </th>

                          <th className="px-3 py-4 text-center">
                            S
                          </th>

                          <th className="px-3 py-4 text-center">
                            GF
                          </th>

                          <th className="px-3 py-4 text-center">
                            GS
                          </th>

                          <th className="px-3 py-4 text-center">
                            DR
                          </th>

                          <th className="px-4 py-4 text-center">
                            Pt
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {classifica.map(
                          (
                            squadra,
                            index
                          ) => (

                            <tr
                              key={
                                squadra.squadraId
                              }
                              className={`border-t border-slate-800 ${
                                index < 2
                                  ? "bg-green-900/10"
                                  : ""
                              }`}
                            >

                              {/* POSIZIONE */}

                              <td className="px-4 py-4 font-bold text-slate-400">
                                {index + 1}
                              </td>

                              {/* SQUADRA */}

                              <td className="px-4 py-4">

                                <div className="flex items-center gap-3">

                                  {squadra.stemma ? (

                                    <img
                                      src={
                                        squadra.stemma
                                      }
                                      alt={
                                        squadra.nome
                                      }
                                      className="h-8 w-8 object-contain"
                                    />

                                  ) : (

                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                                      ⚽
                                    </div>

                                  )}

                                  <span className="font-bold">
                                    {squadra.nome}
                                  </span>

                                </div>

                              </td>

                              {/* PARTITE */}

                              <td className="px-3 py-4 text-center">
                                {squadra.partite}
                              </td>

                              {/* VITTORIE */}

                              <td className="px-3 py-4 text-center">
                                {squadra.vittorie}
                              </td>

                              {/* PAREGGI */}

                              <td className="px-3 py-4 text-center">
                                {squadra.pareggi}
                              </td>

                              {/* SCONFITTE */}

                              <td className="px-3 py-4 text-center">
                                {squadra.sconfitte}
                              </td>

                              {/* GOL FATTI */}

                              <td className="px-3 py-4 text-center">
                                {squadra.golFatti}
                              </td>

                              {/* GOL SUBITI */}

                              <td className="px-3 py-4 text-center">
                                {squadra.golSubiti}
                              </td>

                              {/* DIFFERENZA RETI */}

                              <td className="px-3 py-4 text-center">

                                {squadra.differenzaReti > 0
                                  ? `+${squadra.differenzaReti}`
                                  : squadra.differenzaReti}

                              </td>

                              {/* PUNTI */}

                              <td className="px-4 py-4 text-center">

                                <span className="text-lg font-bold">
                                  {squadra.punti}
                                </span>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                  {/* ================================================= */}
                  {/* PARTITE DEL GIRONE */}
                  {/* ================================================= */}

                  <div className="border-t border-slate-700 p-6">

                    <h3 className="mb-5 text-xl font-bold">
                      ⚽ Partite
                    </h3>

                    {girone.partite.length === 0 ? (

                      <p className="text-slate-500">
                        Nessuna partita inserita.
                      </p>

                    ) : (

                      <div className="space-y-3">

                        {girone.partite.map(
                          (partita) => {

                            const casa =
                              partita.squadraCasa;

                            const ospite =
                              partita.squadraOspite;

                            return (

                              <div
                                key={partita.id.toString()}
                                className="rounded-xl bg-slate-800 p-4"
                              >

                                <div className="flex items-center justify-between gap-4">

                                  <div className="flex-1 text-right">
                                    {casa?.nome ||
                                      "Squadra"}
                                  </div>

                                  <div className="min-w-[80px] text-center text-lg font-bold">

                                    {partita.GolCasa !== null &&
                                    partita.GolOspite !== null
                                      ? `${partita.GolCasa} - ${partita.GolOspite}`
                                      : "VS"}

                                  </div>

                                  <div className="flex-1 text-left">
                                    {ospite?.nome ||
                                      "Squadra"}
                                  </div>

                                </div>

                                <div className="mt-2 text-center text-xs text-slate-500">

                                  {partita.giornata
                                    ? `Giornata ${partita.giornata}`
                                    : "Giornata non specificata"}

                                </div>

                              </div>

                            );
                          }
                        )}

                      </div>

                    )}

                  </div>

                </section>

              );
            })}

          </div>

        )}

      </div>
    </main>
  );
}