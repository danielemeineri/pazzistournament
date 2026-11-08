import Link from "next/link";
import { creaVideogioco } from "./actions";

export default function NuovoVideogiocoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <Link
            href="/videogiochi"
            className="text-slate-400 hover:text-white transition"
          >
            ← Torna ai videogiochi
          </Link>

          <h1 className="text-4xl font-bold mt-6">
            🎮 Nuovo videogioco
          </h1>

          <p className="text-slate-400 mt-2">
            Inserisci un nuovo videogioco da utilizzare nei tornei.
          </p>
        </div>

        <form
          action={creaVideogioco}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-8 space-y-6"
        >

          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-semibold mb-2"
            >
              Nome videogioco
            </label>

            <input
              id="nome"
              name="nome"
              type="text"
              required
              placeholder="Es. EA Sports FC 26"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="anno"
              className="block text-sm font-semibold mb-2"
            >
              Anno
            </label>

            <input
              id="anno"
              name="anno"
              type="number"
              min="1900"
              max="2100"
              placeholder="Es. 2026"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-green-500"
            />

            <p className="text-xs text-slate-500 mt-2">
              Facoltativo.
            </p>
          </div>

          <div className="flex gap-3 pt-4">

            <Link
              href="/videogiochi"
              className="flex-1 text-center bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl font-bold transition"
            >
              Annulla
            </Link>

            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-500 px-5 py-3 rounded-xl font-bold transition"
            >
              Crea videogioco
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}