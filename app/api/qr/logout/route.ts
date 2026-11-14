
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pazzi_qr_token";
const VISITA_COOKIE_NAME = "pazzi_visita_id";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const visitaId = request.cookies.get(VISITA_COOKIE_NAME)?.value;

  // Chiudiamo la visita soltanto se entrambi i cookie
  // appartengono effettivamente allo stesso partecipante.
  if (
    token &&
    /^[a-f0-9]{64}$/i.test(token) &&
    visitaId &&
    /^[0-9a-f-]{36}$/i.test(visitaId)
  ) {
    const partecipante = await prisma.partecipante.findUnique({
      where: { qrToken: token },
      select: { id: true },
    });

    if (partecipante) {
      const adesso = new Date();

      await prisma.visitaSito.updateMany({
        where: {
          id: visitaId,
          partecipanteId: partecipante.id,
          terminataIl: null,
        },
        data: {
          terminataIl: adesso,
        },
      });
    }
  }

  // Reindirizziamo alla homepage.
  const response = NextResponse.redirect(
    new URL("/", request.url),
    303
  );

  // Eliminiamo il cookie di riconoscimento QR.
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Eliminiamo anche il cookie della visita.
  response.cookies.set({
    name: VISITA_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}
