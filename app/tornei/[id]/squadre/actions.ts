"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/* ==========================================================
   AGGIUNGI SQUADRA AL TORNEO

   Quando viene aggiunta una squadra:

   1. crea la partecipazione
   2. cerca tutti i giocatori storici della STESSA SQUADRA
   3. limita la ricerca allo STESSO VIDEOGIOCO
   4. importa automaticamente i giocatori nella nuova rosa

   La ricerca funziona sia con:
   - videogiocoId
   - vecchio campo videogioco
========================================================== */

export async function aggiungiSquadra(
  formData: FormData
) {
  await requireAdmin();

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

  /* ========================================================
     VALIDAZIONE
  ======================================================== */

  if (
    !Number.isInteger(torneoId) ||
    torneoId <= 0 ||
    !Number.isInteger(squadraId) ||
    squadraId <= 0 ||
    !Number.isInteger(partecipanteId) ||
    partecipanteId <= 0
  ) {
    throw new Error(
      "Devi selezionare squadra e partecipante."
    );
  }

  /* ========================================================
     TORNEO
  ======================================================== */

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

  /* ========================================================
     SQUADRA
  ======================================================== */

  const squadra =
    await prisma.squadra.findUnique({
      where: {
        id: squadraId,
      },
    });

  if (!squadra) {
    throw new Error(
      "Squadra non trovata."
    );
  }

  /* ========================================================
     NUMERO MASSIMO SQUADRE
  ======================================================== */

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

  /* ========================================================
     SQUADRA GIÀ PRESENTE
  ======================================================== */

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

  /* ========================================================
     GIRONE
  ======================================================== */

  if (gironeId !== null) {
    if (
      !Number.isInteger(gironeId) ||
      gironeId <= 0
    ) {
      throw new Error(
        "Girone non valido."
      );
    }

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

  /* ========================================================
     TRANSAZIONE
  ======================================================== */

  await prisma.$transaction(
    async (tx) => {

      /* ======================================================
         1. CREA PARTECIPAZIONE
      ====================================================== */

      await tx.partecipazione.create({
        data: {
          torneoId,
          squadraId,
          partecipanteId,
          gironeId,
        },
      });

      /* ======================================================
         2. RECUPERA I GIOCATORI STORICI

         CERCHIAMO:

         stessa squadra
         +
         stesso videogioco

         Il controllo del videogioco usa OR:

         - videogiocoId uguale
         - oppure vecchio campo videogioco uguale

         Questo è importante per i vecchi tornei FIFA 17.
      ====================================================== */

      if (
        torneo.videogiocoId ||
        torneo.videogioco
      ) {

        const condizioniVideogioco = [];

        if (torneo.videogiocoId) {
          condizioniVideogioco.push({
            torneo: {
              videogiocoId:
                torneo.videogiocoId,
            },
          });
        }

        if (torneo.videogioco) {
          condizioniVideogioco.push({
            torneo: {
              videogioco:
                torneo.videogioco,
            },
          });
        }

        const calciatoriStorici =
          await tx.calciatoreTorneo.findMany({
            where: {
              squadraId,

              torneoId: {
                not: torneoId,
              },

              OR: condizioniVideogioco,
            },

            select: {
              calciatoreId: true,
            },
          });

        /* ====================================================
           3. ELIMINA DUPLICATI
        ==================================================== */

        const calciatoriUnici =
          Array.from(
            new Set(
              calciatoriStorici.map(
                (elemento) =>
                  elemento.calciatoreId
              )
            )
          );

        /* ====================================================
           4. IMPORTA AUTOMATICAMENTE LA ROSA

           Esempio:

           FIFA 17
           Atlético Nacional

           Juan
           Pablo
           Carlos

           Nuovo torneo:

           Atlético Nacional
           ↓
           Juan
           Pablo
           Carlos
        ==================================================== */

        if (
          calciatoriUnici.length > 0
        ) {
          await tx.calciatoreTorneo.createMany({
            data:
              calciatoriUnici.map(
                (calciatoreId) => ({
                  calciatoreId,
                  torneoId,
                  squadraId,
                })
              ),

            skipDuplicates: true,
          });
        }
      }
    }
  );

  redirect(
    `/tornei/${torneoId}/squadre`
  );
}


/* ==========================================================
   SINCRONIZZA LE ROSE DI UN TORNEO ESISTENTE

   Questa funzione serve per i tornei che erano già stati
   creati prima della modifica.

   Esempio:

   Torneo FIFA 17
   ├── Atlético Nacional
   ├── Milan
   └── Juventus

   Premendo sincronizza:

   Atlético Nacional
   ↓
   giocatori storici Atlético Nacional FIFA 17

   Milan
   ↓
   giocatori storici Milan FIFA 17

   Juventus
   ↓
   giocatori storici Juventus FIFA 17
========================================================== */

export async function sincronizzaRoseTorneo(
  formData: FormData
) {
  await requireAdmin();

  const torneoId = Number(
    formData.get("torneoId")
  );

  if (
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    throw new Error(
      "Torneo non valido."
    );
  }

  /* ========================================================
     TORNEO
  ======================================================== */

  const torneo =
    await prisma.torneo.findUnique({
      where: {
        id: torneoId,
      },

      include: {
        partecipazioni: {
          select: {
            squadraId: true,
          },
        },
      },
    });

  if (!torneo) {
    throw new Error(
      "Torneo non trovato."
    );
  }

  if (
    !torneo.videogiocoId &&
    !torneo.videogioco
  ) {
    throw new Error(
      "Il torneo non è associato a un videogioco."
    );
  }

  /* ========================================================
     SQUADRE DEL TORNEO
  ======================================================== */

  const squadraIds =
    torneo.partecipazioni.map(
      (partecipazione) =>
        partecipazione.squadraId
    );

  if (
    squadraIds.length === 0
  ) {
    throw new Error(
      "Il torneo non contiene squadre."
    );
  }

  /* ========================================================
     CONDIZIONI VIDEOGIOCO
  ======================================================== */

  const condizioniVideogioco = [];

  if (torneo.videogiocoId) {
    condizioniVideogioco.push({
      torneo: {
        videogiocoId:
          torneo.videogiocoId,
      },
    });
  }

  if (torneo.videogioco) {
    condizioniVideogioco.push({
      torneo: {
        videogioco:
          torneo.videogioco,
      },
    });
  }

  /* ========================================================
     RECUPERA TUTTI I GIOCATORI STORICI

     IMPORTANTE:

     stessa squadra
     +
     stesso videogioco
  ======================================================== */

  const calciatoriStorici =
    await prisma.calciatoreTorneo.findMany({
      where: {
        squadraId: {
          in: squadraIds,
        },

        torneoId: {
          not: torneoId,
        },

        OR: condizioniVideogioco,
      },

      select: {
        calciatoreId: true,
        squadraId: true,
      },
    });

  /* ========================================================
     ELIMINA DUPLICATI
  ======================================================== */

  const chiaviUniche =
    new Set<string>();

  const collegamenti =
    calciatoriStorici.filter(
      (elemento) => {

        const chiave =
          `${elemento.calciatoreId}-${elemento.squadraId}`;

        if (
          chiaviUniche.has(chiave)
        ) {
          return false;
        }

        chiaviUniche.add(
          chiave
        );

        return true;
      }
    );

  /* ========================================================
     CREA COLLEGAMENTI MANCANTI
  ======================================================== */

  if (
    collegamenti.length > 0
  ) {
    await prisma.calciatoreTorneo.createMany({
      data:
        collegamenti.map(
          (elemento) => ({
            calciatoreId:
              elemento.calciatoreId,

            torneoId,

            squadraId:
              elemento.squadraId,
          })
        ),

      skipDuplicates: true,
    });
  }

  redirect(
    `/tornei/${torneoId}/calciatori`
  );
}


/* ==========================================================
   MODIFICA GIRONE DELLA SQUADRA
========================================================== */

export async function modificaGironeSquadra(
  formData: FormData
) {
  await requireAdmin();

  const partecipazioneId =
    Number(
      formData.get(
        "partecipazioneId"
      )
    );

  const torneoId =
    Number(
      formData.get("torneoId")
    );

  const gironeIdValue =
    String(
      formData.get("gironeId") ||
        ""
    );

  const gironeId =
    gironeIdValue === ""
      ? null
      : Number(gironeIdValue);

  if (
    !Number.isInteger(
      partecipazioneId
    ) ||
    partecipazioneId <= 0 ||
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    throw new Error(
      "Dati mancanti per modificare il girone."
    );
  }

  const partecipazione =
    await prisma.partecipazione.findFirst({
      where: {
        id: partecipazioneId,
        torneoId,
      },
    });

  if (!partecipazione) {
    throw new Error(
      "Partecipazione non trovata."
    );
  }

  if (gironeId !== null) {

    if (
      !Number.isInteger(gironeId) ||
      gironeId <= 0
    ) {
      throw new Error(
        "Girone non valido."
      );
    }

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

  await prisma.partecipazione.update({
    where: {
      id: partecipazioneId,
    },

    data: {
      gironeId,
    },
  });

  redirect(
    `/tornei/${torneoId}/squadre`
  );
}


/* ==========================================================
   GENERA I GIRONI
========================================================== */

export async function generaGironi(
  formData: FormData
) {
  await requireAdmin();

  const torneoId = Number(
    formData.get("torneoId")
  );

  if (
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    throw new Error(
      "Torneo non valido."
    );
  }

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

  if (
    torneo.formula !==
    "Gironi + eliminazione diretta"
  ) {
    throw new Error(
      "Questo torneo non prevede la fase a gironi."
    );
  }

  const numeroGironiNecessari =
    Math.ceil(
      torneo.squadre / 4
    );

  const gironi =
    await prisma.girone.findMany({
      where: {
        torneoId,
      },

      orderBy: {
        nome: "asc",
      },
    });

  if (
    gironi.length <
    numeroGironiNecessari
  ) {
    for (
      let i = gironi.length;
      i < numeroGironiNecessari;
      i++
    ) {
      const lettera =
        String.fromCharCode(
          65 + i
        );

      await prisma.girone.create({
        data: {
          nome:
            `Girone ${lettera}`,

          torneoId,
        },
      });
    }
  }

  redirect(
    `/tornei/${torneoId}/squadre`
  );
}


/* ==========================================================
   RIMUOVI SQUADRA DAL TORNEO
========================================================== */

export async function rimuoviSquadra(
  formData: FormData
) {
  await requireAdmin();

  const partecipazioneId =
    Number(
      formData.get(
        "partecipazioneId"
      )
    );

  const torneoId =
    Number(
      formData.get("torneoId")
    );

  if (
    !Number.isInteger(
      partecipazioneId
    ) ||
    partecipazioneId <= 0 ||
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    throw new Error(
      "Dati mancanti per rimuovere la squadra."
    );
  }

  const partecipazione =
    await prisma.partecipazione.findFirst({
      where: {
        id: partecipazioneId,
        torneoId,
      },
    });

  if (!partecipazione) {
    throw new Error(
      "Partecipazione non trovata."
    );
  }

  await prisma.partecipazione.delete({
    where: {
      id: partecipazioneId,
    },
  });

  redirect(
    `/tornei/${torneoId}/squadre`
  );
}