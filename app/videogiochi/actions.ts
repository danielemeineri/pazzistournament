"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sincronizzaVideogiochiTornei() {
  await requireAdmin();

  const risultato = await prisma.$transaction(async (tx) => {
    const tornei = await tx.torneo.findMany({
      where: {
        videogiocoId: null,
        videogioco: {
          not: null,
        },
      },
      select: {
        id: true,
        videogioco: true,
      },
    });

    let collegati = 0;
    let creati = 0;

    for (const torneo of tornei) {
      const nomeVideogioco = torneo.videogioco?.trim();

      if (!nomeVideogioco) {
        continue;
      }

      let gioco = await tx.videogioco.findUnique({
        where: {
          nome: nomeVideogioco,
        },
      });

      if (!gioco) {
        gioco = await tx.videogioco.create({
          data: {
            nome: nomeVideogioco,
          },
        });

        creati++;
      }

      await tx.torneo.update({
        where: {
          id: torneo.id,
        },
        data: {
          videogiocoId: gioco.id,
        },
      });

      collegati++;
    }

    return {
      torneiAnalizzati: tornei.length,
      collegati,
      videogiochiCreati: creati,
    };
  });

  revalidatePath("/videogiochi");
  revalidatePath("/tornei");

  return risultato;
}
