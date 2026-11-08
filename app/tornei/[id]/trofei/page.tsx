import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import {
  eliminaTrofeoManuale,
  salvaTrofeoManuale,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const premiManuali = [
  {
    tipo: "MIGLIOR_ASSISTMAN",
    nome: "Miglior assistman",
    icona: "🎯",
    descrizione:
      "Il giocatore che ha fornito più assist o le migliori prestazioni negli assist.",
  },
  {
    tipo: "MIGLIOR_PORTIERE",
    nome: "Miglior portiere",
    icona: "🧤",
    descrizione:
      "Il portiere protagonista del torneo.",
  },
  {
    tipo: "MVP",
    nome: "MVP",
    icona: "⭐",
    descrizione:
      "Il miglior giocatore assoluto del torneo.",
  },
  {
    tipo: "MIGLIOR_MOMENTO",
    nome: "Miglior momento",
    icona: "🔥",
    descrizione:
      "Il momento più memorabile del torneo.",
  },
] as const;

export default async function GestioneTrofeiPage({
  params,
}: Props) {
  const { id } = await params;

  const torneoId = Number(id);

  if (!Number.isInteger(torneoId)) {
    notFound();
  }

  const admin = await isAdmin();

  if (!admin) {
    redirect(`/tornei/${torneoId}`);
  }

  const torneo = await prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },

    include: {
      calciatori: {
        orderBy: {
          calciatore: {
            nome: "asc",
          },
        },

        include: {
          calciatore: true,
          squadra: true,
        },
      },

      trofei: {
        where: {
          tipo: {
            in: [
              "MIGLIOR_ASSISTMAN",
              "MIGLIOR_PORTIERE",
              "MVP",
              "MIGLIOR_MOMENTO",
            ],
          },
        },

        include: {
          calciatoreVincitore: {
            include: {
              calciatore: true,
              squadra: true,
            },
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
      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href={`/tornei/${torneo.id}`}
          className="inline-flex text-sm font-semibold text-green-400 transition hover:text-green-300"
        >
          ← Torna al torneo
        </Link>

        <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-yellow-400">
          PazziTournament
        </p>

        <h1 className="mt-3 text-4xl font-black sm:text-5xl">
          🏆 Gestione trofei
        </h1>

        <p className="mt-3 text-slate-400">
          {torneo.nome} · {torneo.anno}
        </p>

        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-sm leading-6 text-blue-200">
          <strong>ℹ️ Premi manuali</strong>
          <br />
          Questi quattro premi vengono assegnati manualmente
          dall'amministratore e non vengono modificati dal
          motore automatico dei trofei.
        </div>
      </div>

      {/* ===================================================== */}
      {/* CONTENUTO */}
      {/* ===================================================== */}

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 lg:grid-cols-2">
          {premiManuali.map((premio) => {
            const trofeo = torneo.trofei.find(
              (item) => item.tipo === premio.tipo
            );

            const giocatore =
              trofeo?.calciatoreVincitore;

            const isMomento =
              premio.tipo === "MIGLIOR_MOMENTO";

            return (
              <div
                key={premio.tipo}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl"
              >
                {/* ================================================= */}
                {/* HEADER PREMIO */}
                {/* ================================================= */}

                <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 text-4xl">
                      {premio.icona}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                        Premio manuale
                      </p>

                      <h2 className="mt-1 text-2xl font-black">
                        {premio.nome}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {premio.descrizione}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ================================================= */}
                {/* PREMIO ATTUALE */}
                {/* ================================================= */}

                {trofeo && (
                  <div className="border-b border-slate-800 bg-green-500/5 p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                      Premio attualmente assegnato
                    </p>

                    {giocatore && (
                      <div className="mt-3">
                        <p className="text-xl font-black">
                          {giocatore.calciatore.nome}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {giocatore.squadra.nome}
                        </p>
                      </div>
                    )}

                    {isMomento && trofeo.nota && (
                      <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                        {trofeo.nota}
                      </p>
                    )}
                  </div>
                )}

                {/* ================================================= */}
                {/* FORM */}
                {/* ================================================= */}

                <form
                  action={salvaTrofeoManuale}
                  className="space-y-5 p-6"
                >
                  <input
                    type="hidden"
                    name="torneoId"
                    value={torneo.id}
                  />

                  <input
                    type="hidden"
                    name="tipo"
                    value={premio.tipo}
                  />

                  {!isMomento ? (
                    <div>
                      <label
                        htmlFor={`giocatore-${premio.tipo}`}
                        className="mb-2 block text-sm font-bold text-slate-300"
                      >
                        Seleziona giocatore
                      </label>

                      {torneo.calciatori.length === 0 ? (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                          <p className="font-bold text-red-400">
                            Nessun giocatore disponibile
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-400">
                            Non risultano giocatori associati a
                            questo torneo. Prima di assegnare
                            questo premio è necessario avere
                            almeno un calciatore nel torneo.
                          </p>
                        </div>
                      ) : (
                        <select
                          id={`giocatore-${premio.tipo}`}
                          name="calciatoreTorneoId"
                          required
                          defaultValue={
                            trofeo?.calciatoreVincitore?.id ??
                            ""
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        >
                          <option value="">
                            Seleziona un giocatore...
                          </option>

                          {torneo.calciatori.map(
                            (calciatoreTorneo) => (
                              <option
                                key={calciatoreTorneo.id}
                                value={calciatoreTorneo.id}
                              >
                                {
                                  calciatoreTorneo.calciatore
                                    .nome
                                }{" "}
                                —{" "}
                                {
                                  calciatoreTorneo.squadra
                                    .nome
                                }
                              </option>
                            )
                          )}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor={`nota-${premio.tipo}`}
                        className="mb-2 block text-sm font-bold text-slate-300"
                      >
                        Descrizione del momento
                      </label>

                      <textarea
                        id={`nota-${premio.tipo}`}
                        name="nota"
                        required
                        defaultValue={trofeo?.nota ?? ""}
                        rows={5}
                        placeholder="Es. La rimonta incredibile nella semifinale..."
                        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      !isMomento &&
                      torneo.calciatori.length === 0
                    }
                    className="w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {trofeo
                      ? "💾 Aggiorna premio"
                      : "🏆 Assegna premio"}
                  </button>
                </form>

                {/* ================================================= */}
                {/* ELIMINA */}
                {/* ================================================= */}

                {trofeo && (
                  <form
                    action={eliminaTrofeoManuale}
                    className="border-t border-slate-800 p-6"
                  >
                    <input
                      type="hidden"
                      name="torneoId"
                      value={torneo.id}
                    />

                    <input
                      type="hidden"
                      name="tipo"
                      value={premio.tipo}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 text-sm font-bold text-red-400 transition hover:border-red-500 hover:bg-red-500/10"
                    >
                      🗑️ Rimuovi premio
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* ===================================================== */}
        {/* TORNA AL TORNEO */}
        {/* ===================================================== */}

        <div className="mt-10 text-center">
          <Link
            href={`/tornei/${torneo.id}`}
            className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 font-bold transition hover:border-green-500 hover:bg-slate-800"
          >
            ← Torna alla pagina del torneo
          </Link>
        </div>
      </div>
    </main>
  );
}