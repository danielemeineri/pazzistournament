"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function creaTorneo(
  formData: FormData
) {
  // ==========================
  // CONTROLLO ADMIN
  // ==========================

  await requireAdmin();

  // ==========================
  // DATI FORM
  // ==========================

  const nome = String(
    formData.get("nome") ?? ""
  );

  const tipo = String(
    formData.get("tipo") ?? ""
  );

  const anno = Number(
    formData.get("anno") ?? 2026
  );

  const videogioco = String(
    formData.get("videogioco") ?? ""
  ).trim();

  const squadre = Number(
    formData.get("squadre") ?? 8
  );

  const formula = String(
    formData.get("formula") ?? ""
  );

  const andataRitorno =
    formData.get("andataRitorno") === "Si";

  // ==========================
  // VALIDAZIONE
  // ==========================

  if (!nome.trim()) {
    throw new Error(
      "Il nome del torneo è obbligatorio."
    );
  }

  if (!videogioco) {
    throw new Error(
      "Il videogioco è obbligatorio."
    );
  }

  // ==========================
  // CREAZIONE TORNEO
  // ==========================

  const torneo = await prisma.$transaction(
    async (tx) => {
      // ==========================
      // VIDEOGIOCO
      // ==========================

      const gioco = await tx.videogioco.upsert({
        where: {
          nome: videogioco,
        },

        create: {
          nome: videogioco,
          anno,
        },

        update: {},
      });

      // ==========================
      // TORNEO
      // ==========================

      const nuovoTorneo =
        await tx.torneo.create({
          data: {
            nome,
            tipo,
            anno,

            // Manteniamo il vecchio campo
            // per compatibilità.
            videogioco,

            // Nuovo collegamento strutturato.
            videogiocoId: gioco.id,

            squadre,
            formula,
            andataRitorno,
          },
        });

      // ==========================
      // CREAZIONE AUTOMATICA GIRONI
      // ==========================

      if (
        formula ===
        "Gironi + eliminazione diretta"
      ) {
        const numeroGironi =
          Math.ceil(squadre / 4);

        for (
          let i = 0;
          i < numeroGironi;
          i++
        ) {
          const lettera =
            String.fromCharCode(
              65 + i
            );

          await tx.girone.create({
            data: {
              nome:
                `Girone ${lettera}`,

              torneoId:
                nuovoTorneo.id,
            },
          });
        }
      }

      return nuovoTorneo;
    }
  );

  // ==========================
  // REDIRECT
  // ==========================

  redirect(
    `/tornei/${torneo.id}`
  );
}