
import { prisma } from "@/lib/prisma";
import { creaTorneo } from "./actions";
import { isAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function NuovoTorneoPage() {
  const admin = await isAdmin();

  if (!admin) {
    notFound();
  }

  const videogiochi = await prisma.videogioco.findMany({
    orderBy: [
      {
        anno: "desc",
      },
      {
        nome: "asc",
      },
    ],
  });

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold mb-8">
          ➕ Crea nuovo torneo
        </h1>

        <form
          action={creaTorneo}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-8 space-y-6"
        >
          {/* NOME TORNEO */}
          <div>
            <label className="block mb-2 font-semibold">
              Nome torneo
            </label>

            <input
              name="nome"
              type="text"
              placeholder="Es. Mondiale per Club 2026"
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* TIPO COMPETIZIONE */}
          <div>
            <label className="block mb-2 font-semibold">
              Tipo competizione
            </label>

            <select
              name="tipo"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Mondiale per Nazioni">
                Mondiale per Nazioni
              </option>

              <option value="Mondiale per Club">
                Mondiale per Club
              </option>

              <option value="Europeo">
                Europeo
              </option>

              <option value="Coppa d'Africa">
                Coppa d'Africa
              </option>

              <option value="Copa América">
                Copa América
              </option>

              <option value="Coppa d'Asia">
                Coppa d'Asia
              </option>
            </select>
          </div>

          {/* ANNO */}
          <div>
            <label className="block mb-2 font-semibold">
              Anno
            </label>

            <input
              type="number"
              name="anno"
              defaultValue="2026"
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* VIDEOGIOCO */}
          <div>
            <label className="block mb-2 font-semibold">
              Videogioco
            </label>

            {videogiochi.length > 0 ? (
              <select
                name="videogioco"
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">
                  Seleziona il videogioco
                </option>

                {videogiochi.map((gioco) => (
                  <option
                    key={gioco.id}
                    value={gioco.nome}
                  >
                    {gioco.nome}
                    {gioco.anno ? ` (${gioco.anno})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="videogioco"
                placeholder="Es. FIFA 17"
                required
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            )}

            <p className="text-sm text-slate-400 mt-2">
              Il videogioco viene collegato automaticamente al torneo.
            </p>
          </div>

          {/* NUMERO SQUADRE */}
          <div>
            <label className="block mb-2 font-semibold">
              Numero squadre
            </label>

            <select
              name="squadre"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="32">32</option>
            </select>
          </div>

          {/* FORMULA */}
          <div>
            <label className="block mb-2 font-semibold">
              Formula
            </label>

            <select
              name="formula"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Gironi + eliminazione diretta">
                Gironi + eliminazione diretta
              </option>

              <option value="Eliminazione diretta">
                Eliminazione diretta
              </option>

              <option value="Campionato">
                Campionato
              </option>
            </select>
          </div>

          {/* ANDATA E RITORNO */}
          <div>
            <label className="block mb-2 font-semibold">
              Andata e ritorno
            </label>

            <select
              name="andataRitorno"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Si">Sì</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* PULSANTE */}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 p-4 rounded-xl font-bold transition"
          >
            🏆 Crea torneo
          </button>
        </form>
      </div>
    </main>
  );
}
