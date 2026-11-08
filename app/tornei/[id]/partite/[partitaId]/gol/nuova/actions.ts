"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ricalcolaRankingCompleto } from "@/lib/ranking/ricalcola";
import { ricalcolaRankingAllenatoriCompleto } from "@/lib/rankingAllenatori/ricalcola";

export async function aggiungiGol(formData: FormData) {
  await requireAdmin();

  // DATI FORM
  const torneoId = Number(formData.get("torneoId"));
  const partitaIdValue = String(formData.get("partitaId") || "");
  const calciatoreTorneoId = Number(
    formData.get("calciatoreTorneoId")
  );
  const minuto = Number(formData.get("minuto"));
  const recupero = Number(formData.get("recupero") || 0);
  const periodo = String(formData.get("periodo") || "ST");
  const tipo = String(formData.get("tipo") || "NORMALE");

  // VALIDAZIONE ID PARTITA
  if (!/^\d+$/.test(partitaIdValue)) {
    throw new Error("ID partita non valido.");
  }

  let partitaId: bigint;

  try {
    partitaId = BigInt(partitaIdValue);
  } catch {
    throw new Error("ID partita non valido.");
  }

  if (partitaId <= BigInt(0)) {
    throw new Error("ID partita non valido.");
  }

  if (!Number.isSafeInteger(torneoId) || torneoId <= 0) {
    throw new Error("Torneo non valido.");
  }

  if (
    !Number.isSafeInteger(calciatoreTorneoId) ||
    calciatoreTorneoId <= 0
  ) {
    throw new Error("Calciatore non valido.");
  }

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

  // VERIFICA PARTITA
  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
    select: {
      id: true,
      TorneoId: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      Completata: true,
    },
  });

  if (!partita) {
    throw new Error("Partita non trovata.");
  }

  if (partita.TorneoId !== torneoId) {
    throw new Error(
      "La partita non appartiene a questo torneo."
    );
  }

  if (
    partita.SquadraCasaId === null ||
    partita.SquadraOspiteId === null
  ) {
    throw new Error(
      "La partita deve avere entrambe le squadre assegnate."
    );
  }

  const squadraCasaId = partita.SquadraCasaId;
  const squadraOspiteId = partita.SquadraOspiteId;

  // VERIFICA CALCIATORE
  const calciatoreTorneo =
    await prisma.calciatoreTorneo.findUnique({
      where: { id: calciatoreTorneoId },
      select: {
        id: true,
        torneoId: true,
        squadraId: true,
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

  const squadraId = calciatoreTorneo.squadraId;

  if (
    squadraId !== squadraCasaId &&
    squadraId !== squadraOspiteId
  ) {
    throw new Error(
      "Il calciatore selezionato non appartiene a una squadra della partita."
    );
  }

  // CREAZIONE GOL E RICALCOLO RISULTATO
  await prisma.$transaction(async (tx) => {
    await tx.gol.create({
      data: {
        minuto,
        recupero,
        periodo: periodo as any,
        tipo: tipo as any,
        calciatoreTorneoId,
        partitaId,
        squadraId,
      },
    });

    const golPartita = await tx.gol.findMany({
      where: { partitaId },
      select: {
        squadraId: true,
        tipo: true,
      },
    });

    let golCasa = 0;
    let golOspite = 0;

    for (const gol of golPartita) {
      let squadraCheSegnaId = gol.squadraId;

      if (gol.tipo === "AUTOGOL") {
        if (gol.squadraId === squadraCasaId) {
          squadraCheSegnaId = squadraOspiteId;
        } else if (gol.squadraId === squadraOspiteId) {
          squadraCheSegnaId = squadraCasaId;
        }
      }

      if (squadraCheSegnaId === squadraCasaId) {
        golCasa++;
      } else if (squadraCheSegnaId === squadraOspiteId) {
        golOspite++;
      }
    }

    // Aggiorna il risultato senza cambiare
    // automaticamente lo stato della partita.
    await tx.partita.update({
      where: { id: partitaId },
      data: {
        GolCasa: golCasa,
        GolOspite: golOspite,
      },
    });
  });

  // AGGIORNAMENTO RANKING
  // Una partita in corso non deve modificare i ranking.
  // Se era già conclusa, il risultato è cambiato:
  // ricostruisci entrambi gli storici.
  if (partita.Completata) {
    await ricalcolaRankingCompleto();
    await ricalcolaRankingAllenatoriCompleto();
  }

  // AGGIORNAMENTO CACHE
  revalidatePath(`/tornei/${torneoId}`);
  revalidatePath("/statistiche");

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}/gol/nuova`
  );

  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}