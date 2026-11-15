
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// =====================================================
// GENERAZIONE TOKEN QR
// =====================================================

// Genera un token crittograficamente sicuro di 256 bit.
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
    // Aggiorna soltanto se il QR è ancora mancante.
    // In questo modo due richieste simultanee non
    // sovrascrivono il token appena generato.

    const risultato = await prisma.partecipante.updateMany({
      where: {
        id: partecipante.id,
        qrToken: null,
      },
      data: {
        qrToken: generaTokenQr(),
      },
    });

    generati += risultato.count;
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

  const adesso = new Date();

  // La rigenerazione del QR e la chiusura delle visite
  // vengono eseguite nella stessa transazione.
  //
  // Se una delle operazioni fallisce, nessuna modifica
  // viene confermata nel database.

  await prisma.$transaction(async (tx) => {
    // Sostituisce il vecchio token.
    // Il vecchio QR non sarà più valido.

    await tx.partecipante.update({
      where: {
        id: partecipanteId,
      },
      data: {
        qrToken: generaTokenQr(),
      },
    });

    // Chiude tutte le visite ancora aperte
    // appartenenti al partecipante.

    await tx.visitaSito.updateMany({
      where: {
        partecipanteId,
        terminataIl: null,
      },
      data: {
        terminataIl: adesso,
      },
    });
  });

  // Aggiorna le pagine amministrative.

  revalidatePath("/admin");
  revalidatePath("/admin/accessi");

  return {
    success: true,
  };
}
