
import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_IDENTITA = "pazzi_qr_token";
const COOKIE_VISITA = "pazzi_visita_id";

const INATTIVITA_MASSIMA_MS = 15 * 60 * 1000;

export async function getSessioneQR() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_IDENTITA)?.value;
  const visitaId = cookieStore.get(COOKIE_VISITA)?.value;

  if (
    !token ||
    !/^[a-f0-9]{64}$/i.test(token) ||
    !visitaId ||
    !/^[0-9a-f-]{36}$/i.test(visitaId)
  ) {
    return null;
  }

  const partecipante = await prisma.partecipante.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      nome: true,
    },
  });

  if (!partecipante) {
    return null;
  }

  const visita = await prisma.visitaSito.findUnique({
    where: { id: visitaId },
    select: {
      id: true,
      partecipanteId: true,
      ultimaInterazioneIl: true,
      terminataIl: true,
    },
  });

  if (
    !visita ||
    visita.partecipanteId !== partecipante.id ||
    visita.terminataIl !== null
  ) {
    return null;
  }

  const inattivita =
    Date.now() -
    visita.ultimaInterazioneIl.getTime();

  if (
    inattivita < 0 ||
    inattivita >= INATTIVITA_MASSIMA_MS
  ) {
    return null;
  }

  return {
    partecipante,
    visitaId: visita.id,
  };
}
