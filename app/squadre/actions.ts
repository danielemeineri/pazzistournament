"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DIMENSIONE_MASSIMA = 5 * 1024 * 1024;
const TIPI_CONSENTITI = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function leggiTesto(formData: FormData, campo: string): string {
  const valore = formData.get(campo);
  if (typeof valore !== "string") {
    throw new Error(`Il campo ${campo} non è valido.`);
  }
  return valore.trim();
}

function leggiTipo(formData: FormData): string {
  const tipo = leggiTesto(formData, "tipo");
  if (tipo !== "Club" && tipo !== "Nazionale") {
    throw new Error("Tipo squadra non valido.");
  }
  return tipo;
}

function leggiId(formData: FormData): number {
  const valore = leggiTesto(formData, "id");
  if (!/^\d+$/.test(valore)) {
    throw new Error("ID squadra non valido.");
  }
  const id = Number(valore);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID squadra non valido.");
  }
  return id;
}

function verificaFirmaImmagine(buffer: Buffer, tipo: string): boolean {
  if (tipo === "image/png") {
    return buffer.length >= 24 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.toString("ascii", 12, 16) === "IHDR" &&
      buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(20) > 0;
  }
  if (tipo === "image/jpeg") {
    return buffer.length >= 4 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 &&
      buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  }
  if (tipo === "image/webp") {
    return buffer.length >= 16 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16)) &&
      buffer.readUInt32LE(4) + 8 === buffer.length;
  }
  return false;
}

async function caricaImmagine(
  file: File,
  squadraId: number,
  tipoImmagine: "stemma" | "bandiera"
): Promise<string> {
  const estensione = TIPI_CONSENTITI.get(file.type);
  if (!estensione) {
    throw new Error("Formato immagine non valido. Usa PNG, JPG oppure WEBP.");
  }
  if (file.size <= 0 || file.size > DIMENSIONE_MASSIMA) {
    throw new Error("L'immagine deve essere valida e non può superare i 5 MB.");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (fileBuffer.length !== file.size || !verificaFirmaImmagine(fileBuffer, file.type)) {
    throw new Error("Il contenuto del file non corrisponde a un'immagine valida.");
  }

  const percorso = `${squadraId}/${tipoImmagine}-${randomUUID()}.${estensione}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("squadre")
    .upload(percorso, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error(`Errore caricamento ${tipoImmagine}:`, uploadError);
    throw new Error("Errore durante il caricamento dell'immagine.");
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("squadre")
    .getPublicUrl(percorso);
  return publicUrl;
}

export async function creaSquadra(formData: FormData) {
  await requireAdmin();

  const nome = leggiTesto(formData, "nome");
  const tipo = leggiTipo(formData);
  const nazione = tipo === "Club" ? leggiTesto(formData, "nazione") || null : null;
  if (!nome) {
    throw new Error("Il nome della squadra è obbligatorio");
  }

  await prisma.squadra.create({
    data: { nome, tipo, nazione, stemma: null, bandiera: null },
  });
  redirect("/squadre");
}

export async function modificaSquadra(formData: FormData) {
  await requireAdmin();

  const id = leggiId(formData);
  const nome = leggiTesto(formData, "nome");
  const tipo = leggiTipo(formData);
  const nazione = tipo === "Club" ? leggiTesto(formData, "nazione") || null : null;

  if (!nome) {
    throw new Error("Il nome della squadra è obbligatorio");
  }

  const squadraEsistente = await prisma.squadra.findUnique({ where: { id } });
  if (!squadraEsistente) {
    throw new Error("Squadra non trovata");
  }

  let stemma = squadraEsistente.stemma;
  let bandiera = squadraEsistente.bandiera;

  const fileStemma = formData.get("stemma");
  if (fileStemma instanceof File && fileStemma.size > 0) {
    stemma = await caricaImmagine(fileStemma, id, "stemma");
  }

  const fileBandiera = formData.get("bandiera");
  if (tipo === "Nazionale" && fileBandiera instanceof File && fileBandiera.size > 0) {
    bandiera = await caricaImmagine(fileBandiera, id, "bandiera");
  }

  // Conserviamo i vecchi file nello Storage per evitare perdite accidentali.
  if (tipo === "Club") {
    bandiera = null;
  }

  await prisma.squadra.update({
    where: { id },
    data: { nome, tipo, nazione, stemma, bandiera },
  });
  redirect("/squadre");
}
