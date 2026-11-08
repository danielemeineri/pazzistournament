import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

function accountAdminAutorizzato(supabaseId: string): boolean {
  const adminId = process.env.PAZZITOURNAMENT_ADMIN_SUPABASE_ID?.trim();
  return Boolean(adminId && supabaseId === adminId);
}

export async function getUtenteCorrente() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profilo = await prisma.profilo.findUnique({
    where: { supabaseId: user.id },
  });

  if (!profilo) return null;
  return { user, profilo };
}

export async function isAdmin(): Promise<boolean> {
  const utente = await getUtenteCorrente();
  return Boolean(
    utente &&
      utente.profilo.ruolo === "ADMIN" &&
      accountAdminAutorizzato(utente.user.id)
  );
}

export async function requireAdmin() {
  const utente = await getUtenteCorrente();
  if (!utente) throw new Error("Utente non autenticato.");

  if (
    utente.profilo.ruolo !== "ADMIN" ||
    !accountAdminAutorizzato(utente.user.id)
  ) {
    throw new Error("Non hai i permessi necessari.");
  }

  return utente;
}
