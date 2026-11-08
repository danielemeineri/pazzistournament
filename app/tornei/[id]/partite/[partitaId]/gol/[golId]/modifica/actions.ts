"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

// =========================================================
// RICALCOLA RISULTATO PARTITA
// =========================================================
// Ricalcola il punteggio usando tutti i gol registrati.
// IMPORTANTE: non modifica mai il campo Completata.
// =========================================================

async function ricalcolaRisultatoPartita(
  tx: any,
  partitaId: bigint
) {
  const partita = await tx.partita.findUnique({
    where: {
      id: partitaId,
    },
  });

  if (!partita) {
    throw new Error("Partita non trovata.");
  }

  if (
    partita.SquadraCasaId == null ||
    partita.SquadraOspiteId == null
  ) {
    throw new Error(
      "La partita deve avere entrambe le squadre assegnate."
    );
  }

  const tuttiIGol = await tx.gol.findMany({
    where: {
      partitaId,
    },
    select: {
      squadraId: true,
      tipo: true,
    },
  });

  let golCasa = 0;
  let golOspite = 0;

  for (const gol of tuttiIGol) {
    let squadraCheSegna = gol.squadraId;

    // In caso di autogol, il punto viene assegnato
    // alla squadra avversaria.
    if (gol.tipo === "AUTOGOL") {
      squadraCheSegna =
        gol.squadraId === partita.SquadraCasaId
          ? partita.SquadraOspiteId
          : partita.SquadraCasaId;
    }

    if (squadraCheSegna === partita.SquadraCasaId) {
      golCasa++;
    } else if (
      squadraCheSegna === partita.SquadraOspiteId
    ) {
      golOspite++;
    }
  }

  // Aggiorna solamente il risultato.
  // NON modificare Completata.
  await tx.partita.update({
    where: {
      id: partitaId,
    },
    data: {
      GolCasa: golCasa,
      GolOspite: golOspite,
    },
  });
}

// =========================================================
// VALIDAZIONE DATI COMUNI
// =========================================================

function leggiIdPositivo(
  valore: FormDataEntryValue | null,
  nome: string
): number {
  const numero = Number(valore);

  if (
    !Number.isSafeInteger(numero) ||
    numero <= 0
  ) {
    throw new Error(`${nome} non valido.`);
  }

  return numero;
}

function leggiPartitaId(
  valore: FormDataEntryValue | null
): bigint {
  const testo = String(valore ?? "");

  if (!/^\d+$/.test(testo)) {
    throw new Error("ID partita non valido.");
  }

  try {
    const id = BigInt(testo);

    if (id <= BigInt(0)) {
      throw new Error("ID partita non valido.");
    }

    return id;
  } catch {
    throw new Error("ID partita non valido.");
  }
}

function validaPeriodoETipo(
  periodo: string,
  tipo: string
) {
  if (
    periodo !== "PT" &&
    periodo !== "ST" &&
    periodo !== "SUPPLEMENTARI"
  ) {
    throw new Error("Periodo partita non valido.");
  }

  if (
    tipo !== "NORMALE" &&
    tipo !== "RIGORE" &&
    tipo !== "AUTOGOL"
  ) {
    throw new Error("Tipo di gol non valido.");
  }
}

function aggiornaCachePartita(torneoId: number, partitaId: bigint) {
  revalidatePath(`/tornei/${torneoId}`);
  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}

// =========================================================
// MODIFICA GOL
// =========================================================

export async function modificaGol(
  formData: FormData
) {
  await requireAdmin();

  // DATI
  const torneoId = leggiIdPositivo(
    formData.get("torneoId"),
    "Torneo"
  );

  const partitaId = leggiPartitaId(
    formData.get("partitaId")
  );

  const golId = leggiIdPositivo(
    formData.get("golId"),
    "Gol"
  );

  const calciatoreTorneoId = leggiIdPositivo(
    formData.get("calciatoreTorneoId"),
    "Calciatore"
  );

  const minuto = Number(formData.get("minuto"));
  const recupero = Number(formData.get("recupero") || 0);
  const periodo = String(formData.get("periodo") || "");
  const tipo = String(formData.get("tipo") || "");

  // VALIDAZIONE
  if (
    !Number.isInteger(minuto) ||
    minuto < 1 ||
    minuto > 130
  ) {
    throw new Error(
      "Il minuto deve essere compreso tra 1 e 130."
    );
  }

  if (
    !Number.isInteger(recupero) ||
    recupero < 0 ||
    recupero > 20
  ) {
    throw new Error("Recupero non valido.");
  }

  validaPeriodoETipo(periodo, tipo);

  // VERIFICA PARTITA
  const partita = await prisma.partita.findUnique({
    where: {
      id: partitaId,
    },
  });

  if (
    !partita ||
    partita.TorneoId !== torneoId
  ) {
    throw new Error("Partita non trovata.");
  }

  if (
    partita.SquadraCasaId == null ||
    partita.SquadraOspiteId == null
  ) {
    throw new Error(
      "La partita deve avere entrambe le squadre assegnate."
    );
  }

  // VERIFICA GOL
  const gol = await prisma.gol.findUnique({
    where: {
      id: golId,
    },
  });

  if (
    !gol ||
    gol.partitaId !== partitaId
  ) {
    throw new Error(
      "Il gol non appartiene a questa partita."
    );
  }

  // VERIFICA CALCIATORE
  const calciatoreTorneo =
    await prisma.calciatoreTorneo.findUnique({
      where: {
        id: calciatoreTorneoId,
      },
    });

  if (!calciatoreTorneo) {
    throw new Error("Calciatore non trovato.");
  }

  if (calciatoreTorneo.torneoId !== torneoId) {
    throw new Error(
      "Il calciatore non appartiene a questo torneo."
    );
  }

  if (
    calciatoreTorneo.squadraId !==
      partita.SquadraCasaId &&
    calciatoreTorneo.squadraId !==
      partita.SquadraOspiteId
  ) {
    throw new Error(
      "Il calciatore selezionato non appartiene a una squadra della partita."
    );
  }

  // MODIFICA E RICALCOLO IN TRANSAZIONE
  await prisma.$transaction(async (tx) => {
    await tx.gol.update({
      where: {
        id: golId,
      },
      data: {
        calciatoreTorneoId,
        squadraId: calciatoreTorneo.squadraId,
        minuto,
        recupero,
        periodo: periodo as any,
        tipo: tipo as any,
      },
    });

    await ricalcolaRisultatoPartita(
      tx,
      partitaId
    );
  });

  // CACHE
  aggiornaCachePartita(torneoId, partitaId);

  // RITORNO ALLA PARTITA
  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}

// =========================================================
// ELIMINA GOL
// =========================================================

export async function eliminaGol(
  formData: FormData
) {
  await requireAdmin();

  // DATI
  const torneoId = leggiIdPositivo(
    formData.get("torneoId"),
    "Torneo"
  );

  const partitaId = leggiPartitaId(
    formData.get("partitaId")
  );

  const golId = leggiIdPositivo(
    formData.get("golId"),
    "Gol"
  );

  // VERIFICA PARTITA
  const partita = await prisma.partita.findUnique({
    where: {
      id: partitaId,
    },
  });

  if (
    !partita ||
    partita.TorneoId !== torneoId
  ) {
    throw new Error("Partita non trovata.");
  }

  // VERIFICA GOL
  const gol = await prisma.gol.findUnique({
    where: {
      id: golId,
    },
  });

  if (
    !gol ||
    gol.partitaId !== partitaId
  ) {
    throw new Error(
      "Il gol non appartiene a questa partita."
    );
  }

  // ELIMINAZIONE E RICALCOLO IN TRANSAZIONE
  await prisma.$transaction(async (tx) => {
    await tx.gol.delete({
      where: {
        id: golId,
      },
    });

    await ricalcolaRisultatoPartita(
      tx,
      partitaId
    );
  });

  // CACHE
  aggiornaCachePartita(torneoId, partitaId);

  // RITORNO ALLA PARTITA
  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}