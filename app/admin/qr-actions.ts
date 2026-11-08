
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Genera un token casuale di 256 bit.
function generaTokenQr(): string {
  return randomBytes(32).toString("hex");
}

// =====================================================
// GENERA I QR MANCANTI
// =====================================================

export async function generaQrMancanti() {
  await requireAdmin();

  const partecipanti = await prisma.partecipante.findMany({
    where: {
      qrToken: null,
    },
    select: {
      id: true,
    },
  });

  let generati = 0;

  for (const partecipante of partecipanti) {
    await prisma.partecipante.update({
      where: {
        id: partecipante.id,
      },
      data: {
        qrToken: generaTokenQr(),
      },
    });

    generati++;
  }

  revalidatePath("/admin");

  return {
    generati,
  };
}

// =====================================================
// RIGENERA IL QR DI UN PARTECIPANTE
// =====================================================

export async function rigeneraQrPartecipante(
  partecipanteId: number
) {
  await requireAdmin();

  if (
    !Number.isSafeInteger(partecipanteId) ||
    partecipanteId <= 0
  ) {
    throw new Error("ID partecipante non valido.");
  }

  await prisma.partecipante.update({
    where: {
      id: partecipanteId,
    },
    data: {
      qrToken: generaTokenQr(),
    },
  });

  revalidatePath("/admin");

  return {
    success: true,
  };
}
