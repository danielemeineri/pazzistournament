"use client";

import { useState } from "react";
import { creaPartita } from "./actions";

type Squadra = {
  id: number;
  nome: string;
  stemma: string | null;
};

type Girone = {
  id: number;
  nome: string;

  partecipazioni: {
    squadra: Squadra;
  }[];
};

type Props = {
  torneo: {
    id: number;
    nome: string;
    formula: string;
    andataRitorno: boolean;
  };

  squadre: Squadra[];

  gironi: Girone[];
};

export default function NuovaPartitaForm({
  torneo,
  squadre,
  gironi,
}: Props) {
  const [fase, setFase] = useState("");
  const [gironeId, setGironeId] = useState("");

  // =======================================================
  // SQUADRE GIRONE
  // =======================================================

  const squadreGirone =
    gironeId === ""
      ? []
      : gironi
          .find(
            (girone) =>
              String(girone.id) === gironeId
          )
          ?.partecipazioni.map(
            (partecipazione) =>
              partecipazione.squadra
          ) ?? [];

  const squadreDisponibili =
    fase === "Girone"
      ? squadreGirone
      : squadre;

  // =======================================================
  // FASI TORNEO
  // =======================================================

  let fasi: string[] = [];

  if (
    torneo.formula ===
    "Gironi + eliminazione diretta"
  ) {
    fasi = [
      "Girone",
      "Sedicesimi",
      "Ottavi",
      "Quarti",
      "Semifinale",
      "Finale",
      "Finale 3°/4° posto",
    ];
  } else if (
    torneo.formula ===
    "Eliminazione diretta"
  ) {
    fasi = [
      "Sedicesimi",
      "Ottavi",
      "Quarti",
      "Semifinale",
      "Finale",
      "Finale 3°/4° posto",
    ];
  } else if (
    torneo.formula ===
    "Gironi"
  ) {
    fasi = [
      "Girone",
    ];
  } else {
    fasi = [
      "Girone",
      "Sedicesimi",
      "Ottavi",
      "Quarti",
      "Semifinale",
      "Finale",
      "Finale 3°/4° posto",
    ];
  }

  return (
    <form
      action={creaPartita}
      className="mt-8 space-y-6"
    >
      <input
        type="hidden"
        name="torneoId"
        value={torneo.id}
      />

      {/* ============================= */}
      {/* FASE */}
      {/* ============================= */}

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Fase della competizione
        </label>

        <select
          name="fase"
          value={fase}
          onChange={(e) => {
            setFase(e.target.value);
            setGironeId("");
          }}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        >
          <option value="">
            Seleziona fase
          </option>

          {fasi.map(
            (faseDisponibile) => (
              <option
                key={faseDisponibile}
                value={faseDisponibile}
              >
                {faseDisponibile === "Girone"
                  ? "Girone"
                  : faseDisponibile === "Finale"
                  ? "🏆 Finale"
                  : faseDisponibile ===
                    "Finale 3°/4° posto"
                  ? "🥉 Finale 3°/4° posto"
                  : `${faseDisponibile} di finale`}
              </option>
            )
          )}
        </select>
      </div>

      {/* ============================= */}
      {/* GIRONE */}
      {/* ============================= */}

      {fase === "Girone" && (
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Girone
          </label>

          <select
            name="gironeId"
            value={gironeId}
            onChange={(e) =>
              setGironeId(e.target.value)
            }
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            <option value="">
              Seleziona girone
            </option>

            {gironi.map(
              (girone) => (
                <option
                  key={girone.id}
                  value={girone.id}
                >
                  {girone.nome}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {/* ============================= */}
      {/* SQUADRA CASA */}
      {/* ============================= */}

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Squadra casa
        </label>

        <select
          name="squadraCasaId"
          required
          disabled={
            fase === "Girone" &&
            gironeId === ""
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        >
          <option value="">
            Seleziona squadra
          </option>

          {squadreDisponibili.map(
            (squadra) => (
              <option
                key={squadra.id}
                value={squadra.id}
              >
                {squadra.nome}
              </option>
            )
          )}
        </select>
      </div>

      {/* ============================= */}
      {/* SQUADRA OSPITE */}
      {/* ============================= */}

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Squadra ospite
        </label>

        <select
          name="squadraOspiteId"
          required
          disabled={
            fase === "Girone" &&
            gironeId === ""
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        >
          <option value="">
            Seleziona squadra
          </option>

          {squadreDisponibili.map(
            (squadra) => (
              <option
                key={squadra.id}
                value={squadra.id}
              >
                {squadra.nome}
              </option>
            )
          )}
        </select>
      </div>

      {/* ============================= */}
      {/* GIORNATA */}
      {/* ============================= */}

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
          placeholder="Inserisci giornata"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        />

        <p className="mt-2 text-sm text-slate-500">
          Inserisci manualmente il numero della giornata.
          È possibile inserire anche 0.
        </p>
      </div>

      {/* ============================= */}
      {/* GARA */}
      {/* ============================= */}

      {torneo.andataRitorno ? (
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Gara
          </label>

          <select
            name="numeroGara"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            <option value="1">
              Andata
            </option>

            <option value="2">
              Ritorno
            </option>
          </select>
        </div>
      ) : (
        <input
          type="hidden"
          name="numeroGara"
          value="1"
        />
      )}

      {/* ============================= */}
      {/* DATA */}
      {/* ============================= */}

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Data partita
          <span className="ml-2 text-xs font-normal text-slate-500">
            (facoltativa)
          </span>
        </label>

        <input
          type="date"
          name="dataPartita"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        />
      </div>

      {/* ============================= */}
      {/* ORA */}
      {/* ============================= */}

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Ora partita
          <span className="ml-2 text-xs font-normal text-slate-500">
            (facoltativa)
          </span>
        </label>

        <input
          type="time"
          name="oraPartita"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        />
      </div>

      {/* ============================= */}
      {/* RISULTATO */}
      {/* ============================= */}

      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          name="golCasa"
          min="0"
          placeholder="Gol casa"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        />

        <input
          type="number"
          name="golOspite"
          min="0"
          placeholder="Gol ospite"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
        />
      </div>

      {/* ============================= */}
      {/* RIGORI */}
      {/* ============================= */}

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <label className="flex items-center gap-3 font-bold">
          <input
            type="checkbox"
            name="aiRigori"
            value="true"
          />

          Partita decisa ai rigori
        </label>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            type="number"
            name="rigoriCasa"
            min="0"
            placeholder="Rigori casa"
            className="rounded-xl bg-slate-800 px-4 py-3"
          />

          <input
            type="number"
            name="rigoriOspite"
            min="0"
            placeholder="Rigori ospite"
            className="rounded-xl bg-slate-800 px-4 py-3"
          />
        </div>
      </div>

      {/* ============================= */}
      {/* SALVA */}
      {/* ============================= */}

      <button
        type="submit"
        className="w-full rounded-xl bg-green-600 px-6 py-4 font-bold hover:bg-green-500"
      >
        💾 Salva partita
      </button>
    </form>
  );
}