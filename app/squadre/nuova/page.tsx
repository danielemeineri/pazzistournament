"use client";

import { useState } from "react";
import { creaSquadra } from "../actions";

export default function NuovaSquadraPage() {

  const [tipo, setTipo] = useState("Nazionale");


  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <h1 className="text-4xl font-bold mb-8">
        ➕ Nuova Squadra
      </h1>


      <form action={creaSquadra} className="space-y-6 max-w-md">


        <div>
          <label className="block mb-2 font-bold">
            Nome squadra
          </label>

          <input
            name="nome"
            required
            className="w-full p-3 rounded-lg bg-white text-black"
            placeholder="Es. Argentina o Juventus"
          />
        </div>


        <div>
          <label className="block mb-2 font-bold">
            Tipo squadra
          </label>

          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full p-3 rounded-lg bg-white text-black"
          >

            <option value="Nazionale">
              🌍 Nazionale
            </option>

            <option value="Club">
              🏟️ Club
            </option>

          </select>

        </div>


        {tipo === "Club" && (

          <div>
            <label className="block mb-2 font-bold">
              Nazione
            </label>

            <input
              name="nazione"
              className="w-full p-3 rounded-lg bg-white text-black"
              placeholder="Es. Italia"
            />
          </div>

        )}


        <div>
          <label className="block mb-2 font-bold">
            Stemma (URL)
          </label>

          <input
            name="stemma"
            className="w-full p-3 rounded-lg bg-white text-black"
            placeholder="https://..."
          />
        </div>


        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold"
        >
          ⚽ Salva squadra
        </button>


      </form>

    </main>
  );
}