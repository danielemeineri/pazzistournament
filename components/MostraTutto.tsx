"use client";

import { useState, type ReactNode } from "react";

type Props = {
  header: ReactNode;
  rows: ReactNode[];
  initialCount?: number;
  minWidth?: string;
};

export default function MostraTutto({
  header,
  rows,
  initialCount = 3,
  minWidth = "600px",
}: Props) {
  const [espanso, setEspanso] = useState(false);
  const righeVisibili = espanso ? rows : rows.slice(0, initialCount);
  const puoEspandere = rows.length > initialCount;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          {header}
          <tbody className="divide-y divide-slate-800">{righeVisibili}</tbody>
        </table>
      </div>
      {puoEspandere && (
        <div className="border-t border-slate-800 px-5 py-4 text-center">
          <button
            type="button"
            onClick={() => setEspanso((valore) => !valore)}
            className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:bg-slate-800"
            aria-expanded={espanso}
          >
            {espanso ? "Mostra meno" : `Mostra tutti (${rows.length})`}
          </button>
        </div>
      )}
    </>
  );
}