
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function aggiungiRating(
  videogiocoId: number,
  formData: FormData
) {
  await requireAdmin();

  const squadraId = Number(formData.get("squadraId"));
  const valore = Number(formData.get("valutazione"));

  if (!Number.isInteger(squadraId) || squadraId <= 0) {
    throw new Error("Squadra non valida.");
  }

  if (!Number.isInteger(valore)) {
    throw new Error("Il rating deve essere un numero intero.");
  }

  if (valore < 1 || valore > 100) {
    throw new Error(
      "Il rating deve essere compreso tra 1 e 100."
    );
  }

  const videogioco = await prisma.videogioco.findUnique({
    where: {
      id: videogiocoId,
    },
  });

  if (!videogioco) {
    throw new Error("Videogioco non trovato.");
  }

  const squadra = await prisma.squadra.findUnique({
    where: {
      id: squadraId,
    },
  });

  if (!squadra) {
    throw new Error("Squadra non trovata.");
  }

  const esistente =
    await prisma.valutazioneSquadraGioco.findUnique({
      where: {
        videogiocoId_squadraId: {
          videogiocoId,
          squadraId,
        },
      },
    });

  if (esistente) {
    throw new Error(
      "Questa squadra ha già un rating per questo videogioco."
    );
  }

  await prisma.valutazioneSquadraGioco.create({
    data: {
      videogiocoId,
      squadraId,
      valutazione: valore,
    },
  });

  revalidatePath(`/videogiochi/${videogiocoId}`);
}

export async function modificaRating(
  videogiocoId: number,
  squadraId: number,
  formData: FormData
) {
  await requireAdmin();

  const valore = Number(formData.get("valutazione"));

  if (!Number.isInteger(valore)) {
    throw new Error("Il rating deve essere un numero intero.");
  }

  if (valore < 1 || valore > 100) {
    throw new Error(
      "Il rating deve essere compreso tra 1 e 100."
    );
  }

  await prisma.valutazioneSquadraGioco.update({
    where: {
      videogiocoId_squadraId: {
        videogiocoId,
        squadraId,
      },
    },
    data: {
      valutazione: valore,
    },
  });

  revalidatePath(`/videogiochi/${videogiocoId}`);
}

export async function rimuoviRating(
  videogiocoId: number,
  squadraId: number
) {
  await requireAdmin();

  await prisma.valutazioneSquadraGioco.delete({
    where: {
      videogiocoId_squadraId: {
        videogiocoId,
        squadraId,
      },
    },
  });

  revalidatePath(`/videogiochi/${videogiocoId}`);
}
