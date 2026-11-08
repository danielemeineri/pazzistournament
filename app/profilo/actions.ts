
"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "meinerid.afp@gmail.com";

export async function creaMioProfilo() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Devi effettuare il login.");
  }

  const email = user.email?.toLowerCase().trim();

  if (!email) {
    throw new Error("L'utente non ha un indirizzo email.");
  }

  const adminId =
    process.env.PAZZITOURNAMENT_ADMIN_SUPABASE_ID?.trim();

  if (!adminId) {
    throw new Error(
      "Configurazione amministratore mancante."
    );
  }

  let nome = "";

  switch (email) {
    case ADMIN_EMAIL:
      nome = "Daniele";
      break;

    case "luca@pazzistournament.it":
      nome = "Luca";
      break;

    case "thomas@pazzistournament.it":
      nome = "Thomas";
      break;

    case "francesco@pazzistournament.it":
      nome = "Francesco";
      break;

    default:
      throw new Error(
        "Questo account non è autorizzato a utilizzare PazziTournament."
      );
  }

  // Solo l'account Supabase designato può essere ADMIN.
  // Una discordanza tra email amministrativa e ID
  // viene trattata come errore, senza modificare il profilo.
  if (email === ADMIN_EMAIL && user.id !== adminId) {
    throw new Error(
      "Questo account non corrisponde all'amministratore autorizzato."
    );
  }

  const ruolo: "ADMIN" | "USER" =
    user.id === adminId && email === ADMIN_EMAIL
      ? "ADMIN"
      : "USER";

  const partecipante = await prisma.partecipante.findUnique({
    where: {
      nome,
    },
  });

  if (!partecipante) {
    throw new Error(
      `Il partecipante "${nome}" non esiste nel database di PazziTournament.`
    );
  }

  await prisma.profilo.upsert({
    where: {
      supabaseId: user.id,
    },
    update: {
      nome,
      ruolo,
      partecipanteId: partecipante.id,
    },
    create: {
      supabaseId: user.id,
      nome,
      ruolo,
      partecipanteId: partecipante.id,
    },
  });

  redirect("/");
}
