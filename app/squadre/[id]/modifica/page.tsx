import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { modificaSquadra } from "../../actions";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

type ModificaSquadraPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ModificaSquadraPage({
  params,
}: ModificaSquadraPageProps) {
  await requireAdmin();

  const { id } = await params;

  const squadraId = Number(id);

  if (
    !Number.isInteger(squadraId) ||
    squadraId <= 0
  ) {
    notFound();
  }

  const squadra =
    await prisma.squadra.findUnique({
      where: {
        id: squadraId,
      },
    });

  if (!squadra) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-xl">
        <Link
          href="/squadre"
          className="text-green-400 hover:underline"
        >
          ← Torna alle squadre
        </Link>

        <h1 className="mt-8 mb-8 text-4xl font-bold">
          ✏️ Modifica {squadra.nome}
        </h1>

        <form
          action={modificaSquadra}
          className="space-y-6"
        >
          <input
            type="hidden"
            name="id"
            value={squadra.id}
          />

          {/* NOME */}

          <div>
            <label className="mb-2 block font-semibold">
              Nome squadra
            </label>

            <input
              name="nome"
              defaultValue={squadra.nome}
              className="w-full rounded-xl bg-slate-800 p-3"
              placeholder="Nome squadra"
            />
          </div>

          {/* TIPO */}

          <div>
            <label className="mb-2 block font-semibold">
              Tipo squadra
            </label>

            <select
              name="tipo"
              defaultValue={squadra.tipo}
              className="w-full rounded-xl bg-slate-800 p-3"
            >
              <option value="Club">
                🏟️ Club
              </option>

              <option value="Nazionale">
                🌍 Nazionale
              </option>
            </select>
          </div>

          {/* NAZIONE */}

          {squadra.tipo === "Club" && (
            <div>
              <label className="mb-2 block font-semibold">
                Nazione
              </label>

              <input
                name="nazione"
                defaultValue={
                  squadra.nazione ?? ""
                }
                className="w-full rounded-xl bg-slate-800 p-3"
                placeholder="Nazione"
              />
            </div>
          )}

          {/* STEMMA */}

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="mb-3 text-xl font-bold">
              🛡️ Stemma
            </h2>

            {squadra.stemma && (
              <div className="mb-4">
                <p className="mb-2 text-sm text-slate-400">
                  Stemma attuale
                </p>

                <img
                  src={squadra.stemma}
                  alt={`Stemma ${squadra.nome}`}
                  className="h-32 w-32 rounded-xl bg-slate-800 object-contain p-2"
                />
              </div>
            )}

            <input
              type="file"
              name="stemma"
              accept="image/svg+xml,image/png,image/jpeg,image/webp"
              className="block w-full rounded-xl bg-slate-800 p-3 text-sm"
            />

            <p className="mt-2 text-xs text-slate-400">
              SVG, PNG, JPG o WEBP — massimo 5 MB
            </p>
          </div>

          {/* BANDIERA SOLO NAZIONALI */}

          {squadra.tipo === "Nazionale" && (
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h2 className="mb-3 text-xl font-bold">
                🏳️ Bandiera
              </h2>

              {squadra.bandiera && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-slate-400">
                    Bandiera attuale
                  </p>

                  <img
                    src={squadra.bandiera}
                    alt={`Bandiera ${squadra.nome}`}
                    className="h-24 w-36 rounded-xl bg-slate-800 object-contain p-2"
                  />
                </div>
              )}

              <input
                type="file"
                name="bandiera"
                accept="image/svg+xml,image/png,image/jpeg,image/webp"
                className="block w-full rounded-xl bg-slate-800 p-3 text-sm"
              />

              <p className="mt-2 text-xs text-slate-400">
                SVG, PNG, JPG o WEBP — massimo 5 MB
              </p>

              <p className="mt-3 text-sm text-slate-500">
                La bandiera verrà utilizzata
                nelle pagine dei tornei.
              </p>
            </div>
          )}

          {/* INFORMAZIONE NAZIONALE */}

          {squadra.tipo === "Nazionale" && (
            <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
              💡 Per una nazionale puoi avere
              contemporaneamente:
              <br />
              <br />
              🏳️{" "}
              <strong className="text-white">
                Bandiera
              </strong>{" "}
              → utilizzata nei tornei
              <br />
              🛡️{" "}
              <strong className="text-white">
                Stemma
              </strong>{" "}
              → utilizzato nell'Albo d'oro
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-green-600 p-3 font-bold hover:bg-green-700"
          >
            💾 Salva modifiche
          </button>
        </form>
      </div>
    </main>
  );
}