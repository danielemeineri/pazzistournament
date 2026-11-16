import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NextRequest, NextResponse } from "next/server";
import { UUID, SCADENZA_MS } from "@/lib/accesso-sito";

export const COOKIE_ESTERNO = "pazzi_esterno_id";
export const COOKIE_VISITA_ESTERNA = "pazzi_visita_esterna";

export function percorsoAnonimo(path: string): string {
  // Mai registrare query, token QR o credenziali presenti nei percorsi.
  if (path.startsWith("/qr/")) return "/qr/[token]";
  return path.replace(/[a-f0-9]{64}/gi, "[token]").slice(0, 300);
}

export function descriviDispositivo(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Altro";
  const dispositivo = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobile|iPhone|Android/i.test(ua) ? "Telefono" : "Computer / altro";
  return `${dispositivo} · ${browser}`;
}

export async function registraEsterno(request: NextRequest, response: NextResponse) {
  // Solo navigazioni reali: niente conteggi per API, prefetch, RSC o risorse.
  if (request.method !== "GET" || request.headers.has("next-router-prefetch") ||
      request.headers.get("purpose") === "prefetch" || request.headers.has("rsc") ||
      !(request.headers.get("accept") ?? "").includes("text/html")) return;

  const adesso = new Date();
  const idCookie = request.cookies.get(COOKIE_ESTERNO)?.value;
  const visitatoreId = idCookie && UUID.test(idCookie) ? idCookie : randomUUID();
  const visitaCookie = request.cookies.get(COOKIE_VISITA_ESTERNA)?.value;
  const percorso = percorsoAnonimo(request.nextUrl.pathname);
  let visitaId: string | null = null;
  if (visitaCookie && UUID.test(visitaCookie)) {
    const precedente = await prisma.visitaEsterna.findUnique({ where: { id: visitaCookie } });
    if (precedente && precedente.visitatoreId === visitatoreId &&
        adesso.getTime() >= precedente.ultimaAttivitaIl.getTime() &&
        adesso.getTime() - precedente.ultimaAttivitaIl.getTime() < SCADENZA_MS) {
      visitaId = precedente.id;
      await prisma.visitaEsterna.update({
        where: { id: visitaId },
        data: { ultimoPercorso: percorso, richieste: { increment: 1 }, ultimaAttivitaIl: adesso },
      });
    }
  }
  if (!visitaId) {
    const visita = await prisma.visitaEsterna.create({
      data: { visitatoreId, primoPercorso: percorso, ultimoPercorso: percorso,
        dispositivo: descriviDispositivo(request.headers.get("user-agent") ?? "") },
      select: { id: true },
    });
    visitaId = visita.id;
  }
  const opzioni = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(COOKIE_ESTERNO, visitatoreId, { ...opzioni, maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set(COOKIE_VISITA_ESTERNA, visitaId, opzioni);
}
