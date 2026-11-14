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
const INATTIVITA_MASSIMA_MS = 15 * 60 * 1000;

function reindirizzaHome(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { token } = await params;

  // Il token personale deve contenere esattamente 64 caratteri esadecimali.
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    const response = reindirizzaHome(request);
    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete(VISITA_COOKIE_NAME);
    return response;
  }

  const partecipante = await prisma.partecipante.findUnique({
    where: { qrToken: token },
    select: { id: true },
  });

  if (!partecipante) {
    const response = reindirizzaHome(request);
    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete(VISITA_COOKIE_NAME);
    return response;
  }

  const adesso = new Date();
  const visitaCookie = request.cookies.get(VISITA_COOKIE_NAME)?.value;
  let visitaId: string | null = null;

  // Riaprire il QR non crea un duplicato se la visita è ancora valida.
  if (
    visitaCookie &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      visitaCookie,
    )
  ) {
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

  const response = reindirizzaHome(request);

  // Cookie di sessione: senza maxAge/expires, non persiste deliberatamente
  // oltre la sessione del browser. Il server deve comunque verificare
  // la scadenza di inattività e l'eventuale logout esplicito.
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set({
    name: VISITA_COOKIE_NAME,
    value: visitaId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
