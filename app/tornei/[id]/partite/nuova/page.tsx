import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import NuovaPartitaForm from "./NuovaPartitaForm";

export default async function NuovaPartitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          girone: true,
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

  const squadre = torneo.partecipazioni
    .map(
      (partecipazione) =>
        partecipazione.squadra
    )
    .sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-xl">

        {/* ================================================= */}
        {/* TORNA AL TORNEO */}
        {/* ================================================= */}

        <Link
          href={`/tornei/${torneo.id}`}
          className="text-green-400 hover:underline"
        >
          ← {torneo.nome}
        </Link>

        {/* ================================================= */}
        {/* TITOLO */}
        {/* ================================================= */}

        <div className="mt-8">
          <h1 className="text-3xl font-bold">
            Nuova partita
          </h1>

          <p className="mt-2 text-slate-400">
            Inserisci i dati della partita
            del torneo.
          </p>
        </div>

        {/* ================================================= */}
        {/* SQUADRE INSUFFICIENTI */}
        {/* ================================================= */}

        {squadre.length < 2 ? (

          <div className="mt-8 rounded-2xl border border-red-700 bg-red-900/30 p-6">

            <h2 className="text-xl font-bold">
              Squadre insufficienti
            </h2>

            <p className="mt-2 text-red-200">
              Per creare una partita devi avere
              almeno due squadre partecipanti
              al torneo.
            </p>

          </div>

        ) : (

          <NuovaPartitaForm
            torneo={{
              id: torneo.id,
              nome: torneo.nome,
              formula: torneo.formula,
              andataRitorno:
                torneo.andataRitorno,
            }}
            squadre={squadre}
            gironi={torneo.gironi}
          />

        )}

      </div>
    </main>
  );
}