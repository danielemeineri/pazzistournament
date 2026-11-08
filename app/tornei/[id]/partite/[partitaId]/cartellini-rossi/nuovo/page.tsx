import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { aggiungiCartellinoRosso } from "./actions";
import { isAdmin } from "@/lib/auth";

type Props = {
params: Promise<{
id: string;
partitaId: string;
}>;
};

export default async function NuovoCartellinoRossoPage({
params,
}: Props) {
const admin = await isAdmin();

if (!admin) {
  notFound();
}  
const { id, partitaId } = await params;

const torneoId = Number(id);

if (
!Number.isInteger(torneoId) ||
torneoId <= 0
) {
notFound();
}

let partitaIdBigInt: bigint;

try {
partitaIdBigInt = BigInt(partitaId);
} catch {
notFound();
}

// =========================================================
// TORNEO
// =========================================================

const torneo =
await prisma.torneo.findUnique({
where: {
id: torneoId,
},
});

if (!torneo) {
notFound();
}

// =========================================================
// PARTITA
// =========================================================

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

// =========================================================
// CONTROLLO TORNEO
// =========================================================

if (
partita.TorneoId !== torneoId
) {
notFound();
}

// =========================================================
// CALCIATORI DEL TORNEO
// =========================================================

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

// =========================================================
// ID SQUADRE DELLA PARTITA
// =========================================================

const squadraCasaId =
partita.SquadraCasaId;

const squadraOspiteId =
partita.SquadraOspiteId;

// =========================================================
// CALCIATORI DELLA SQUADRA DI CASA
// =========================================================

const calciatoriCasa =
calciatori.filter(
(calciatoreTorneo) =>
calciatoreTorneo.squadraId ===
squadraCasaId
);

// =========================================================
// CALCIATORI DELLA SQUADRA OSPITE
// =========================================================

const calciatoriOspite =
calciatori.filter(
(calciatoreTorneo) =>
calciatoreTorneo.squadraId ===
squadraOspiteId
);

return ( <main className="min-h-screen bg-slate-950 text-white p-8">

  <div className="max-w-3xl mx-auto">

    {/* ================================================= */}
    {/* TORNA ALLA PARTITA */}
    {/* ================================================= */}

    <Link
      href={`/tornei/${torneo.id}/partite/${partita.id.toString()}`}
      className="text-green-400 hover:text-green-300 transition"
    >
      ← Torna alla partita
    </Link>

    {/* ================================================= */}
    {/* INTESTAZIONE */}
    {/* ================================================= */}

    <div className="mt-8">

      <p className="text-slate-400">
        {torneo.nome}
      </p>

      <h1 className="text-3xl font-bold mt-1">
        🟥 Aggiungi cartellino rosso
      </h1>

      <p className="text-slate-400 mt-3">
        Puoi registrare l'espulsione anche se
        non conosci il calciatore o il minuto.
      </p>

    </div>

    {/* ================================================= */}
    {/* RIEPILOGO PARTITA */}
    {/* ================================================= */}

    <div className="mt-8 bg-slate-900 border border-slate-700 rounded-3xl p-6">

      <p className="text-center text-slate-400">
        {partita.Fase || "Partita"}
      </p>

      <div className="flex items-center justify-center gap-5 mt-5">

        {/* SQUADRA CASA */}

        <div className="flex-1 text-right">

          <p className="font-bold text-lg">
            {partita.squadraCasa?.nome ||
              "TBD"}
          </p>

        </div>

        {/* RISULTATO */}

        <div className="text-3xl font-black whitespace-nowrap">

          {partita.GolCasa ?? 0}

          <span className="text-slate-500 mx-2">
            -
          </span>

          {partita.GolOspite ?? 0}

        </div>

        {/* SQUADRA OSPITE */}

        <div className="flex-1 text-left">

          <p className="font-bold text-lg">
            {partita.squadraOspite?.nome ||
              "TBD"}
          </p>

        </div>

      </div>

    </div>

    {/* ================================================= */}
    {/* FORM CARTELLINO ROSSO */}
    {/* ================================================= */}

    <form
      action={aggiungiCartellinoRosso}
      className="mt-8 bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-6"
    >

      {/* ================================================= */}
      {/* ID TORNEO */}
      {/* ================================================= */}

      <input
        type="hidden"
        name="torneoId"
        value={torneo.id}
      />

      {/* ================================================= */}
      {/* ID PARTITA */}
      {/* ================================================= */}

      <input
        type="hidden"
        name="partitaId"
        value={partita.id.toString()}
      />

      {/* ================================================= */}
      {/* SQUADRA */}
      {/* ================================================= */}

      <div>

        <label
          htmlFor="squadraId"
          className="block text-sm font-bold text-slate-300 mb-2"
        >
          Squadra che ha ricevuto l'espulsione
        </label>

        <select
          id="squadraId"
          name="squadraId"
          required
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white"
        >

          <option value="">
            Seleziona squadra
          </option>

          {partita.squadraCasa && (
            <option
              value={
                partita.squadraCasa.id
              }
            >
              {partita.squadraCasa.nome}
            </option>
          )}

          {partita.squadraOspite && (
            <option
              value={
                partita.squadraOspite.id
              }
            >
              {partita.squadraOspite.nome}
            </option>
          )}

        </select>

      </div>

      {/* ================================================= */}
      {/* CALCIATORE */}
      {/* ================================================= */}

      <div>

        <label
          htmlFor="calciatoreTorneoId"
          className="block text-sm font-bold text-slate-300 mb-2"
        >
          Calciatore espulso
        </label>

        <select
          id="calciatoreTorneoId"
          name="calciatoreTorneoId"
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white"
        >

          <option value="">
            Non specificato
          </option>

          {/* CALCIATORI CASA */}

          {partita.squadraCasa && (
            <optgroup
              label={
                partita.squadraCasa.nome
              }
            >

              {calciatoriCasa.map(
                (
                  calciatoreTorneo
                ) => (

                  <option
                    key={
                      calciatoreTorneo.id
                    }
                    value={
                      calciatoreTorneo.id
                    }
                  >
                    {
                      calciatoreTorneo
                        .calciatore.nome
                    }
                  </option>

                )
              )}

            </optgroup>
          )}

          {/* CALCIATORI OSPITE */}

          {partita.squadraOspite && (
            <optgroup
              label={
                partita.squadraOspite.nome
              }
            >

              {calciatoriOspite.map(
                (
                  calciatoreTorneo
                ) => (

                  <option
                    key={
                      calciatoreTorneo.id
                    }
                    value={
                      calciatoreTorneo.id
                    }
                  >
                    {
                      calciatoreTorneo
                        .calciatore.nome
                    }
                  </option>

                )
              )}

            </optgroup>
          )}

        </select>

        <p className="text-xs text-slate-500 mt-2">
          Lascia "Non specificato" se non sai
          chi è stato espulso.
        </p>

      </div>

      {/* ================================================= */}
      {/* MINUTO */}
      {/* ================================================= */}

      <div>

        <label
          htmlFor="minuto"
          className="block text-sm font-bold text-slate-300 mb-2"
        >
          Minuto dell'espulsione
        </label>

        <input
          id="minuto"
          name="minuto"
          type="number"
          min="1"
          max="130"
          placeholder="Es. 72 — lascia vuoto se sconosciuto"
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white"
        />

        <p className="text-xs text-slate-500 mt-2">
          Lascia vuoto se non conosci il minuto
          dell'espulsione.
        </p>

      </div>

      {/* ================================================= */}
      {/* SALVA */}
      {/* ================================================= */}

      <button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-500 rounded-xl px-6 py-4 font-bold text-lg transition"
      >
        🟥 Registra cartellino rosso
      </button>

    </form>

  </div>

</main>

);
}
