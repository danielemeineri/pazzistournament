
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COOKIE_IDENTITA = "pazzi_qr_token";
const COOKIE_VISITA = "pazzi_visita_id";

const SESSIONE_SCADUTA_MS = 15 * 60 * 1000;
const MASSIMO_SECONDI_PER_SEGNALE = 20;

function rispostaOk() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function rispostaScaduta() {
  const response = NextResponse.json(
    { ok: false, sessioneScaduta: true },
    { status: 401 }
  );

  response.headers.set("Cache-Control", "no-store");

  response.cookies.delete(COOKIE_IDENTITA);
  response.cookies.delete(COOKIE_VISITA);

  return response;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_IDENTITA)?.value;
  const visitaId = request.cookies.get(COOKIE_VISITA)?.value;

  // Nessun accesso QR: il monitoraggio non deve
  // interferire con gli utenti amministratori.
  if (!token && !visitaId) {
    return new NextResponse(null, { status: 204 });
  }

  // I due cookie devono essere presenti e validi.
  if (
    !token ||
    !/^[a-f0-9]{64}$/i.test(token) ||
    !visitaId ||
    !/^[0-9a-f-]{36}$/i.test(visitaId)
  ) {
    return rispostaScaduta();
  }

  const partecipante = await prisma.partecipante.findUnique({
    where: { qrToken: token },
    select: { id: true },
  });

  if (!partecipante) {
    return rispostaScaduta();
  }

  const visita = await prisma.visitaSito.findUnique({
    where: { id: visitaId },
    select: {
      id: true,
      partecipanteId: true,
      ultimaAttivitaIl: true,
      terminataIl: true,
    },
  });

  if (
    !visita ||
    visita.partecipanteId !== partecipante.id ||
    visita.terminataIl !== null
  ) {
    return rispostaScaduta();
  }

  const adesso = new Date();

  const trascorsiMs =
    adesso.getTime() -
    visita.ultimaAttivitaIl.getTime();

  // Scadenza della sessione QR.
  if (
    trascorsiMs < 0 ||
    trascorsiMs >= SESSIONE_SCADUTA_MS
  ) {
    await prisma.visitaSito.updateMany({
      where: {
        id: visita.id,
        partecipanteId: partecipante.id,
        terminataIl: null,
      },
      data: {
        terminataIl: visita.ultimaAttivitaIl,
      },
    });

    return rispostaScaduta();
  }

  const secondi = Math.min(
    MASSIMO_SECONDI_PER_SEGNALE,
    Math.floor(trascorsiMs / 1000)
  );

  // Aggiornamento condizionale per evitare
  // conteggi duplicati tra schede contemporanee.
  const aggiornamento = await prisma.visitaSito.updateMany({
    where: {
      id: visita.id,
      partecipanteId: partecipante.id,
      ultimaAttivitaIl: visita.ultimaAttivitaIl,
      terminataIl: null,
    },
    data: {
      ultimaAttivitaIl: adesso,
      secondiAttivi: {
        increment: secondi,
      },
    },
  });

  // Se un'altra scheda ha già aggiornato la visita,
  // non aggiungiamo ulteriori secondi.
  if (aggiornamento.count === 0) {
    const verifica = await prisma.visitaSito.findUnique({
      where: { id: visita.id },
      select: { terminataIl: true },
    });

    if (!verifica || verifica.terminataIl !== null) {
      return rispostaScaduta();
    }
  }

  return rispostaOk();
}
