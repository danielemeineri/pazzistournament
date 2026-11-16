"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function logoutAmministratore() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error("Uscita non riuscita. Riprova.");
  }

  // Evita che un'eventuale identità QR già presente mantenga aperto
  // l'accesso al sito dopo l'uscita dell'amministratore.
  const cookieStore = await cookies();
  cookieStore.delete("pazzi_qr_token");
  cookieStore.delete("pazzi_visita_id");

  redirect("/login");
}
