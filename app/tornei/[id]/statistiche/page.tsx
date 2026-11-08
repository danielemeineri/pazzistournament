import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type StatisticaSquadra = {
  id: number;
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

export default async function StatisticheTorneoPage({
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
      partite: {
        where: {
          Completata: true,
        },

        orderBy: [
          {
            dataPartita: "asc",
          },
          {
            OraPartita: "asc",
          },
        ],

        include: {
          squadraCasa: true,
          squadraOspite: true,

          gol: {
            where: {
              tipo: {
                not: "AUTOGOL",
              },
            },

            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                  squadra: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!torneo) {
    notFound();
  }

  // =========================================================
  // STATISTICHE GENERALI
  // =========================================================

  const partite = torneo.partite;

  const partiteGiocate = partite.length;

  const golTotali = partite.reduce(
    (totale, partita) =>
      totale +
      (partita.GolCasa ?? 0) +
      (partita.GolOspite ?? 0),
    0
  );

  const golCasa = partite.reduce(
    (totale, partita) =>
      totale + (partita.GolCasa ?? 0),
    0
  );

  const golOspite = partite.reduce(
    (totale, partita) =>
      totale + (partita.GolOspite ?? 0),
    0
  );

  const mediaGol =
    partiteGiocate > 0
      ? (golTotali / partiteGiocate).toFixed(2)
      : "0.00";

  let vittorieCasa = 0;
  let vittorieOspite = 0;
  let pareggi = 0;

  for (const partita of partite) {
    const casa = partita.GolCasa ?? 0;
    const ospite = partita.GolOspite ?? 0;

    if (casa > ospite) {
      vittorieCasa++;
    } else if (ospite > casa) {
      vittorieOspite++;
    } else {
      pareggi++;
    }
  }

  // =========================================================
  // PARTITA CON PIÙ GOL
  // =========================================================

  const partitaConPiuGol =
    partite.length > 0
      ? [...partite].sort((a, b) => {
          const golA =
            (a.GolCasa ?? 0) +
            (a.GolOspite ?? 0);

          const golB =
            (b.GolCasa ?? 0) +
            (b.GolOspite ?? 0);

          return golB - golA;
        })[0]
      : null;

  const numeroGolPartitaRecord =
    partitaConPiuGol
      ? (partitaConPiuGol.GolCasa ?? 0) +
        (partitaConPiuGol.GolOspite ?? 0)
      : 0;

  // =========================================================
  // STATISTICHE SQUADRE
  // =========================================================

  const squadre = new Map<
    number,
    StatisticaSquadra
  >();

  for (const partita of partite) {
    const casa = partita.squadraCasa;
    const ospite = partita.squadraOspite;

    if (casa) {
      if (!squadre.has(casa.id)) {
        squadre.set(casa.id, {
          id: casa.id,
          nome: casa.nome,
          stemma: casa.stemma,
          partite: 0,
          vittorie: 0,
          pareggi: 0,
          sconfitte: 0,
          golFatti: 0,
          golSubiti: 0,
          differenzaReti: 0,
          punti: 0,
        });
      }
    }

    if (ospite) {
      if (!squadre.has(ospite.id)) {
        squadre.set(ospite.id, {
          id: ospite.id,
          nome: ospite.nome,
          stemma: ospite.stemma,
          partite: 0,
          vittorie: 0,
          pareggi: 0,
          sconfitte: 0,
          golFatti: 0,
          golSubiti: 0,
          differenzaReti: 0,
          punti: 0,
        });
      }
    }

    if (!casa || !ospite) {
      continue;
    }

    const statisticheCasa =
      squadre.get(casa.id)!;

    const statisticheOspite =
      squadre.get(ospite.id)!;

    const golCasaPartita =
      partita.GolCasa ?? 0;

    const golOspitePartita =
      partita.GolOspite ?? 0;

    statisticheCasa.partite++;
    statisticheOspite.partite++;

    statisticheCasa.golFatti +=
      golCasaPartita;

    statisticheCasa.golSubiti +=
      golOspitePartita;

    statisticheOspite.golFatti +=
      golOspitePartita;

    statisticheOspite.golSubiti +=
      golCasaPartita;

    if (golCasaPartita > golOspitePartita) {
      statisticheCasa.vittorie++;
      statisticheCasa.punti += 3;

      statisticheOspite.sconfitte++;
    } else if (
      golCasaPartita < golOspitePartita
    ) {
      statisticheOspite.vittorie++;
      statisticheOspite.punti += 3;

      statisticheCasa.sconfitte++;
    } else {
      statisticheCasa.pareggi++;
      statisticheOspite.pareggi++;

      statisticheCasa.punti++;
      statisticheOspite.punti++;
    }
  }

  const classificaSquadre = Array.from(
    squadre.values()
  ).map((squadra) => ({
    ...squadra,
    differenzaReti:
      squadra.golFatti -
      squadra.golSubiti,
  }));

  classificaSquadre.sort((a, b) => {
    if (b.punti !== a.punti) {
      return b.punti - a.punti;
    }

    if (
      b.differenzaReti !==
      a.differenzaReti
    ) {
      return (
        b.differenzaReti -
        a.differenzaReti
      );
    }

    if (b.golFatti !== a.golFatti) {
      return b.golFatti - a.golFatti;
    }

    return a.nome.localeCompare(b.nome);
  });

  // =========================================================
  // CLASSIFICA MARCATORI
  // =========================================================

  const marcatori = new Map<
    number,
    {
      id: number;
      nome: string;
      gol: number;
      squadre: string[];
    }
  >();

  for (const partita of partite) {
    for (const gol of partita.gol) {
      if (gol.tipo === "AUTOGOL") {
        continue;
      }

      const calciatore =
        gol.calciatoreTorneo.calciatore;

      const squadra =
        gol.calciatoreTorneo.squadra;

      const esistente =
        marcatori.get(calciatore.id);

      if (esistente) {
        esistente.gol++;

        if (
          !esistente.squadre.includes(
            squadra.nome
          )
        ) {
          esistente.squadre.push(
            squadra.nome
          );
        }
      } else {
        marcatori.set(calciatore.id, {
          id: calciatore.id,
          nome: calciatore.nome,
          gol: 1,
          squadre: [squadra.nome],
        });
      }
    }
  }

  const classificaMarcatori =
    Array.from(
      marcatori.values()
    ).sort((a, b) => {
      if (b.gol !== a.gol) {
        return b.gol - a.gol;
      }

      return a.nome.localeCompare(
        b.nome
      );
    });

  // =========================================================
  // MIGLIOR ATTACCO / MIGLIOR DIFESA
  // =========================================================

  const migliorAttacco =
    [...classificaSquadre].sort(
      (a, b) =>
        b.golFatti - a.golFatti
    )[0] ?? null;

  const migliorDifesa =
    [...classificaSquadre].sort(
      (a, b) =>
        a.golSubiti - b.golSubiti
    )[0] ?? null;

  return (
    <main className="min-h-screen">

      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}

      <div className="relative overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-12">

          <Link
            href={`/tornei/${torneo.id}`}
            className="mb-8 inline-flex text-sm font-semibold text-green-400 transition hover:text-green-300"
          >
            ← Torna al torneo
          </Link>

          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-green-400">
            PazziTournament
          </p>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            📊 Statistiche
          </h1>

          <p className="mt-3 text-xl font-bold text-slate-300">
            {torneo.nome}
          </p>

          <p className="mt-2 max-w-3xl text-slate-400">
            Tutte le statistiche del torneo,
            calcolate automaticamente dai
            risultati registrati.
          </p>

        </div>

      </div>

      <div className="mx-auto max-w-7xl px-6 pb-16">

        {/* ===================================================== */}
        {/* STATISTICHE GENERALI */}
        {/* ===================================================== */}

        <section className="mb-12">

          <div className="mb-8">

            <p className="text-sm font-bold uppercase tracking-widest text-green-400">
              Numeri del torneo
            </p>

            <h2 className="mt-2 text-3xl font-black">
              📈 Statistiche generali
            </h2>

          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Partite giocate
              </p>

              <p className="mt-2 text-4xl font-black">
                {partiteGiocate}
              </p>

            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Gol totali
              </p>

              <p className="mt-2 text-4xl font-black text-green-400">
                {golTotali}
              </p>

            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Media gol / partita
              </p>

              <p className="mt-2 text-4xl font-black">
                {mediaGol}
              </p>

            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Pareggi
              </p>

              <p className="mt-2 text-4xl font-black text-yellow-400">
                {pareggi}
              </p>

            </div>

          </div>

        </section>

        {/* ===================================================== */}
        {/* CASA / TRASFERTA */}
        {/* ===================================================== */}

        <section className="mb-12">

          <div className="grid gap-5 md:grid-cols-3">

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                🏠 Gol in casa
              </p>

              <p className="mt-2 text-4xl font-black">
                {golCasa}
              </p>

              <p className="mt-2 text-sm text-green-400">
                {vittorieCasa} vittorie
              </p>

            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                ✈️ Gol in trasferta
              </p>

              <p className="mt-2 text-4xl font-black">
                {golOspite}
              </p>

              <p className="mt-2 text-sm text-green-400">
                {vittorieOspite} vittorie
              </p>

            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                🤝 Pareggi
              </p>

              <p className="mt-2 text-4xl font-black text-yellow-400">
                {pareggi}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Partite terminate in parità
              </p>

            </div>

          </div>

        </section>

        {/* ===================================================== */}
        {/* RECORD */}
        {/* ===================================================== */}

        <section className="mb-12">

          <div className="mb-8">

            <p className="text-sm font-bold uppercase tracking-widest text-yellow-400">
              Record
            </p>

            <h2 className="mt-2 text-3xl font-black">
              🔥 Numeri da record
            </h2>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            <div className="rounded-3xl border border-yellow-500/20 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                🔥 Partita con più gol
              </p>

              {partitaConPiuGol ? (
                <>
                  <p className="mt-4 text-lg font-black">
                    {partitaConPiuGol.squadraCasa?.nome ||
                      "TBD"}
                    {" "}
                    <span className="text-green-400">
                      {partitaConPiuGol.GolCasa}
                      {" - "}
                      {partitaConPiuGol.GolOspite}
                    </span>
                    {" "}
                    {partitaConPiuGol.squadraOspite?.nome ||
                      "TBD"}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {numeroGolPartitaRecord} gol
                  </p>
                </>
              ) : (
                <p className="mt-4 text-slate-600">
                  Nessuna partita
                </p>
              )}

            </div>

            <div className="rounded-3xl border border-green-500/20 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                ⚽ Miglior attacco
              </p>

              {migliorAttacco ? (
                <>
                  <p className="mt-4 text-xl font-black">
                    {migliorAttacco.nome}
                  </p>

                  <p className="mt-2 text-3xl font-black text-green-400">
                    {migliorAttacco.golFatti}
                  </p>

                  <p className="text-sm text-slate-500">
                    gol segnati
                  </p>
                </>
              ) : (
                <p className="mt-4 text-slate-600">
                  Nessun dato
                </p>
              )}

            </div>

            <div className="rounded-3xl border border-blue-500/20 bg-slate-900 p-6">

              <p className="text-sm text-slate-400">
                🧤 Miglior difesa
              </p>

              {migliorDifesa ? (
                <>
                  <p className="mt-4 text-xl font-black">
                    {migliorDifesa.nome}
                  </p>

                  <p className="mt-2 text-3xl font-black text-blue-400">
                    {migliorDifesa.golSubiti}
                  </p>

                  <p className="text-sm text-slate-500">
                    gol subiti
                  </p>
                </>
              ) : (
                <p className="mt-4 text-slate-600">
                  Nessun dato
                </p>
              )}

            </div>

          </div>

        </section>

        {/* ===================================================== */}
        {/* CLASSIFICA SQUADRE */}
        {/* ===================================================== */}

        <section className="mb-12">

          <div className="mb-8">

            <p className="text-sm font-bold uppercase tracking-widest text-green-400">
              Squadre
            </p>

            <h2 className="mt-2 text-3xl font-black">
              🏆 Rendimento delle squadre
            </h2>

          </div>

          {classificaSquadre.length === 0 ? (

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">

              <p className="text-lg font-bold">
                Nessuna statistica disponibile
              </p>

            </div>

          ) : (

            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-sm">

                  <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">

                    <tr>

                      <th className="px-5 py-4 text-center">
                        #
                      </th>

                      <th className="px-5 py-4 text-left">
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
                        P
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

                      <th className="px-5 py-4 text-center">
                        PT
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-800">

                    {classificaSquadre.map(
                      (squadra, index) => (

                        <tr
                          key={squadra.id}
                          className="transition hover:bg-slate-800/60"
                        >

                          <td className="px-5 py-5 text-center">

                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                                index === 0
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : index === 1
                                  ? "bg-zinc-400/20 text-zinc-200"
                                  : index === 2
                                  ? "bg-orange-500/20 text-orange-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {index + 1}
                            </span>

                          </td>

                          <td className="px-5 py-5">

                            <div className="flex items-center gap-3">

                              {squadra.stemma ? (
                                <img
                                  src={squadra.stemma}
                                  alt={squadra.nome}
                                  className="h-9 w-9 object-contain"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
                                  ⚽
                                </div>
                              )}

                              <span className="font-bold">
                                {squadra.nome}
                              </span>

                            </div>

                          </td>

                          <td className="px-3 py-5 text-center">
                            {squadra.partite}
                          </td>

                          <td className="px-3 py-5 text-center text-green-400">
                            {squadra.vittorie}
                          </td>

                          <td className="px-3 py-5 text-center">
                            {squadra.pareggi}
                          </td>

                          <td className="px-3 py-5 text-center text-red-400">
                            {squadra.sconfitte}
                          </td>

                          <td className="px-3 py-5 text-center">
                            {squadra.golFatti}
                          </td>

                          <td className="px-3 py-5 text-center">
                            {squadra.golSubiti}
                          </td>

                          <td className="px-3 py-5 text-center font-semibold">
                            {squadra.differenzaReti > 0
                              ? `+${squadra.differenzaReti}`
                              : squadra.differenzaReti}
                          </td>

                          <td className="px-5 py-5 text-center">

                            <span className="text-xl font-black text-yellow-400">
                              {squadra.punti}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </section>

        {/* ===================================================== */}
        {/* MARCATORI */}
        {/* ===================================================== */}

        <section>

          <div className="mb-8">

            <p className="text-sm font-bold uppercase tracking-widest text-yellow-400">
              Giocatori
            </p>

            <h2 className="mt-2 text-3xl font-black">
              ⚽ Classifica marcatori
            </h2>

          </div>

          {classificaMarcatori.length === 0 ? (

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">

              <p className="text-lg font-bold">
                Nessun gol registrato
              </p>

            </div>

          ) : (

            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[600px] text-sm">

                  <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">

                    <tr>

                      <th className="px-6 py-4 text-center">
                        #
                      </th>

                      <th className="px-6 py-4 text-left">
                        Giocatore
                      </th>

                      <th className="px-6 py-4 text-left">
                        Squadra
                      </th>

                      <th className="px-6 py-4 text-center">
                        Gol
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-800">

                    {classificaMarcatori.map(
                      (marcatore, index) => (

                        <tr
                          key={marcatore.id}
                          className="transition hover:bg-slate-800/60"
                        >

                          <td className="px-6 py-5 text-center">

                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                                index === 0
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : index === 1
                                  ? "bg-zinc-400/20 text-zinc-200"
                                  : index === 2
                                  ? "bg-orange-500/20 text-orange-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {index + 1}
                            </span>

                          </td>

                          <td className="px-6 py-5">

                            <span className="font-bold">
                              {marcatore.nome}
                            </span>

                          </td>

                          <td className="px-6 py-5 text-slate-400">
                            {marcatore.squadre.join(
                              " / "
                            )}
                          </td>

                          <td className="px-6 py-5 text-center">

                            <span className="text-2xl font-black text-green-400">
                              {marcatore.gol}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}