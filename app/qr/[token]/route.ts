import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

const COOKIE_NAME = "pazzi_qr_token";
const VISITA_COOKIE_NAME = "pazzi_visita_id";
const DURATA_COOKIE_IDENTITA = 60 * 60 * 24 * 30;
const DURATA_COOKIE_VISITA = 60 * 60 * 12;
const INATTIVITA_MASSIMA_MS = 30 * 60 * 1000;

function reindirizzaHome(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { token } = await params;

  // Verifica formato del token: 64 caratteri esadecimali.
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    const response = reindirizzaHome(request);
    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete(VISITA_COOKIE_NAME);
    return response;
  }

  // Verifica che il token appartenga a un partecipante.
  const partecipante = await prisma.partecipante.findUnique({
    where: { qrToken: token },
    select: { id: true },
  });

  // QR non valido o non più attivo.
  if (!partecipante) {
    const response = reindirizzaHome(request);
    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete(VISITA_COOKIE_NAME);
    return response;
  }

  const adesso = new Date();
  const visitaCookie = request.cookies.get(VISITA_COOKIE_NAME)?.value;
  let visitaId: string | null = null;

  // Se il partecipante riapre il QR durante una visita ancora attiva,
  // riutilizziamo la stessa visita invece di crearne un duplicato.
  if (visitaCookie && /^[0-9a-f-]{36}$/i.test(visitaCookie)) {
    const visitaEsistente = await prisma.visitaSito.findUnique({
      where: { id: visitaCookie },
      select: {
        id: true,
        partecipanteId: true,
        ultimaAttivitaIl: true,
        terminataIl: true,
      },
    });

    if (
      visitaEsistente &&
      visitaEsistente.partecipanteId === partecipante.id &&
      visitaEsistente.terminataIl === null &&
      adesso.getTime() - visitaEsistente.ultimaAttivitaIl.getTime() <
        INATTIVITA_MASSIMA_MS
    ) {
      visitaId = visitaEsistente.id;
    }
  }

  if (!visitaId) {
    const nuovaVisita = await prisma.visitaSito.create({
      data: {
        id: randomUUID(),
        partecipanteId: partecipante.id,
        iniziataIl: adesso,
        ultimaAttivitaIl: adesso,
        secondiAttivi: 0,
        origine: "QR_LINK",
      },
      select: { id: true },
    });
    visitaId = nuovaVisita.id;
  }

  // Reindirizzamento alla Home.
  const response = reindirizzaHome(request);

  // Cookie persistente dedicato al riconoscimento QR.
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATA_COOKIE_IDENTITA,
  });

  // Cookie separato per identificare la visita corrente.
  // Il tempo attivo sarà aggiornato da un endpoint dedicato.
  response.cookies.set({
    name: VISITA_COOKIE_NAME,
    value: visitaId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATA_COOKIE_VISITA,
  });

  return response;
}
