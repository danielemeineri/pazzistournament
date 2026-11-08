
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

// =========================================================
// ELIMINA GOL
// Il punteggio viene aggiornato, ma la partita NON viene
// conclusa automaticamente.
// =========================================================

export async function eliminaGol(formData: FormData) {
  await requireAdmin();

  const torneoId = Number(formData.get("torneoId"));
  const partitaIdValue = String(formData.get("partitaId") || "");
  const golId = Number(formData.get("golId"));

  if (
    !Number.isSafeInteger(torneoId) ||
    torneoId <= 0 ||
    !partitaIdValue ||
    !Number.isSafeInteger(golId) ||
    golId <= 0
  ) {
    throw new Error("Dati del gol non validi.");
  }

  let partitaId: bigint;

  try {
    partitaId = BigInt(partitaIdValue);
  } catch {
    throw new Error("ID partita non valido.");
  }

  if (partitaId <= BigInt(0)) {
    throw new Error("ID partita non valido.");
  }

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
    select: {
      id: true,
      TorneoId: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
    },
  });

  if (!partita) {
    throw new Error("Partita non trovata.");
  }

  if (partita.TorneoId !== torneoId) {
    throw new Error("La partita non appartiene al torneo.");
  }

  if (
    partita.SquadraCasaId === null ||
    partita.SquadraOspiteId === null
  ) {
    throw new Error(
      "Impossibile eliminare il gol: la partita non ha entrambe le squadre assegnate."
    );
  }

  const squadraCasaId = partita.SquadraCasaId;
  const squadraOspiteId = partita.SquadraOspiteId;

  const gol = await prisma.gol.findUnique({
    where: { id: golId },
    select: {
      id: true,
      partitaId: true,
    },
  });

  if (!gol) {
    throw new Error("Gol non trovato.");
  }

  if (gol.partitaId !== partitaId) {
    throw new Error("Il gol non appartiene a questa partita.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.gol.delete({
      where: { id: golId },
    });

    const tuttiIGol = await tx.gol.findMany({
      where: { partitaId },
      select: {
        squadraId: true,
        tipo: true,
      },
    });

    let golCasa = 0;
    let golOspite = 0;

    for (const g of tuttiIGol) {
      let squadraCheSegna = g.squadraId;

      if (g.tipo === "AUTOGOL") {
        if (g.squadraId === squadraCasaId) {
          squadraCheSegna = squadraOspiteId;
        } else if (g.squadraId === squadraOspiteId) {
          squadraCheSegna = squadraCasaId;
        }
      }

      if (squadraCheSegna === squadraCasaId) {
        golCasa++;
      } else if (squadraCheSegna === squadraOspiteId) {
        golOspite++;
      }
    }

    // Aggiorniamo esclusivamente il risultato.
    // Completata rimane invariato.
    await tx.partita.update({
      where: { id: partitaId },
      data: {
        GolCasa: golCasa,
        GolOspite: golOspite,
      },
    });
  });

  revalidatePath(`/tornei/${torneoId}`);
  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );

  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}
