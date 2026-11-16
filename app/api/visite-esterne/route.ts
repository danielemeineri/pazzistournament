import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UUID, SCADENZA_MS } from "@/lib/accesso-sito";
import { COOKIE_ESTERNO, COOKIE_VISITA_ESTERNA } from "@/lib/visite-esterne";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse(null, { status: 403 });
  }
  const visitatoreId = request.cookies.get(COOKIE_ESTERNO)?.value;
  const id = request.cookies.get(COOKIE_VISITA_ESTERNA)?.value;
  const risposta = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!id || !UUID.test(id) || !visitatoreId || !UUID.test(visitatoreId)) return risposta();

  const visita = await prisma.visitaEsterna.findUnique({ where: { id } });
  if (!visita || visita.visitatoreId !== visitatoreId) return risposta();
  const adesso = new Date();
  const trascorsi = adesso.getTime() - visita.ultimaAttivitaIl.getTime();
  if (trascorsi < 0 || trascorsi >= SCADENZA_MS) return risposta();
  const secondi = Math.min(20, Math.floor(trascorsi / 1000));
  if (secondi === 0) return risposta();
  // Compare-and-swap: due schede non sommano due volte lo stesso tempo.
  await prisma.visitaEsterna.updateMany({
    where: { id, visitatoreId, ultimaAttivitaIl: visita.ultimaAttivitaIl },
    data: { ultimaAttivitaIl: adesso, secondiAttivi: { increment: secondi } },
  });
  return risposta();
}
