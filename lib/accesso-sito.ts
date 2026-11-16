import "server-only";
import { prisma } from "@/lib/prisma";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SCADENZA_MS = 15 * 60 * 1000;

export async function verificaAdminId(id?: string): Promise<boolean> {
  const consentito = process.env.PAZZITOURNAMENT_ADMIN_SUPABASE_ID?.trim();
  if (!id || !consentito || id !== consentito) return false;
  const profilo = await prisma.profilo.findUnique({
    where: { supabaseId: id }, select: { ruolo: true },
  });
  return profilo?.ruolo === "ADMIN";
}

export async function verificaCookieQR(token?: string, visitaId?: string): Promise<boolean> {
  if (!token || !/^[a-f0-9]{64}$/i.test(token) || !visitaId || !UUID.test(visitaId)) return false;
  const visita = await prisma.visitaSito.findUnique({
    where: { id: visitaId },
    select: {
      terminataIl: true, ultimaAttivitaIl: true,
      partecipante: { select: { qrToken: true } },
    },
  });
  if (!visita || visita.terminataIl || visita.partecipante.qrToken !== token) return false;
  const inattivita = Date.now() - visita.ultimaAttivitaIl.getTime();
  return inattivita >= 0 && inattivita < SCADENZA_MS;
}
