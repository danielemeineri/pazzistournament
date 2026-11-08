
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

const COOKIE_NAME = "pazzi_qr_token";

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  const { token } = await params;

  // Verifica formato del token: 64 caratteri esadecimali.
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.delete(COOKIE_NAME);

    return response;
  }

  // Verifica che il token appartenga a un partecipante.
  const partecipante = await prisma.partecipante.findUnique({
    where: {
      qrToken: token,
    },
    select: {
      id: true,
    },
  });

  // QR non valido o non più attivo.
  if (!partecipante) {
    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.delete(COOKIE_NAME);

    return response;
  }

  // Reindirizzamento alla Home.
  const response = NextResponse.redirect(
    new URL("/", request.url)
  );

  // Cookie dedicato al riconoscimento QR.
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}
