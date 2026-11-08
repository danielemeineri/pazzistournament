"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function creaVideogioco(formData: FormData) {
  await requireAdmin();

  const nomeInput = formData.get("nome");
  const annoInput = formData.get("anno");

  if (typeof nomeInput !== "string") {
    throw new Error("Il nome del videogioco non è valido.");
  }

  const nome = nomeInput.trim();
  if (!nome) {
    throw new Error("Il nome del videogioco è obbligatorio.");
  }

  if (annoInput !== null && typeof annoInput !== "string") {
    throw new Error("L'anno inserito non è valido.");
  }

  const annoValue = (annoInput ?? "").trim();
  let anno: number | null = null;

  if (annoValue) {
    if (!/^\d{1,4}$/.test(annoValue)) {
      throw new Error("L'anno inserito non è valido.");
    }
    anno = Number(annoValue);
    if (!Number.isSafeInteger(anno) || anno <= 0) {
      throw new Error("L'anno inserito non è valido.");
    }
  }

  const esistente = await prisma.videogioco.findUnique({
    where: { nome },
  });

  if (esistente) {
    throw new Error("Questo videogioco esiste già.");
  }

  await prisma.videogioco.create({
    data: { nome, anno },
  });

  redirect("/videogiochi");
}
