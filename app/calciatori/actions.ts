"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/* ==========================================================
   UNISCI DUE CALCIATORI
   ========================================================== */

export async function unisciCalciatori(formData: FormData) {
  await requireAdmin();

  const calciatorePrincipaleId = Number(
    formData.get("calciatorePrincipaleId")
  );

  const calciatoreDuplicatoId = Number(
    formData.get("calciatoreDuplicatoId")
  );

  /* ========================================================
     VALIDAZIONE
     ======================================================== */

  if (
    !Number.isInteger(calciatorePrincipaleId) ||
    calciatorePrincipaleId <= 0
  ) {
    throw new Error("Calciatore principale non valido.");
  }

  if (
    !Number.isInteger(calciatoreDuplicatoId) ||
    calciatoreDuplicatoId <= 0
  ) {
    throw new Error("Calciatore duplicato non valido.");
  }

  if (
    calciatorePrincipaleId ===
    calciatoreDuplicatoId
  ) {
    throw new Error(
      "Il calciatore principale e quello duplicato devono essere diversi."
    );
  }

  /* ========================================================
     VERIFICA CALCIATORI
     ======================================================== */

  const [principale, duplicato] =
    await Promise.all([
      prisma.calciatore.findUnique({
        where: {
          id: calciatorePrincipaleId,
        },
      }),

      prisma.calciatore.findUnique({
        where: {
          id: calciatoreDuplicatoId,
        },
      }),
    ]);

  if (!principale) {
    throw new Error(
      "Calciatore principale non trovato."
    );
  }

  if (!duplicato) {
    throw new Error(
      "Calciatore duplicato non trovato."
    );
  }

  /* ========================================================
     TRANSAZIONE
     ======================================================== */

  await prisma.$transaction(async (tx) => {
    /* ======================================================
       PARTECIPAZIONI DEL DUPLICATO
       ====================================================== */

    const partecipazioniDuplicato =
      await tx.calciatoreTorneo.findMany({
        where: {
          calciatoreId:
            calciatoreDuplicatoId,
        },

        include: {
          gol: true,
          cartelliniRossi: true,
          trofeiVinti: true,
        },
      });

    /* ======================================================
       PARTECIPAZIONI DEL PRINCIPALE
       ====================================================== */

    const partecipazioniPrincipale =
      await tx.calciatoreTorneo.findMany({
        where: {
          calciatoreId:
            calciatorePrincipaleId,
        },
      });

    /* ======================================================
       SPOSTAMENTO DATI
       ====================================================== */

    for (const partecipazioneDuplicato of
      partecipazioniDuplicato) {
      const partecipazionePrincipale =
        partecipazioniPrincipale.find(
          (partecipazione) =>
            partecipazione.torneoId ===
              partecipazioneDuplicato.torneoId &&
            partecipazione.squadraId ===
              partecipazioneDuplicato.squadraId
        );

      /* ====================================================
         CASO 1
         ESISTE GIÀ LA STESSA PARTECIPAZIONE
         ==================================================== */

      if (partecipazionePrincipale) {
        /* ==================================================
           TRASFERISCI I GOL
           ================================================== */

        await tx.gol.updateMany({
          where: {
            calciatoreTorneoId:
              partecipazioneDuplicato.id,
          },

          data: {
            calciatoreTorneoId:
              partecipazionePrincipale.id,
          },
        });

        /* ==================================================
           TRASFERISCI I CARTELLINI ROSSI
           ================================================== */

        await tx.cartellinoRosso.updateMany({
          where: {
            calciatoreTorneoId:
              partecipazioneDuplicato.id,
          },

          data: {
            calciatoreTorneoId:
              partecipazionePrincipale.id,
          },
        });

        /* ==================================================
           TRASFERISCI I TROFEI
           ================================================== */

        await tx.trofeo.updateMany({
          where: {
            calciatoreVincitoreId:
              partecipazioneDuplicato.id,
          },

          data: {
            calciatoreVincitoreId:
              partecipazionePrincipale.id,
          },
        });

        /* ==================================================
           ELIMINA LA PARTECIPAZIONE DUPLICATA
           ================================================== */

        await tx.calciatoreTorneo.delete({
          where: {
            id:
              partecipazioneDuplicato.id,
          },
        });
      }

      /* ====================================================
         CASO 2
         NON ESISTE LA PARTECIPAZIONE
         ==================================================== */

      else {
        await tx.calciatoreTorneo.update({
          where: {
            id:
              partecipazioneDuplicato.id,
          },

          data: {
            calciatoreId:
              calciatorePrincipaleId,
          },
        });
      }
    }

    /* ======================================================
       ELIMINA IL CALCIATORE DUPLICATO
       ====================================================== */

    await tx.calciatore.delete({
      where: {
        id:
          calciatoreDuplicatoId,
      },
    });
  });

  /* ========================================================
     TORNA ALL'ARCHIVIO
     ======================================================== */

  redirect("/calciatori");
}