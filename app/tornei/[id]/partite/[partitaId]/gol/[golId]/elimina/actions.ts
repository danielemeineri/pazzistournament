"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function eliminaGol(
  formData: FormData
) {
  await requireAdmin();

  const torneoId = Number(
    formData.get("torneoId")
  );

  const partitaId = BigInt(
    String(formData.get("partitaId"))
  );

  const golId = Number(
    formData.get("golId")
  );

  if (!Number.isInteger(golId)) {
    throw new Error("Gol non valido");
  }

  const partita =
    await prisma.partita.findUnique({
      where: {
        id: partitaId,
      },
      include: {
        squadraCasa: true,
        squadraOspite: true,
      },
    });

  if (
    !partita ||
    partita.TorneoId !== torneoId
  ) {
    throw new Error(
      "Partita non trovata"
    );
  }

  const gol =
    await prisma.gol.findUnique({
      where: {
        id: golId,
      },
    });

  if (!gol) {
    throw new Error(
      "Gol non trovato"
    );
  }

  await prisma.$transaction(
    async (tx) => {

      // Elimina il gol

      await tx.gol.delete({
        where: {
          id: golId,
        },
      });

      // Recupera tutti i gol rimasti

      const tuttiIGol =
        await tx.gol.findMany({
          where: {
            partitaId,
          },
          select: {
            squadraId: true,
            tipo: true,
          },
        });

      let golCasa = 0;
      let golOspite = 0;

      for (const g of tuttiIGol) {

        let squadraCheSegna =
          g.squadraId;

        if (
          g.tipo === "AUTOGOL"
        ) {

          squadraCheSegna =
            g.squadraId === partita.SquadraCasaId
              ? partita.SquadraOspiteId!
              : partita.SquadraCasaId!;

        }

        if (
          squadraCheSegna ===
          partita.SquadraCasaId
        ) {
          golCasa++;
        }

        if (
          squadraCheSegna ===
          partita.SquadraOspiteId
        ) {
          golOspite++;
        }
      }

      await tx.partita.update({
        where: {
          id: partitaId,
        },
        data: {

          GolCasa: golCasa,

          GolOspite: golOspite,

          Completata:
            tuttiIGol.length > 0,

        },
      });

    }
  );

  revalidatePath(
    `/tornei/${torneoId}`
  );

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );

  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}