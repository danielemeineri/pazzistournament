"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export async function modificaTorneo(
  formData: FormData
) {
  // 🔐 SOLO ADMIN PUÒ MODIFICARE IL TORNEO
  await requireAdmin();

  const torneoId =
    Number(
      formData.get("torneoId")
    );

  const nome =
    String(
      formData.get("nome") || ""
    ).trim();

  const tipo =
    String(
      formData.get("tipo") || ""
    ).trim();

  const anno =
    Number(
      formData.get("anno")
    );

  const videogioco =
    String(
      formData.get("videogioco") || ""
    ).trim();

  const squadre =
    Number(
      formData.get("squadre")
    );

  const formula =
    String(
      formData.get("formula") || ""
    ).trim();

  const andataRitorno =
    formData.get(
      "andataRitorno"
    ) === "Si";


  /* ==========================================================
     VALIDAZIONI
     ========================================================== */

  if (!torneoId) {
    throw new Error(
      "Torneo non valido."
    );
  }

  if (!nome) {
    throw new Error(
      "Inserisci il nome del torneo."
    );
  }

  if (!tipo) {
    throw new Error(
      "Seleziona il tipo di competizione."
    );
  }

  if (!anno) {
    throw new Error(
      "Inserisci l'anno."
    );
  }

  if (!videogioco) {
    throw new Error(
      "Seleziona il videogioco."
    );
  }

  if (!squadre) {
    throw new Error(
      "Seleziona il numero di squadre."
    );
  }

  if (!formula) {
    throw new Error(
      "Seleziona la formula del torneo."
    );
  }


  /* ==========================================================
     VERIFICA TORNEO
     ========================================================== */

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


  /* ==========================================================
     VERIFICA SQUADRE GIÀ INSERITE
     ========================================================== */

  const numeroSquadreInserite =
    await prisma.partecipazione.count({
      where: {
        torneoId,
      },
    });

  if (
    squadre <
    numeroSquadreInserite
  ) {
    throw new Error(
      `Non puoi impostare ${squadre} squadre perché nel torneo ne sono già inserite ${numeroSquadreInserite}.`
    );
  }


  /* ==========================================================
     AGGIORNAMENTO TORNEO
     ========================================================== */

  await prisma.torneo.update({
    where: {
      id: torneoId,
    },

    data: {
      nome,
      tipo,
      anno,
      videogioco,
      squadre,
      formula,
      andataRitorno,
    },
  });


  /* ==========================================================
     TORNA ALLA PAGINA DEL TORNEO
     ========================================================== */

  redirect(
    `/tornei/${torneoId}`
  );
}