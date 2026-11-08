
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ricalcolaRankingCompleto } from "@/lib/ranking/ricalcola";
import {
  ricalcolaRankingAllenatoriCompleto,
} from "@/lib/rankingAllenatori/ricalcola";

const BUCKET = "torneo-foto";

type ActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

export async function eliminaTorneo(
  torneoId: number
): Promise<ActionResult> {
  await requireAdmin();

  if (
    !Number.isSafeInteger(torneoId) ||
    torneoId <= 0
  ) {
    return {
      success: false,
      error: "Identificativo del torneo non valido.",
    };
  }

  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: {
      id: true,
      nome: true,
      foto: {
        select: {
          percorso: true,
        },
      },
    },
  });

  if (!torneo) {
    return {
      success: false,
      error: "Il torneo non esiste più.",
    };
  }

  const percorsiFoto = torneo.foto.map(
    (elemento) => elemento.percorso
  );

  try {
    await prisma.$transaction(async (tx) => {
      // Prima eliminiamo le partite.
      // Gol, cartellini e storici collegati vengono eliminati
      // dalle relazioni a cascata.
      await tx.partita.deleteMany({
        where: {
          TorneoId: torneoId,
        },
      });

      // Eliminiamo le partecipazioni prima dei gironi,
      // evitando problemi con le chiavi esterne.
      await tx.partecipazione.deleteMany({
        where: {
          torneoId,
        },
      });

      // Eliminiamo i trofei e i relativi vincitori.
      await tx.trofeo.deleteMany({
        where: {
          torneoId,
        },
      });

      // Eliminiamo i calciatori associati esclusivamente
      // a questo torneo, senza eliminare i calciatori generali.
      await tx.calciatoreTorneo.deleteMany({
        where: {
          torneoId,
        },
      });

      // Ora possiamo eliminare i gironi.
      await tx.girone.deleteMany({
        where: {
          torneoId,
        },
      });

      // Eliminiamo i record delle foto.
      await tx.fotoTorneo.deleteMany({
        where: {
          torneoId,
        },
      });

      // Infine eliminiamo il torneo.
      await tx.torneo.delete({
        where: {
          id: torneoId,
        },
      });
    });
  } catch (error) {
    console.error(
      "Errore eliminazione torneo:",
      error
    );

    return {
      success: false,
      error:
        "Non è stato possibile eliminare il torneo dal database.",
    };
  }

  const problemi: string[] = [];

  // Eliminiamo anche le immagini dal bucket Supabase.
  if (percorsiFoto.length > 0) {
    try {
      for (
        let i = 0;
        i < percorsiFoto.length;
        i += 100
      ) {
        const gruppo = percorsiFoto.slice(i, i + 100);

        const { error } = await supabaseAdmin.storage
          .from(BUCKET)
          .remove(gruppo);

        if (error) {
          console.error(
            "Errore eliminazione foto torneo:",
            error.message
          );

          problemi.push(
            "alcune foto potrebbero essere ancora presenti su Supabase"
          );

          break;
        }
      }
    } catch (error) {
      console.error(
        "Errore durante la pulizia delle foto:",
        error
      );

      problemi.push(
        "non è stato possibile completare la pulizia delle foto su Supabase"
      );
    }
  }

  // Ricostruiamo entrambi i ranking usando tutte le partite
  // rimaste nel database.
  try {
    await ricalcolaRankingCompleto();
    await ricalcolaRankingAllenatoriCompleto();
  } catch (error) {
    console.error(
      "Errore ricalcolo ranking dopo eliminazione torneo:",
      error
    );

    problemi.push(
      "il ricalcolo dei ranking non è stato completato"
    );
  }

  revalidatePath("/tornei");
  revalidatePath("/");
  revalidatePath("/statistiche");
  revalidatePath("/squadre");

  if (problemi.length > 0) {
    return {
      success: true,
      message:
        `Torneo "${torneo.nome}" eliminato. Attenzione: ${problemi.join("; ")}.`,
    };
  }

  return {
    success: true,
    message: `Torneo "${torneo.nome}" eliminato correttamente.`,
  };
}
