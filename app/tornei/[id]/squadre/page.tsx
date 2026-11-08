import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

import {
  rimuoviSquadra,
  modificaGironeSquadra,
  generaGironi,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SquadreTorneoPage({
  params,
}: Props) {
  const { id } = await params;

  const torneoId = Number(id);

  if (!Number.isInteger(torneoId)) {
    notFound();
  }

  const torneo = await prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },

    include: {
      partecipazioni: {
        include: {
          squadra: true,
          partecipante: true,
          girone: true,
        },

        orderBy: {
          squadra: {
            nome: "asc",
          },
        },
      },

      gironi: {
        include: {
          partecipazioni: {
            include: {
              squadra: true,
            },
          },
        },

        orderBy: {
          nome: "asc",
        },
      },
    },
  });

  if (!torneo) {
    notFound();
  }

  const numeroSquadreInserite =
    torneo.partecipazioni.length;

  const torneoCompleto =
    numeroSquadreInserite >= torneo.squadre;

  const prevedeGironi =
    torneo.formula ===
    "Gironi + eliminazione diretta";

  const numeroGironiNecessari =
    Math.ceil(torneo.squadre / 4);

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
            TITOLO
        ===================================================== */}

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-widest text-green-400">
            Gestione torneo
          </p>

          <h1 className="mt-2 text-4xl font-black">
            ⚽ Squadre del torneo
          </h1>

          <p className="mt-2 text-slate-400">
            Gestisci squadre, partecipanti, rose e gironi.
          </p>
        </div>

        {/* =====================================================
            CONTATORE SQUADRE
        ===================================================== */}

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm text-slate-400">
                Squadre inserite
              </p>

              <p className="mt-1 text-4xl font-black">
                {numeroSquadreInserite} / {torneo.squadre}
              </p>
            </div>

            {!torneoCompleto && (
              <Link
                href={`/tornei/${torneo.id}/squadre/nuova`}
                className="rounded-xl bg-green-600 px-6 py-3 font-bold transition hover:bg-green-500"
              >
                ➕ Aggiungi squadra
              </Link>
            )}

            {torneoCompleto && (
              <div className="rounded-xl border border-green-500 bg-green-900/50 px-5 py-3 font-bold text-green-300">
                ✅ Torneo completo
              </div>
            )}

          </div>
        </div>

        {/* =====================================================
            GESTIONE GIRONI
        ===================================================== */}

        {prevedeGironi && (
          <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Gestione gironi
                </h2>

                <p className="mt-1 text-slate-400">
                  Gironi creati:{" "}
                  <span className="font-bold text-white">
                    {torneo.gironi.length}
                  </span>
                  {" / "}
                  {numeroGironiNecessari}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Ogni girone prevede massimo 4 squadre.
                </p>
              </div>

              {torneo.gironi.length <
                numeroGironiNecessari && (
                <form action={generaGironi}>
                  <input
                    type="hidden"
                    name="torneoId"
                    value={torneo.id}
                  />

                  <button
                    type="submit"
                    className="rounded-xl bg-purple-600 px-6 py-3 font-bold transition hover:bg-purple-500"
                  >
                    ⚙️ Genera gironi
                  </button>
                </form>
              )}

              {torneo.gironi.length >=
                numeroGironiNecessari && (
                <div className="rounded-xl border border-purple-500 bg-purple-900/40 px-5 py-3 font-bold text-purple-300">
                  ✅ Gironi pronti
                </div>
              )}

            </div>
          </div>
        )}

        {/* =====================================================
            ELENCO SQUADRE
        ===================================================== */}

        <div className="mt-10">

          <h2 className="mb-5 text-2xl font-bold">
            Squadre partecipanti
          </h2>

          {torneo.partecipazioni.length === 0 ? (

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center">

              <div className="mb-4 text-5xl">
                ⚽
              </div>

              <h3 className="text-xl font-bold">
                Nessuna squadra inserita
              </h3>

              <p className="mt-2 text-slate-400">
                Aggiungi le squadre che parteciperanno
                a questo torneo.
              </p>

              <Link
                href={`/tornei/${torneo.id}/squadre/nuova`}
                className="mt-6 inline-block rounded-xl bg-green-600 px-6 py-3 font-bold transition hover:bg-green-500"
              >
                ➕ Aggiungi la prima squadra
              </Link>

            </div>

          ) : (

            <div className="grid gap-5 md:grid-cols-2">

              {torneo.partecipazioni.map(
                (partecipazione) => (

                  <div
                    key={partecipazione.id}
                    className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
                  >

                    {/* =================================================
                        SQUADRA
                    ================================================= */}

                    <div className="flex items-center gap-4">

                      {partecipazione.squadra.stemma ? (

                        <img
                          src={
                            partecipazione.squadra.stemma
                          }
                          alt={
                            partecipazione.squadra.nome
                          }
                          className="h-14 w-14 object-contain"
                        />

                      ) : (

                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 text-3xl">
                          ⚽
                        </div>

                      )}

                      <div>

                        <h3 className="text-xl font-bold">
                          {
                            partecipazione.squadra.nome
                          }
                        </h3>

                        <p className="text-slate-400">
                          {
                            partecipazione.squadra.tipo
                          }
                        </p>

                      </div>

                    </div>

                    {/* =================================================
                        PARTECIPANTE
                    ================================================= */}

                    <div className="mt-5 border-t border-slate-700 pt-4">

                      <p className="text-sm text-slate-400">
                        Partecipante
                      </p>

                      <p className="mt-1 font-bold">
                        {partecipazione.partecipante
                          ? partecipazione.partecipante.nome
                          : "Non assegnato"}
                      </p>

                    </div>

                    {/* =================================================
                        VISUALIZZA SQUADRA
                    ================================================= */}

                    <Link
                      href={`/squadre/${partecipazione.squadra.id}`}
                      className="mt-5 block w-full rounded-xl border border-green-600 bg-green-600/10 px-4 py-3 text-center font-bold text-green-400 transition hover:bg-green-600 hover:text-white"
                    >
                      👁️ Visualizza squadra
                    </Link>

                    {/* =================================================
                        GIRONE
                    ================================================= */}

                    {prevedeGironi && (

                      <div className="mt-5">

                        <p className="mb-2 text-sm text-slate-400">
                          Girone
                        </p>

                        <form
                          action={
                            modificaGironeSquadra
                          }
                          className="flex flex-col gap-2 sm:flex-row"
                        >

                          <input
                            type="hidden"
                            name="partecipazioneId"
                            value={
                              partecipazione.id
                            }
                          />

                          <input
                            type="hidden"
                            name="torneoId"
                            value={torneo.id}
                          />

                          <select
                            name="gironeId"
                            defaultValue={
                              partecipazione.gironeId
                                ? String(
                                    partecipazione.gironeId
                                  )
                                : ""
                            }
                            className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2"
                          >

                            <option value="">
                              Nessun girone
                            </option>

                            {torneo.gironi.map(
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

                          <button
                            type="submit"
                            className="rounded-xl bg-blue-600 px-4 py-2 font-bold transition hover:bg-blue-500"
                          >
                            Salva
                          </button>

                        </form>

                      </div>

                    )}

                    {/* =================================================
                        GESTIONE ROSA
                    ================================================= */}

                    <Link
                      href={`/tornei/${torneo.id}/calciatori`}
                      className="mt-5 block w-full rounded-xl bg-blue-600 px-4 py-3 text-center font-bold transition hover:bg-blue-500"
                    >
                      👥 Gestisci rosa
                    </Link>

                    {/* =================================================
                        RIMUOVI SQUADRA
                    ================================================= */}

                    <form
                      action={rimuoviSquadra}
                      className="mt-5"
                    >

                      <input
                        type="hidden"
                        name="partecipazioneId"
                        value={
                          partecipazione.id
                        }
                      />

                      <input
                        type="hidden"
                        name="torneoId"
                        value={torneo.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-red-600 px-4 py-3 font-bold transition hover:bg-red-500"
                      >
                        🗑️ Rimuovi squadra
                      </button>

                    </form>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* =====================================================
            RIEPILOGO GIRONI
        ===================================================== */}

        {prevedeGironi &&
          torneo.gironi.length > 0 && (

          <div className="mt-12">

            <h2 className="mb-5 text-2xl font-bold">
              Composizione gironi
            </h2>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              {torneo.gironi.map(
                (girone) => (

                  <div
                    key={girone.id}
                    className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                  >

                    <div className="mb-4 flex items-center justify-between">

                      <h3 className="text-xl font-bold">
                        {girone.nome}
                      </h3>

                      <span className="text-sm text-slate-400">
                        {
                          girone.partecipazioni.length
                        } / 4
                      </span>

                    </div>

                    {girone.partecipazioni.length ===
                    0 ? (

                      <p className="text-slate-500">
                        Nessuna squadra
                      </p>

                    ) : (

                      <div className="space-y-2">

                        {girone.partecipazioni.map(
                          (partecipazione) => (

                            <div
                              key={
                                partecipazione.id
                              }
                              className="rounded-xl bg-slate-800 px-3 py-2"
                            >
                              {
                                partecipazione.squadra.nome
                              }
                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </div>

    </main>
  );
}