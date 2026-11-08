"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function aggiungiSquadra(
  formData: FormData
) {
  // =========================================================
  // SOLO ADMIN
  // =========================================================

  await requireAdmin();

  // =========================================================
  // DATI
  // =========================================================

  const torneoId = Number(
    formData.get("torneoId")
  );

  const squadraId = Number(
    formData.get("squadraId")
  );

  const partecipanteId = Number(
    formData.get("partecipanteId")
  );

  const gironeIdValue = String(
    formData.get("gironeId") || ""
  );

  const gironeId =
    gironeIdValue === ""
      ? null
      : Number(gironeIdValue);

  // =========================================================
  // VALIDAZIONE BASE
  // =========================================================

  if (
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    throw new Error(
      "Torneo non valido."
    );
  }

  if (
    !Number.isInteger(squadraId) ||
    squadraId <= 0
  ) {
    throw new Error(
      "Squadra non valida."
    );
  }

  if (
    !Number.isInteger(partecipanteId) ||
    partecipanteId <= 0
  ) {
    throw new Error(
      "Partecipante non valido."
    );
  }

  // =========================================================
  // VERIFICA TORNEO
  // =========================================================

  const torneo =
    await prisma.torneo.findUnique({
      where: {
        id: torneoId,
      },
    });

  if (!torneo) {
    throw new Error(
      "Torneo non trovato."
    );
  }

  // =========================================================
  // CONTROLLO NUMERO MASSIMO SQUADRE
  // =========================================================

  const numeroSquadre =
    await prisma.partecipazione.count({
      where: {
        torneoId,
      },
    });

  if (
    numeroSquadre >= torneo.squadre
  ) {
    throw new Error(
      "Il torneo ha già raggiunto il numero massimo di squadre."
    );
  }

  // =========================================================
  // CONTROLLO SQUADRA GIÀ PRESENTE
  // =========================================================

  const squadraGiaPresente =
    await prisma.partecipazione.findUnique({
      where: {
        torneoId_squadraId: {
          torneoId,
          squadraId,
        },
      },
    });

  if (squadraGiaPresente) {
    throw new Error(
      "Questa squadra è già presente nel torneo."
    );
  }

  // =========================================================
  // CONTROLLO GIRONE
  // =========================================================

  if (gironeId !== null) {
    const girone =
      await prisma.girone.findFirst({
        where: {
          id: gironeId,
          torneoId,
        },
      });

    if (!girone) {
      throw new Error(
        "Il girone selezionato non appartiene a questo torneo."
      );
    }
  }

  // =========================================================
  // CREAZIONE PARTECIPAZIONE
  // =========================================================

  const partecipazione =
    await prisma.partecipazione.create({
      data: {
        torneoId,
        squadraId,
        partecipanteId,
        gironeId,
      },
    });

  // =========================================================
  // COPIA AUTOMATICA DELLA ROSA
  //
  // Se il torneo utilizza un videogioco collegato
  // tramite videogiocoId, cerchiamo l'ultimo torneo
  // precedente dello stesso videogioco in cui
  // questa stessa squadra era presente.
  // =========================================================

  if (torneo.videogiocoId) {
    // =======================================================
    // CERCA L'ULTIMA PARTECIPAZIONE DELLA STESSA SQUADRA
    // NELLO STESSO VIDEOGIOCO
    // =======================================================

    const ultimaPartecipazione =
      await prisma.partecipazione.findFirst({
        where: {
          squadraId,

          torneoId: {
            not: torneoId,
          },

          torneo: {
            videogiocoId:
              torneo.videogiocoId,
          },
        },

        orderBy: {
          torneoId: "desc",
        },

        include: {
          torneo: true,
        },
      });

    // =======================================================
    // SE ESISTE UN TORNEO PRECEDENTE, RECUPERA LA ROSA
    // =======================================================

    if (ultimaPartecipazione) {
      const rosaPrecedente =
        await prisma.calciatoreTorneo.findMany({
          where: {
            torneoId:
              ultimaPartecipazione.torneoId,

            squadraId,
          },

          select: {
            calciatoreId: true,
          },
        });

      // =====================================================
      // CREA LE NUOVE ASSOCIAZIONI
      //
      // Il Calciatore rimane lo stesso.
      // Creiamo solamente il nuovo CalciatoreTorneo
      // relativo al nuovo torneo.
      // =====================================================

      if (rosaPrecedente.length > 0) {
        await prisma.calciatoreTorneo.createMany({
          data: rosaPrecedente.map(
            (calciatore) => ({
              calciatoreId:
                calciatore.calciatoreId,

              torneoId,

              squadraId,
            })
          ),

          skipDuplicates: true,
        });
      }
    }
  }

  // =========================================================
  // REDIRECT
  // =========================================================

  redirect(
    `/tornei/${torneoId}/squadre`
  );
}