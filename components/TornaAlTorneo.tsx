"use client";

import Link from "next/link";

type Props = {
  torneoId: number;
};

export default function TornaAlTorneo({ torneoId }: Props) {
  return (
    <Link
      href={`/tornei/${torneoId}`}
      className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold transition-colors"
    >
      ← Torna al torneo
    </Link>
  );
}