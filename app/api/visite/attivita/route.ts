import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_IDENTITA = "pazzi_qr_token";
const COOKIE_VISITA = "pazzi_visita_id";
const DURATA_COOKIE_VISITA = 60 * 60 * 12;
const SESSIONE_SCADUTA_MS = 30 * 60 * 1000;
const MASSIMO_SECONDI_PER_SEGNALE = 20;

function risposta() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_IDENTITA)?.value;
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return new NextResponse(null, { status: 204 });
  }

  const partecipante = await prisma.partecipante.findUnique({
    where: { qrToken: token },
    select: { id: true },
  });
  if (!partecipante) return new NextResponse(null, { status: 204 });

  const adesso = new Date();
  const idCookie = request.cookies.get(COOKIE_VISITA)?.value;

  if (idCookie && /^[0-9a-f-]{36}$/i.test(idCookie)) {
    const visita = await prisma.visitaSito.findUnique({
      where: { id: idCookie },
      select: {
        id: true,
        partecipanteId: true,
        ultimaAttivitaIl: true,
        terminataIl: true,
      },
    });

    if (
      visita &&
      visita.partecipanteId === partecipante.id &&
      visita.terminataIl === null
    ) {
      const trascorsiMs = adesso.getTime() - visita.ultimaAttivitaIl.getTime();
      if (trascorsiMs >= 0 && trascorsiMs < SESSIONE_SCADUTA_MS) {
        const secondi = Math.min(
          MASSIMO_SECONDI_PER_SEGNALE,
          Math.floor(trascorsiMs / 1000)
        );
        // Aggiornamento condizionale: due schede non devono sommare
        // contemporaneamente gli stessi secondi di attività.
        await prisma.visitaSito.updateMany({
          where: {
            id: visita.id,
            partecipanteId: partecipante.id,
            ultimaAttivitaIl: visita.ultimaAttivitaIl,
            terminataIl: null,
          },
          data: {
            ultimaAttivitaIl: adesso,
            secondiAttivi: { increment: secondi },
          },
        });
        return risposta();
      }

      await prisma.visitaSito.updateMany({
        where: { id: visita.id, partecipanteId: partecipante.id, terminataIl: null },
        data: { terminataIl: visita.ultimaAttivitaIl },
      });
    }
  }

  const nuova = await prisma.visitaSito.create({
    data: {
      id: randomUUID(),
      partecipanteId: partecipante.id,
      iniziataIl: adesso,
      ultimaAttivitaIl: adesso,
      secondiAttivi: 0,
      origine: "SESSIONE",
    },
    select: { id: true },
  });

  const response = risposta();
  response.cookies.set({
    name: COOKIE_VISITA,
    value: nuova.id,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATA_COOKIE_VISITA,
  });
  return response;
}
