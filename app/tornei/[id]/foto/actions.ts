"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "torneo-foto";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 200;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

function leggiIntero(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const numero = Number(value);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

// La firma binaria e' una prima verifica, non sostituisce la decodifica
// completa delle immagini. Non accettiamo SVG o altri contenuti attivi.
function firmaImmagineValida(buffer: Buffer, tipo: string): boolean {
  if (tipo === "image/png") {
    return buffer.length >= 24 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.toString("ascii", 12, 16) === "IHDR";
  }
  if (tipo === "image/jpeg") {
    return buffer.length >= 4 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (tipo === "image/webp") {
    return buffer.length >= 16 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16));
  }
  if (tipo === "image/gif") {
    return buffer.length >= 13 &&
      ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6));
  }
  return false;
}

export async function caricaFotoTorneo(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const torneoId = leggiIntero(formData.get("torneoId"));
  const file = formData.get("foto");
  const didascaliaRaw = formData.get("didascalia");

  if (!torneoId) return { success: false, error: "Torneo non valido." };
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Seleziona una foto." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "La foto supera il limite di 5 MB." };
  }

  const estensione = ALLOWED_TYPES[file.type];
  if (!estensione) {
    return { success: false, error: "Formato non supportato. Usa JPG, PNG, WEBP o GIF." };
  }

  if (didascaliaRaw !== null && typeof didascaliaRaw !== "string") {
    return { success: false, error: "Didascalia non valida." };
  }
  const didascalia = typeof didascaliaRaw === "string" ? didascaliaRaw.trim() : "";
  if (didascalia.length > MAX_CAPTION_LENGTH) {
    return { success: false, error: "La didascalia può contenere al massimo 200 caratteri." };
  }

  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: { id: true },
  });
  if (!torneo) return { success: false, error: "Torneo non trovato." };

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return { success: false, error: "Impossibile leggere la foto." };
  }
  if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE || !firmaImmagineValida(buffer, file.type)) {
    return { success: false, error: "Il contenuto del file non corrisponde a un'immagine valida nel formato dichiarato." };
  }

  const percorso = `${torneoId}/${crypto.randomUUID()}.${estensione}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(percorso, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Errore upload foto torneo:", uploadError.message);
    return { success: false, error: "Impossibile caricare la foto su Supabase." };
  }

  try {
    await prisma.fotoTorneo.create({
      data: { torneoId, percorso, didascalia: didascalia || null },
    });
  } catch (error) {
    console.error("Errore salvataggio foto torneo:", error);
    const { error: cleanupError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([percorso]);
    if (cleanupError) console.error("Errore pulizia file orfano:", cleanupError.message);
    return {
      success: false,
      error: "La foto è stata caricata, ma non è stato possibile registrarla.",
    };
  }

  revalidatePath(`/tornei/${torneoId}`);
  return { success: true, message: "Foto caricata correttamente." };
}

export async function eliminaFotoTorneo(
  torneoIdInput: number,
  fotoIdInput: number
): Promise<ActionResult> {
  await requireAdmin();

  if (!Number.isSafeInteger(torneoIdInput) || torneoIdInput <= 0 ||
      !Number.isSafeInteger(fotoIdInput) || fotoIdInput <= 0) {
    return { success: false, error: "Identificativi non validi." };
  }

  const foto = await prisma.fotoTorneo.findFirst({
    where: { id: fotoIdInput, torneoId: torneoIdInput },
  });
  if (!foto) return { success: false, error: "Foto non trovata." };

  // Controllo difensivo: non rimuovere mai file fuori dalla cartella del torneo.
  if (!foto.percorso.startsWith(`${torneoIdInput}/`) ||
      !/^\d+\/[a-zA-Z0-9_.-]+$/.test(foto.percorso)) {
    console.error("Percorso foto inatteso:", foto.percorso);
    return { success: false, error: "Percorso della foto non valido." };
  }

  // Conserviamo l'ordine Storage -> database: se lo Storage fallisce,
  // il riferimento nel database resta intatto. Se il DB fallisce dopo,
  // un tentativo successivo puo' ripulire il riferimento rimasto.
  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([foto.percorso]);
  if (storageError) {
    console.error("Errore eliminazione foto:", storageError.message);
    return { success: false, error: "Non è stato possibile eliminare il file da Supabase." };
  }

  try {
    await prisma.fotoTorneo.delete({ where: { id: foto.id } });
  } catch (error) {
    console.error("Errore eliminazione record foto:", error);
    revalidatePath(`/tornei/${torneoIdInput}`);
    return {
      success: false,
      error: "File rimosso, ma il record non è stato eliminato. Riprova dopo aver aggiornato la pagina.",
    };
  }

  revalidatePath(`/tornei/${torneoIdInput}`);
  return { success: true, message: "Foto eliminata correttamente." };
}
