"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

// La giornata è sempre inserita manualmente; il valore 0 è valido.
function interoObbligatorio(formData: FormData, campo: string, minimo: number, messaggio: string): number {
  const valore = formData.get(campo);
  if (typeof valore !== "string" || !/^\d+$/.test(valore.trim())) {
    throw new Error(messaggio);
  }
  const numero = Number(valore.trim());
  if (!Number.isSafeInteger(numero) || numero < minimo) {
    throw new Error(messaggio);
  }
  return numero;
}

function stringaObbligatoria(formData: FormData, campo: string, messaggio: string): string {
  const valore = formData.get(campo);
  if (typeof valore !== "string" || !valore.trim()) {
    throw new Error(messaggio);
  }
  return valore.trim();
}

function leggiData(formData: FormData): Date | null {
  const valore = formData.get("dataPartita");
  if (valore === null || valore === "") return null;
  if (typeof valore !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) {
    throw new Error("La data della partita non è valida.");
  }
  const [anno, mese, giorno] = valore.split("-").map(Number);
  const data = new Date(Date.UTC(anno, mese - 1, giorno, 12));
  if (data.getUTCFullYear() !== anno || data.getUTCMonth() !== mese - 1 || data.getUTCDate() !== giorno) {
    throw new Error("La data della partita non è valida.");
  }
  return data;
}

function leggiOra(formData: FormData): Date | null {
  const valore = formData.get("oraPartita");
  if (valore === null || valore === "") return null;
  if (typeof valore !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valore)) {
    throw new Error("L'ora della partita non è valida.");
  }
  // @db.Time(6): usiamo UTC per non dipendere dal fuso orario del server.
  return new Date(`1970-01-01T${valore}:00.000Z`);
}

export async function creaPartita(formData: FormData) {
  // Autorizzazione sul server, prima di qualsiasi accesso ai dati.
  await requireAdmin();

  const torneoId = interoObbligatorio(formData, "torneoId", 1, "Torneo non valido.");
  const squadraCasaId = interoObbligatorio(formData, "squadraCasaId", 1, "Squadre non valide.");
  const squadraOspiteId = interoObbligatorio(formData, "squadraOspiteId", 1, "Squadre non valide.");
  const fase = stringaObbligatoria(formData, "fase", "Seleziona una fase.");
  const numeroGara = interoObbligatorio(formData, "numeroGara", 1, "Numero gara non valido.");
  const giornata = interoObbligatorio(formData, "giornata", 0, "Giornata non valida.");
  const data = leggiData(formData);
  const ora = leggiOra(formData);

  if (squadraCasaId === squadraOspiteId) {
    throw new Error("Le squadre devono essere diverse.");
  }

  const valoreAiRigori = formData.get("aiRigori");
  if (valoreAiRigori !== null && valoreAiRigori !== "true" && valoreAiRigori !== "false") {
    throw new Error("Indicazione dei rigori non valida.");
  }
  const aiRigori = valoreAiRigori === "true";
  let rigoriCasa: number | null = null;
  let rigoriOspite: number | null = null;

  if (aiRigori) {
    rigoriCasa = interoObbligatorio(formData, "rigoriCasa", 0, "Risultato rigori non valido.");
    rigoriOspite = interoObbligatorio(formData, "rigoriOspite", 0, "Risultato rigori non valido.");
    if (rigoriCasa === rigoriOspite) {
      throw new Error("I rigori devono avere un vincitore.");
    }
  }

  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    select: { id: true, andataRitorno: true },
  });
  if (!torneo) throw new Error("Torneo non trovato.");

  const partecipazioni = await prisma.partecipazione.findMany({
    where: {
      torneoId,
      squadraId: { in: [squadraCasaId, squadraOspiteId] },
    },
    select: { squadraId: true, gironeId: true },
  });
  if (partecipazioni.length !== 2) {
    throw new Error("Squadre non appartenenti al torneo.");
  }

  let gironeId: number | null = null;
  if (fase === "Girone") {
    const casa = partecipazioni.find((p) => p.squadraId === squadraCasaId);
    const ospite = partecipazioni.find((p) => p.squadraId === squadraOspiteId);
    if (!casa || !ospite || casa.gironeId == null || ospite.gironeId == null) {
      throw new Error("Squadre senza girone.");
    }
    if (casa.gironeId !== ospite.gironeId) {
      throw new Error("Le squadre devono appartenere allo stesso girone.");
    }
    gironeId = casa.gironeId;
  }

  // Manteniamo il criterio di duplicazione originale, incluso NumeroGara.
  const partitaEsistente = await prisma.partita.findFirst({
    where: {
      TorneoId: torneoId,
      Fase: fase,
      NumeroGara: numeroGara,
      OR: [
        { SquadraCasaId: squadraCasaId, SquadraOspiteId: squadraOspiteId },
        { SquadraCasaId: squadraOspiteId, SquadraOspiteId: squadraCasaId },
      ],
    },
    select: { id: true },
  });
  if (partitaEsistente) throw new Error("Questa partita esiste già.");

  await prisma.partita.create({
    data: {
      TorneoId: torneoId,
      SquadraCasaId: squadraCasaId,
      SquadraOspiteId: squadraOspiteId,
      Fase: fase,
      NumeroGara: numeroGara,
      dataPartita: data,
      OraPartita: ora,
      gironeId,
      giornata,
      GolCasa: 0,
      GolOspite: 0,
      AiRigori: aiRigori,
      RigoriCasa: rigoriCasa,
      RigoriOspite: rigoriOspite,
      Completata: false,
    },
  });

  redirect(`/tornei/${torneoId}`);
}
