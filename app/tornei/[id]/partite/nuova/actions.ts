"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

// =========================================================
// CREA PARTITA
// =========================================================
//
// La GIORNATA viene inserita MANUALMENTE dall'utente.
//
// Non viene più calcolata automaticamente.
//
// È quindi possibile inserire qualsiasi giornata valida,
// compreso 0.
//
// =========================================================

export async function creaPartita(
  formData: FormData
) {

  // =======================================================
  // SOLO ADMIN
  // =======================================================

  await requireAdmin();


  // =======================================================
  // DATI FORM
  // =======================================================

  const torneoId =
    Number(
      formData.get("torneoId")
    );

  const squadraCasaId =
    Number(
      formData.get("squadraCasaId")
    );

  const squadraOspiteId =
    Number(
      formData.get("squadraOspiteId")
    );

  const dataPartita =
    String(
      formData.get("dataPartita") || ""
    );

  const oraPartita =
    String(
      formData.get("oraPartita") || ""
    );

  const fase =
    String(
      formData.get("fase") || ""
    ).trim();

  const numeroGara =
    Number(
      formData.get("numeroGara")
    );

  // =======================================================
  // GIORNATA MANUALE
  // =======================================================

  const giornata =
    Number(
      formData.get("giornata")
    );

  const aiRigori =
    formData.get("aiRigori") ===
    "true";

  const rigoriCasa =
    formData.get("rigoriCasa")
      ? Number(
          formData.get("rigoriCasa")
        )
      : null;

  const rigoriOspite =
    formData.get("rigoriOspite")
      ? Number(
          formData.get("rigoriOspite")
        )
      : null;


  // =======================================================
  // VALIDAZIONE TORNEO
  // =======================================================

  if (
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {

    throw new Error(
      "Torneo non valido."
    );

  }


  // =======================================================
  // VALIDAZIONE SQUADRE
  // =======================================================

  if (
    !Number.isInteger(
      squadraCasaId
    ) ||
    !Number.isInteger(
      squadraOspiteId
    ) ||
    squadraCasaId <= 0 ||
    squadraOspiteId <= 0
  ) {

    throw new Error(
      "Squadre non valide."
    );

  }


  if (
    squadraCasaId ===
    squadraOspiteId
  ) {

    throw new Error(
      "Le squadre devono essere diverse."
    );

  }


  // =======================================================
  // VALIDAZIONE FASE
  // =======================================================

  if (!fase) {

    throw new Error(
      "Seleziona una fase."
    );

  }


  // =======================================================
  // VALIDAZIONE NUMERO GARA
  // =======================================================

  if (
    !Number.isInteger(
      numeroGara
    ) ||
    numeroGara <= 0
  ) {

    throw new Error(
      "Numero gara non valido."
    );

  }


  // =======================================================
  // VALIDAZIONE GIORNATA
  // =======================================================

  if (
    !Number.isInteger(
      giornata
    ) ||
    giornata < 0
  ) {

    throw new Error(
      "Giornata non valida."
    );

  }


  // =======================================================
  // RECUPERA TORNEO
  // =======================================================

  const torneo =
    await prisma.torneo.findUnique({

      where: {
        id: torneoId,
      },

      select: {
        id: true,
        andataRitorno: true,
      },

    });


  if (!torneo) {

    throw new Error(
      "Torneo non trovato."
    );

  }


  // =======================================================
  // RECUPERA PARTECIPAZIONI
  // =======================================================

  const partecipazioni =
    await prisma.partecipazione.findMany({

      where: {

        torneoId,

        squadraId: {
          in: [
            squadraCasaId,
            squadraOspiteId,
          ],
        },

      },

      select: {

        squadraId: true,

        gironeId: true,

      },

    });


  if (
    partecipazioni.length !== 2
  ) {

    throw new Error(
      "Squadre non appartenenti al torneo."
    );

  }


  // =======================================================
  // GIRONE
  // =======================================================

  let gironeId:
    number | null = null;


  if (
    fase === "Girone"
  ) {

    const casa =
      partecipazioni.find(
        (p) =>
          p.squadraId ===
          squadraCasaId
      );


    const ospite =
      partecipazioni.find(
        (p) =>
          p.squadraId ===
          squadraOspiteId
      );


    if (
      !casa ||
      !ospite ||
      casa.gironeId === null ||
      casa.gironeId === undefined ||
      ospite.gironeId === null ||
      ospite.gironeId === undefined
    ) {

      throw new Error(
        "Squadre senza girone."
      );

    }


    if (
      casa.gironeId !==
      ospite.gironeId
    ) {

      throw new Error(
        "Le squadre devono appartenere allo stesso girone."
      );

    }


    gironeId =
      casa.gironeId;

  }


  // =======================================================
  // CONTROLLO PARTITA ESISTENTE
  // =======================================================

  const partitaEsistente =
    await prisma.partita.findFirst({

      where: {

        TorneoId:
          torneoId,

        Fase:
          fase,

        NumeroGara:
          numeroGara,

        OR: [

          {
            SquadraCasaId:
              squadraCasaId,

            SquadraOspiteId:
              squadraOspiteId,
          },

          {
            SquadraCasaId:
              squadraOspiteId,

            SquadraOspiteId:
              squadraCasaId,
          },

        ],

      },

    });


  if (partitaEsistente) {

    throw new Error(
      "Questa partita esiste già."
    );

  }


  // =======================================================
  // DATA
  // =======================================================

  let data:
    Date | null = null;


  if (dataPartita) {

    data =
      new Date(
        `${dataPartita}T12:00:00.000Z`
      );


    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      throw new Error(
        "La data della partita non è valida."
      );

    }

  }


  // =======================================================
  // ORA
  // =======================================================

  let ora:
    Date | null = null;


  if (oraPartita) {

    ora =
      new Date(
        `1970-01-01T${oraPartita}:00`
      );


    if (
      Number.isNaN(
        ora.getTime()
      )
    ) {

      throw new Error(
        "L'ora della partita non è valida."
      );

    }

  }


  // =======================================================
  // RIGORI
  // =======================================================

  if (aiRigori) {

    if (
      rigoriCasa === null ||
      rigoriOspite === null
    ) {

      throw new Error(
        "Inserisci il risultato dei rigori."
      );

    }


    if (
      !Number.isInteger(
        rigoriCasa
      ) ||
      !Number.isInteger(
        rigoriOspite
      )
    ) {

      throw new Error(
        "Risultato rigori non valido."
      );

    }


    if (
      rigoriCasa < 0 ||
      rigoriOspite < 0
    ) {

      throw new Error(
        "Il risultato dei rigori non può essere negativo."
      );

    }


    if (
      rigoriCasa ===
      rigoriOspite
    ) {

      throw new Error(
        "I rigori devono avere un vincitore."
      );

    }

  }


  // =======================================================
  // CREA PARTITA
  // =======================================================

  await prisma.partita.create({

    data: {

      TorneoId:
        torneoId,

      SquadraCasaId:
        squadraCasaId,

      SquadraOspiteId:
        squadraOspiteId,

      Fase:
        fase,

      NumeroGara:
        numeroGara,

      dataPartita:
        data,

      OraPartita:
        ora,

      gironeId:
        fase === "Girone"
          ? gironeId
          : null,

      // ===================================================
      // GIORNATA INSERITA MANUALMENTE
      // ===================================================

      giornata:
        giornata,

      GolCasa:
        0,

      GolOspite:
        0,

      AiRigori:
        aiRigori,

      RigoriCasa:
        aiRigori
          ? rigoriCasa
          : null,

      RigoriOspite:
        aiRigori
          ? rigoriOspite
          : null,

      Completata:
        false,

    },

  });


  // =======================================================
  // TORNA AL TORNEO
  // =======================================================

  redirect(
    `/tornei/${torneoId}`
  );
}