"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function verificaId(id: number, descrizione: string): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`${descrizione} non valido.`);
  }
}

function leggiIntero(formData: FormData, campo: string, descrizione: string): number {
  const valore = formData.get(campo);
  if (typeof valore !== "string" || !/^\d+$/.test(valore)) {
    throw new Error(`${descrizione} non valido.`);
  }
  const numero = Number(valore);
  if (!Number.isSafeInteger(numero)) {
    throw new Error(`${descrizione} non valido.`);
  }
  return numero;
}

function leggiValutazione(formData: FormData): number {
  const valore = leggiIntero(formData, "valutazione", "Rating");
  if (valore < 1 || valore > 100) {
    throw new Error("Il rating deve essere compreso tra 1 e 100.");
  }
  return valore;
}

export async function modificaRatingSquadra(
  squadraId: number,
  videogiocoId: number,
  formData: FormData
) {
  await requireAdmin();

  verificaId(squadraId, "Squadra");
  verificaId(videogiocoId, "Videogioco");
  const valore = leggiValutazione(formData);

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

  revalidatePath(`/squadre/${squadraId}`);
  revalidatePath(`/videogiochi/${videogiocoId}`);
}

export async function aggiungiRatingSquadra(
  squadraId: number,
  formData: FormData
) {
  await requireAdmin();

  verificaId(squadraId, "Squadra");
  const videogiocoId = leggiIntero(formData, "videogiocoId", "Videogioco");
  verificaId(videogiocoId, "Videogioco");
  const valore = leggiValutazione(formData);

  const esistente = await prisma.valutazioneSquadraGioco.findUnique({
    where: {
      videogiocoId_squadraId: {
        videogiocoId,
        squadraId,
      },
    },
  });

  if (esistente) {
    throw new Error("Questa squadra ha già un rating per questo videogioco.");
  }

  await prisma.valutazioneSquadraGioco.create({
    data: {
      videogiocoId,
      squadraId,
      valutazione: valore,
    },
  });

  revalidatePath(`/squadre/${squadraId}`);
  revalidatePath(`/videogiochi/${videogiocoId}`);
}
