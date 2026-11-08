import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SelezionaCalciatore from "@/components/SelezionaCalciatore";

import {
  aggiungiCalciatore,
  eliminaCalciatore,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CalciatoriPage({
  params,
}: Props) {
  const { id } = await params;

  const torneoId = Number(id);

  if (!Number.isInteger(torneoId)) {
    notFound();
  }

  /* ==========================================================
     RECUPERA TORNEO
  ========================================================== */

  const torneo = await prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },

    include: {
      partecipazioni: {
        include: {
          squadra: {
            include: {
              calciatori: {
                where: {
                  torneoId,
                },

                include: {
                  calciatore: true,
                },

                orderBy: {
                  calciatore: {
                    nome: "asc",
                  },
                },
              },
            },
          },

          partecipante: true,
        },

        orderBy: {
          squadra: {
            nome: "asc",
          },
        },
      },
    },
  });

  if (!torneo) {
    notFound();
  }

  /* ==========================================================
     RECUPERA TUTTI I CALCIATORI ESISTENTI

     IMPORTANTE:
     Qui NON filtriamo più per videogioco.

     Vengono recuperati direttamente tutti i calciatori
     presenti nella tabella Calciatore.

     Quindi:
     - FIFA 17
     - FIFA 18
     - FIFA 19
     - FC
     - ecc.

     saranno tutti disponibili nel menu "Calciatore esistente".
  ========================================================== */

  const calciatoriDisponibili =
    await prisma.calciatore.findMany({
      select: {
        id: true,
        nome: true,
      },

      orderBy: {
        nome: "asc",
      },
    });

  /* ==========================================================
     NUMERO CALCIATORI TOTALI
  ========================================================== */

  const totaleCalciatori =
    torneo.partecipazioni.reduce(
      (totale, partecipazione) =>
        totale +
        partecipazione.squadra.calciatori.length,
      0
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-green-950/30">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <Link
            href={`/tornei/${torneo.id}/squadre`}
            className="text-sm font-semibold text-green-400 transition hover:text-green-300"
          >
            ← Torna a squadre e gironi
          </Link>

          <div className="mt-8">

            <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-400">
              PazziTournament
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              👥 Gestione rose
            </h1>

            <p className="mt-3 text-slate-400">
              Gestisci i calciatori di tutte le squadre
              partecipanti al torneo.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">

              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm">
                🏆 {torneo.nome}
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm">
                🌍 {torneo.tipo}
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm">
                📅 {torneo.anno}
              </span>

              {torneo.videogioco && (
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm">
                  🎮 {torneo.videogioco}
                </span>
              )}

            </div>

          </div>

        </div>

      </section>

      {/* ======================================================
          CONTENUTO
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* ====================================================
            RIEPILOGO
        ==================================================== */}

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Squadre partecipanti
            </p>

            <p className="mt-2 text-3xl font-black">
              {torneo.partecipazioni.length}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Calciatori registrati
            </p>

            <p className="mt-2 text-3xl font-black text-green-400">
              {totaleCalciatori}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Formula torneo
            </p>

            <p className="mt-2 text-lg font-bold">
              {torneo.formula}
            </p>

          </div>

        </section>

        {/* ====================================================
            NESSUNA SQUADRA
        ==================================================== */}

        {torneo.partecipazioni.length === 0 ? (

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">

            <div className="text-6xl">
              ⚽
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Nessuna squadra inserita
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Prima di gestire le rose devi inserire
              le squadre partecipanti al torneo.
            </p>

            <Link
              href={`/tornei/${torneo.id}/squadre`}
              className="mt-7 inline-flex rounded-xl bg-green-600 px-6 py-3 font-bold transition hover:bg-green-500"
            >
              ⚙️ Gestisci squadre
            </Link>

          </div>

        ) : (

          <section>

            <div className="mb-7">

              <p className="text-sm font-bold uppercase tracking-widest text-green-400">
                Rose squadre
              </p>

              <h2 className="mt-2 text-3xl font-black">
                ⚽ Calciatori
              </h2>

              <p className="mt-2 text-slate-400">
                Aggiungi o rimuovi i calciatori
                associati alle singole squadre.
              </p>

            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {torneo.partecipazioni.map(
                (partecipazione) => {

                  const squadra =
                    partecipazione.squadra;

                  const calciatori =
                    squadra.calciatori;

                  /*
                   * ID dei giocatori già presenti
                   * nella rosa della squadra.
                   */

                  const calciatoriGiaPresenti =
                    new Set(
                      calciatori.map(
                        (elemento) =>
                          elemento.calciatore.id
                      )
                    );

                  /*
                   * Tutti i calciatori del database.
                   *
                   * Prima vengono mostrati quelli
                   * già presenti nella rosa.
                   *
                   * Tutti gli altri vengono mostrati
                   * normalmente e possono essere selezionati.
                   */

                  const calciatoriOrdinati =
                    [...calciatoriDisponibili].sort(
                      (a, b) => {

                        const aPresente =
                          calciatoriGiaPresenti.has(
                            a.id
                          );

                        const bPresente =
                          calciatoriGiaPresenti.has(
                            b.id
                          );

                        if (
                          aPresente &&
                          !bPresente
                        ) {
                          return -1;
                        }

                        if (
                          !aPresente &&
                          bPresente
                        ) {
                          return 1;
                        }

                        return a.nome.localeCompare(
                          b.nome,
                          "it"
                        );
                      }
                    );

                  return (

                    <div
                      key={partecipazione.id}
                      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl"
                    >

                      {/* HEADER SQUADRA */}

                      <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-green-950/20 p-6">

                        <div className="flex items-center gap-4">

                          {squadra.stemma ? (

                            <img
                              src={squadra.stemma}
                              alt={squadra.nome}
                              className="h-14 w-14 object-contain"
                            />

                          ) : (

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
                              ⚽
                            </div>

                          )}

                          <div className="min-w-0">

                            <h3 className="truncate text-xl font-black">
                              {squadra.nome}
                            </h3>

                            <p className="mt-1 text-sm text-slate-400">
                              {partecipazione.partecipante?.nome ||
                                "Giocatore non assegnato"}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* CORPO */}

                      <div className="p-6">

                        <div className="mb-5 flex items-center justify-between">

                          <span className="text-sm font-semibold text-slate-400">
                            Rosa
                          </span>

                          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-green-400">
                            {calciatori.length} calciatori
                          </span>

                        </div>

                        {/* LISTA CALCIATORI */}

                        <div className="mb-6 space-y-2">

                          {calciatori.length === 0 ? (

                            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-center">

                              <p className="text-sm text-slate-500">
                                Nessun calciatore inserito.
                              </p>

                            </div>

                          ) : (

                            calciatori.map(
                              (elemento) => (

                                <div
                                  key={elemento.id}
                                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                                >

                                  <div className="flex items-center gap-3">

                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm">
                                      ⚽
                                    </span>

                                    <span className="font-semibold">
                                      {
                                        elemento
                                          .calciatore
                                          .nome
                                      }
                                    </span>

                                  </div>

                                  <form
                                    action={
                                      eliminaCalciatore
                                    }
                                  >

                                    <input
                                      type="hidden"
                                      name="id"
                                      value={
                                        elemento.id
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="torneoId"
                                      value={
                                        torneo.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      title="Rimuovi calciatore"
                                      className="rounded-lg px-3 py-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                                    >
                                      🗑️
                                    </button>

                                  </form>

                                </div>

                              )
                            )

                          )}

                        </div>

                        {/* AGGIUNGI CALCIATORE */}

                        <form
                          action={
                            aggiungiCalciatore
                          }
                          className="space-y-3"
                        >

                          <input
                            type="hidden"
                            name="torneoId"
                            value={torneo.id}
                          />

                          <input
                            type="hidden"
                            name="squadraId"
                            value={squadra.id}
                          />

                          <div>

                            <SelezionaCalciatore
  calciatori={calciatoriOrdinati}
  calciatoriGiaPresenti={calciatori.map(
    (elemento) => elemento.calciatore.id
  )}
/>

                          </div>

                          <div className="border-t border-slate-800 pt-3">

                            <label className="mb-2 block text-sm font-semibold">
                              Oppure crea nuovo calciatore
                            </label>

                            <input
                              type="text"
                              name="nome"
                              placeholder="Nome nuovo calciatore"
                              autoComplete="off"
                              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                            />

                          </div>

                          <button
                            type="submit"
                            className="w-full rounded-xl bg-green-600 px-4 py-3 font-bold transition hover:bg-green-500"
                          >
                            ➕ Aggiungi calciatore
                          </button>

                        </form>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

            <div className="mt-12 border-t border-slate-800 pt-8">

              <Link
                href={`/tornei/${torneo.id}/squadre`}
                className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-bold transition hover:border-green-500 hover:bg-slate-800"
              >
                ⚙️ Torna a squadre e gironi
              </Link>

            </div>

          </section>

        )}

      </div>

    </main>
  );
}