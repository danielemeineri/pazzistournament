
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { modificaPartita } from "./actions";
import Link from "next/link";

export default async function ModificaPartitaPage({
  params,
}: {
  params: Promise<{
    id: string;
    partitaId: string;
  }>;
}) {
  await requireAdmin();

  const { id, partitaId } = await params;
  const torneoId = Number(id);

  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    notFound();
  }

  let partitaIdNumero: bigint;

  try {
    partitaIdNumero = BigInt(partitaId);
  } catch {
    notFound();
  }

  const partita = await prisma.partita.findFirst({
    where: {
      id: partitaIdNumero,
      TorneoId: torneoId,
    },
  });

  if (!partita) {
    notFound();
  }

  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
  });

  if (!torneo) {
    notFound();
  }

  const squadre = await prisma.partecipazione.findMany({
    where: { torneoId },
    include: { squadra: true },
    orderBy: {
      squadra: { nome: "asc" },
    },
  });

  const partecipanti = await prisma.partecipante.findMany({
    select: {
      id: true,
      nome: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  const partecipantiPerId = new Map(
    partecipanti.map((p) => [p.id, p.nome])
  );

  const partecipazioneCasa = squadre.find(
    (p) => p.squadraId === partita.SquadraCasaId
  );

  const partecipazioneOspite = squadre.find(
    (p) => p.squadraId === partita.SquadraOspiteId
  );

  const titolareCasaId = partecipazioneCasa?.partecipanteId ?? null;
  const titolareOspiteId = partecipazioneOspite?.partecipanteId ?? null;

  const dataFormattata = partita.dataPartita
    ? partita.dataPartita.toISOString().split("T")[0]
    : "";

  const oraFormattata = partita.OraPartita
  ? `${String(partita.OraPartita.getHours()).padStart(2, "0")}:${String(
      partita.OraPartita.getMinutes()
    ).padStart(2, "0")}`
  : "";

  const numeroGara = Number(partita.NumeroGara ?? 1);

  const giornata =
    partita.giornata !== null && partita.giornata !== undefined
      ? partita.giornata
      : 0;

  const golCasa =
    partita.GolCasa !== null && partita.GolCasa !== undefined
      ? partita.GolCasa
      : "";

  const golOspite =
    partita.GolOspite !== null && partita.GolOspite !== undefined
      ? partita.GolOspite
      : "";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-white">
      <Link
        href={`/tornei/${torneo.id}`}
        className="text-green-400 hover:underline"
      >
        ← Torna al torneo
      </Link>

      <div className="mt-8">
        <h1 className="text-3xl font-bold">Modifica partita</h1>
        <p className="mt-2 text-slate-400">
          Modifica il risultato, la fase e i partecipanti alla partita.
        </p>
      </div>

      <form action={modificaPartita} className="mt-8 space-y-6">
        <input type="hidden" name="torneoId" value={torneo.id} />
        <input
          type="hidden"
          name="partitaId"
          value={partita.id.toString()}
        />

        {/* SQUADRA CASA */}
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Squadra casa
          </label>

          <select
            name="squadraCasaId"
            required
            defaultValue={partita.SquadraCasaId?.toString() || ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            <option value="">Seleziona squadra</option>
            {squadre.map((p) => (
              <option key={p.squadra.id} value={p.squadra.id}>
                {p.squadra.nome}
              </option>
            ))}
          </select>
        </div>

        {/* SQUADRA OSPITE */}
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Squadra ospite
          </label>

          <select
            name="squadraOspiteId"
            required
            defaultValue={partita.SquadraOspiteId?.toString() || ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            <option value="">Seleziona squadra</option>
            {squadre.map((p) => (
              <option key={p.squadra.id} value={p.squadra.id}>
                {p.squadra.nome}
              </option>
            ))}
          </select>
        </div>

        {/* ALLENATORI E SOSTITUTI */}
        <section className="rounded-2xl border border-indigo-800 bg-indigo-950/20 p-5">
          <h2 className="text-xl font-bold text-indigo-300">
            Allenatori della partita
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Il titolare viene ricavato dalla partecipazione della squadra
            al torneo. Qui puoi scegliere un eventuale sostituto per questa
            specifica partita.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {/* CASA */}
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <h3 className="font-bold">Squadra di casa</h3>

              <p className="mt-3 text-sm text-slate-400">
                Allenatore titolare
              </p>

              <p className="mt-1 font-semibold">
                {titolareCasaId !== null
                  ? partecipantiPerId.get(titolareCasaId) ??
                    "Partecipante non disponibile"
                  : "Nessun titolare assegnato"}
              </p>

              <label
                htmlFor="sostitutoCasaId"
                className="mb-2 mt-5 block text-sm text-slate-400"
              >
                Sostituto di casa
              </label>

              <select
                id="sostitutoCasaId"
                name="sostitutoCasaId"
                defaultValue={partita.sostitutoCasaId?.toString() ?? ""}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3"
              >
                <option value="">Nessun sostituto</option>

                {partecipanti
                  .filter((p) => p.id !== titolareCasaId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </select>
            </div>

            {/* OSPITE */}
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <h3 className="font-bold">Squadra ospite</h3>

              <p className="mt-3 text-sm text-slate-400">
                Allenatore titolare
              </p>

              <p className="mt-1 font-semibold">
                {titolareOspiteId !== null
                  ? partecipantiPerId.get(titolareOspiteId) ??
                    "Partecipante non disponibile"
                  : "Nessun titolare assegnato"}
              </p>

              <label
                htmlFor="sostitutoOspiteId"
                className="mb-2 mt-5 block text-sm text-slate-400"
              >
                Sostituto ospite
              </label>

              <select
                id="sostitutoOspiteId"
                name="sostitutoOspiteId"
                defaultValue={partita.sostitutoOspiteId?.toString() ?? ""}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3"
              >
                <option value="">Nessun sostituto</option>

                {partecipanti
                  .filter((p) => p.id !== titolareOspiteId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Il sostituto riceve i punti previsti dal ranking allenatori
            per questa partita. Le partite storiche non ricevono
            sostituti automaticamente.
          </p>
        </section>

        {/* FASE */}
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Fase della competizione
          </label>

          <select
            name="fase"
            required
            defaultValue={partita.Fase || ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            <option value="">Seleziona fase</option>
            <option value="Girone">Girone</option>
            <option value="Sedicesimi">Sedicesimi di finale</option>
            <option value="Ottavi">Ottavi di finale</option>
            <option value="Quarti">Quarti di finale</option>
            <option value="Semifinale">Semifinale</option>
            <option value="Finale">Finale</option>
            <option value="Finale 3°/4° posto">
              Finale 3°/4° posto
            </option>
          </select>
        </div>

        {/* GIORNATA */}
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Giornata
          </label>

          <input
            type="number"
            name="giornata"
            min="0"
            step="1"
            required
            defaultValue={giornata}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />

          <p className="mt-2 text-sm text-slate-500">
            Inserisci manualmente la giornata. Il valore non viene
            modificato automaticamente.
          </p>
        </div>

        {/* NUMERO GARA */}
        {torneo.andataRitorno ? (
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Gara
            </label>

            <select
              name="numeroGara"
              required
              defaultValue={numeroGara.toString()}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            >
              <option value="1">Andata</option>
              <option value="2">Ritorno</option>
            </select>
          </div>
        ) : (
          <input type="hidden" name="numeroGara" value="1" />
        )}

        {/* DATA */}
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Data partita
          </label>

          <input
            type="date"
            name="dataPartita"
            required
            defaultValue={dataFormattata}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />
        </div>

        {/* ORA */}
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Ora indicativa
          </label>

          <input
            type="time"
            name="oraPartita"
            defaultValue={oraFormattata}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />
        </div>

        {/* RISULTATO */}
        <div className="rounded-2xl border border-green-800 bg-green-950/30 p-5">
          <h2 className="font-bold text-green-400">
            ⚽ Risultato partita
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Inserisci il risultato finale. È possibile inserire anche 0-0.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Gol casa
              </label>

              <input
                type="number"
                name="golCasa"
                min="0"
                step="1"
                defaultValue={golCasa}
                placeholder="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-2xl font-bold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Gol ospite
              </label>

              <input
                type="number"
                name="golOspite"
                min="0"
                step="1"
                defaultValue={golOspite}
                placeholder="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-2xl font-bold"
              />
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <input
              type="checkbox"
              name="partitaConclusa"
              defaultChecked={partita.Completata ?? false}
              className="h-5 w-5"
            />

            <div>
              <span className="font-bold">Partita conclusa</span>
              <p className="mt-1 text-sm text-slate-500">
                Conferma il risultato come definitivo.
              </p>
            </div>
          </label>
        </div>

        {/* RIGORI */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="aiRigori"
              defaultChecked={partita.AiRigori ?? false}
              className="h-5 w-5"
            />

            <span className="font-bold">Partita decisa ai rigori</span>
          </label>

          <p className="mt-2 text-sm text-slate-500">
            Seleziona questa opzione se la partita è stata decisa ai rigori.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Rigori casa
              </label>

              <input
                type="number"
                name="rigoriCasa"
                min="0"
                step="1"
                defaultValue={partita.RigoriCasa ?? ""}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Rigori ospite
              </label>

              <input
                type="number"
                name="rigoriOspite"
                min="0"
                step="1"
                defaultValue={partita.RigoriOspite ?? ""}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
              />
            </div>
          </div>
        </div>

        {/* SALVATAGGIO */}
        <button
          type="submit"
          className="w-full rounded-xl bg-green-600 px-6 py-4 font-bold transition hover:bg-green-500"
        >
          💾 Salva modifiche
        </button>
      </form>
    </main>
  );
}
