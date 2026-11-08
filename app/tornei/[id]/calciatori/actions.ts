"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/* ==========================================================
   AGGIUNGI CALCIATORE ALLA ROSA
========================================================== */

export async function aggiungiCalciatore(
  formData: FormData
) {
  await requireAdmin();

  const torneoId = Number(
    formData.get("torneoId")
  );

  const squadraId = Number(
    formData.get("squadraId")
  );

  const calciatoreId = Number(
    formData.get("calciatoreId")
  );

  const nome = String(
    formData.get("nome") || ""
  ).trim();

  /* ==========================================================
     VALIDAZIONE TORNEO
  ========================================================== */

  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    throw new Error(
      "Torneo non valido."
    );
  }

  /* ==========================================================
     VALIDAZIONE SQUADRA
  ========================================================== */

  if (!Number.isInteger(squadraId) || squadraId <= 0) {
    throw new Error(
      "Squadra non valida."
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
     VERIFICA CHE LA SQUADRA PARTECIPI AL TORNEO
  ========================================================== */

  const partecipazione =
    await prisma.partecipazione.findUnique({
      where: {
        torneoId_squadraId: {
          torneoId,
          squadraId,
        },
      },
    });

  if (!partecipazione) {
    throw new Error(
      "La squadra selezionata non partecipa a questo torneo."
    );
  }

  /* ==========================================================
     DETERMINA IL CALCIATORE
     
     Possibilità:
     
     1. È stato selezionato un calciatore esistente
     2. È stato inserito un nuovo nome
  ========================================================== */

  let calciatore;

  /* ==========================================================
     CASO 1
     CALCIATORE ESISTENTE
  ========================================================== */

  if (
    Number.isInteger(calciatoreId) &&
    calciatoreId > 0
  ) {
    calciatore =
      await prisma.calciatore.findUnique({
        where: {
          id: calciatoreId,
        },
      });

    if (!calciatore) {
      throw new Error(
        "Il calciatore selezionato non esiste."
      );
    }
  }

  /* ==========================================================
     CASO 2
     NUOVO CALCIATORE
  ========================================================== */

  else if (nome) {
    calciatore =
      await prisma.calciatore.findUnique({
        where: {
          nome,
        },
      });

    /* ========================================================
       CREA CALCIATORE SE NON ESISTE
    ======================================================== */

    if (!calciatore) {
      calciatore =
        await prisma.calciatore.create({
          data: {
            nome,
          },
        });
    }
  }

  /* ==========================================================
     NESSUN CALCIATORE SELEZIONATO / INSERITO
  ========================================================== */

  else {
    throw new Error(
      "Seleziona un calciatore esistente oppure inserisci il nome di un nuovo calciatore."
    );
  }

  /* ==========================================================
     CONTROLLO DUPLICATO
     
     Lo stesso calciatore non può essere presente
     due volte nella stessa squadra dello stesso torneo.
  ========================================================== */

  const esistente =
    await prisma.calciatoreTorneo.findUnique({
      where: {
        calciatoreId_torneoId_squadraId: {
          calciatoreId: calciatore.id,
          torneoId,
          squadraId,
        },
      },
    });

  if (esistente) {
    throw new Error(
      "Questo calciatore è già presente nella rosa della squadra."
    );
  }

  /* ==========================================================
     CREA ASSOCIAZIONE CALCIATORE / TORNEO / SQUADRA
  ========================================================== */

  await prisma.calciatoreTorneo.create({
    data: {
      calciatoreId: calciatore.id,
      torneoId,
      squadraId,
    },
  });

  /* ==========================================================
     TORNA ALLA PAGINA ROSE
  ========================================================== */

  redirect(
    `/tornei/${torneoId}/calciatori`
  );
}

/* ==========================================================
   ELIMINA CALCIATORE DALLA ROSA
========================================================== */

export async function eliminaCalciatore(
  formData: FormData
) {
  await requireAdmin();

  const id = Number(
    formData.get("id")
  );

  const torneoId = Number(
    formData.get("torneoId")
  );

  /* ==========================================================
     VALIDAZIONE
  ========================================================== */

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Calciatore non valido."
    );
  }

  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    throw new Error(
      "Torneo non valido."
    );
  }

  /* ==========================================================
     VERIFICA CALCIATORE
  ========================================================== */

  const calciatoreTorneo =
    await prisma.calciatoreTorneo.findUnique({
      where: {
        id,
      },
    });

  if (!calciatoreTorneo) {
    throw new Error(
      "Calciatore non trovato."
    );
  }

  /* ==========================================================
     VERIFICA CHE APPARTENGA AL TORNEO
  ========================================================== */

  if (
    calciatoreTorneo.torneoId !==
    torneoId
  ) {
    throw new Error(
      "Il calciatore non appartiene a questo torneo."
    );
  }

  /* ==========================================================
     ELIMINA ASSOCIAZIONE
  ========================================================== */

  await prisma.calciatoreTorneo.delete({
    where: {
      id,
    },
  });

  /* ==========================================================
     TORNA ALLA PAGINA ROSE
  ========================================================== */

  redirect(
    `/tornei/${torneoId}/calciatori`
  );
}

/* ==========================================================
   UNISCI DUE CALCIATORI
========================================================== */

export async function unisciCalciatori(
  formData: FormData
) {
  await requireAdmin();

  const calciatorePrincipaleId =
    Number(
      formData.get(
        "calciatorePrincipaleId"
      )
    );

  const calciatoreDuplicatoId =
    Number(
      formData.get(
        "calciatoreDuplicatoId"
      )
    );

  /* ==========================================================
     VALIDAZIONE
  ========================================================== */

  if (
    !Number.isInteger(
      calciatorePrincipaleId
    ) ||
    calciatorePrincipaleId <= 0
  ) {
    throw new Error(
      "Calciatore principale non valido."
    );
  }

  if (
    !Number.isInteger(
      calciatoreDuplicatoId
    ) ||
    calciatoreDuplicatoId <= 0
  ) {
    throw new Error(
      "Calciatore duplicato non valido."
    );
  }

  if (
    calciatorePrincipaleId ===
    calciatoreDuplicatoId
  ) {
    throw new Error(
      "Non puoi unire un calciatore con se stesso."
    );
  }

  /* ==========================================================
     VERIFICA ESISTENZA
  ========================================================== */

  const [
    principale,
    duplicato,
  ] = await Promise.all([
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
      "Il calciatore principale non esiste."
    );
  }

  if (!duplicato) {
    throw new Error(
      "Il calciatore duplicato non esiste."
    );
  }

  /* ==========================================================
     TRANSAZIONE
  ========================================================== */

  await prisma.$transaction(
    async (tx) => {

      /* ======================================================
         RECUPERA LE PARTECIPAZIONI DEL DUPLICATO
      ====================================================== */

      const partecipazioniDuplicato =
        await tx.calciatoreTorneo.findMany({
          where: {
            calciatoreId:
              calciatoreDuplicatoId,
          },
        });

      /* ======================================================
         RECUPERA LE PARTECIPAZIONI DEL PRINCIPALE
      ====================================================== */

      const partecipazioniPrincipale =
        await tx.calciatoreTorneo.findMany({
          where: {
            calciatoreId:
              calciatorePrincipaleId,
          },
        });

      /* ======================================================
         ELABORA OGNI PARTECIPAZIONE
      ====================================================== */

      for (
        const partecipazioneDuplicato
        of partecipazioniDuplicato
      ) {

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
           LA PARTECIPAZIONE ESISTE GIÀ
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
             TRASFERISCI CARTELLINI ROSSI
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
             TRASFERISCI TROFEI
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
             ELIMINA PARTECIPAZIONE DUPLICATA
          ================================================== */

          await tx.calciatoreTorneo.delete({
            where: {
              id:
                partecipazioneDuplicato.id,
            },
          });

        } else {

          /* ==================================================
             CASO 2
             LA PARTECIPAZIONE NON ESISTE
             
             Possiamo trasferirla direttamente.
          ================================================== */

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
    }
  );
}