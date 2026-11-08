
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ricalcolaRankingCompleto } from "@/lib/ranking/ricalcola";
import { ricalcolaRankingAllenatoriCompleto } from "@/lib/rankingAllenatori/ricalcola";

// ==================================================
// MODIFICA PARTITA
// ==================================================

export async function modificaPartita(formData: FormData) {
  await requireAdmin();

  const torneoIdValue = String(formData.get("torneoId") || "");
  const partitaIdValue = String(formData.get("partitaId") || "");

  const torneoId = Number(torneoIdValue);

  let partitaId: bigint;

  try {
    partitaId = BigInt(partitaIdValue);
  } catch {
    throw new Error("ID partita non valido.");
  }

  const squadraCasaId = Number(formData.get("squadraCasaId"));
  const squadraOspiteId = Number(formData.get("squadraOspiteId"));

  const dataPartitaValue = String(formData.get("dataPartita") || "");
  const oraPartitaValue = String(formData.get("oraPartita") || "");
  const fase = String(formData.get("fase") || "").trim();

  const golCasaValue = String(formData.get("golCasa") ?? "");
  const golOspiteValue = String(formData.get("golOspite") ?? "");

  // ==================================================
  // VALIDAZIONE
  // ==================================================

  if (
    !Number.isSafeInteger(torneoId) ||
    torneoId <= 0 ||
    !partitaIdValue ||
    partitaId <= BigInt(0)||
    !Number.isSafeInteger(squadraCasaId) ||
    squadraCasaId <= 0 ||
    !Number.isSafeInteger(squadraOspiteId) ||
    squadraOspiteId <= 0 ||
    !dataPartitaValue ||
    !fase
  ) {
    throw new Error(
      "Compila correttamente tutti i campi obbligatori."
    );
  }

  if (squadraCasaId === squadraOspiteId) {
    throw new Error(
      "La squadra di casa e quella ospite devono essere diverse."
    );
  }

  // ==================================================
  // RECUPERO PARTITA
  // ==================================================

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
  });

  if (!partita) {
    throw new Error("Partita non trovata.");
  }

  if (partita.TorneoId !== torneoId) {
    throw new Error(
      "La partita non appartiene a questo torneo."
    );
  }

  // ==================================================
  // CONTROLLO PARTECIPAZIONI
  // ==================================================

  const partecipazioni = await prisma.partecipazione.findMany({
    where: {
      torneoId,
      squadraId: {
        in: [squadraCasaId, squadraOspiteId],
      },
    },
    select: {
      squadraId: true,
    },
  });

  const squadreValide = new Set(
    partecipazioni.map((p) => p.squadraId)
  );

  if (
    !squadreValide.has(squadraCasaId) ||
    !squadreValide.has(squadraOspiteId)
  ) {
    throw new Error(
      "Una delle squadre selezionate non appartiene a questo torneo."
    );
  }

  // ==================================================
  // DATA
  // ==================================================

  // Formato rigoroso e controllo delle date realmente esistenti.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPartitaValue)) {
    throw new Error("La data della partita non è valida.");
  }

  const dataPartita = new Date(`${dataPartitaValue}T12:00:00.000Z`);
  if (
    Number.isNaN(dataPartita.getTime()) ||
    dataPartita.toISOString().slice(0, 10) !== dataPartitaValue
  ) {
    throw new Error("La data della partita non è valida.");
  }

  // ==================================================
  // ORA
  // ==================================================

  let oraPartita: Date | null = null;

  if (oraPartitaValue) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(oraPartitaValue)) {
      throw new Error("L'ora della partita non è valida.");
    }

    oraPartita = new Date(
      `1970-01-01T${oraPartitaValue}:00`
    );
  }

  // ==================================================
  // RISULTATO MANUALE
  // ==================================================

  let golCasaManuale: number | null = null;
  let golOspiteManuale: number | null = null;

  if (golCasaValue !== "") {
    golCasaManuale = Number(golCasaValue);

    if (
      !Number.isSafeInteger(golCasaManuale) ||
      golCasaManuale < 0
    ) {
      throw new Error(
        "Il numero di gol della squadra di casa non è valido."
      );
    }
  }

  if (golOspiteValue !== "") {
    golOspiteManuale = Number(golOspiteValue);

    if (
      !Number.isSafeInteger(golOspiteManuale) ||
      golOspiteManuale < 0
    ) {
      throw new Error(
        "Il numero di gol della squadra ospite non è valido."
      );
    }
  }

  // ==================================================
  // RECUPERO MARCATORI
  // ==================================================

  const marcatori = await prisma.gol.findMany({
    where: { partitaId },
    select: {
      squadraId: true,
      tipo: true,
    },
  });

  // I marcatori sono associati alle squadre originarie: cambiarle
  // senza riallineare i gol produrrebbe risultati incoerenti.
  if (
    marcatori.length > 0 &&
    (partita.SquadraCasaId !== squadraCasaId ||
      partita.SquadraOspiteId !== squadraOspiteId)
  ) {
    throw new Error(
      "Non puoi cambiare le squadre di una partita con marcatori registrati. Elimina prima i gol."
    );
  }

  // Impedisce i duplicati secondo la stessa regola usata in creazione.
  // NumeroGara non viene modificato da questa action.
  const partitaDuplicata = await prisma.partita.findFirst({
    where: {
      TorneoId: torneoId,
      Fase: fase,
      NumeroGara: partita.NumeroGara,
      id: { not: partitaId },
      OR: [
        { SquadraCasaId: squadraCasaId, SquadraOspiteId: squadraOspiteId },
        { SquadraCasaId: squadraOspiteId, SquadraOspiteId: squadraCasaId },
      ],
    },
    select: { id: true },
  });
  if (partitaDuplicata) {
    throw new Error("Questa partita esiste già.");
  }

  // ==================================================
  // CALCOLO RISULTATO
  // ==================================================

  let golCasa = golCasaManuale;
  let golOspite = golOspiteManuale;

  if (marcatori.length > 0) {
    golCasa = 0;
    golOspite = 0;

    for (const gol of marcatori) {
      let squadraCheSegna = gol.squadraId;

      if (gol.tipo === "AUTOGOL") {
        if (gol.squadraId === squadraCasaId) {
          squadraCheSegna = squadraOspiteId;
        } else if (gol.squadraId === squadraOspiteId) {
          squadraCheSegna = squadraCasaId;
        }
      }

      if (squadraCheSegna === squadraCasaId) {
        golCasa++;
      } else if (squadraCheSegna === squadraOspiteId) {
        golOspite++;
      }
    }
  }

  // ==================================================
  // VERIFICA CAMBIAMENTI CHE INFLUENZANO IL RANKING
  // ==================================================

  const datiRankingCambiati =
    partita.SquadraCasaId !== squadraCasaId ||
    partita.SquadraOspiteId !== squadraOspiteId ||
    partita.GolCasa !== golCasa ||
    partita.GolOspite !== golOspite ||
    partita.Fase !== fase ||
    partita.dataPartita?.getTime() !== dataPartita.getTime();

  // ==================================================
  // AGGIORNAMENTO PARTITA
  // ==================================================

  await prisma.partita.update({
    where: { id: partitaId },
    data: {
      SquadraCasaId: squadraCasaId,
      SquadraOspiteId: squadraOspiteId,
      dataPartita,
      OraPartita: oraPartita,
      Fase: fase,
      GolCasa: golCasa,
      GolOspite: golOspite,

      // Completata non viene modificata.
    },
  });

  // Ricalcola soltanto se la partita era già completata
  // e sono cambiati dati utilizzati dal ranking.
  if (partita.Completata === true && datiRankingCambiati) {
    await ricalcolaRankingCompleto();
    await ricalcolaRankingAllenatoriCompleto();
  }

  // ==================================================
  // CACHE
  // ==================================================

  revalidatePath(`/tornei/${torneoId}`);

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}/modifica`
  );

  redirect(`/tornei/${torneoId}`);
}

// ==================================================
// ELIMINA PARTITA
// ==================================================

export async function eliminaPartita(formData: FormData) {
  await requireAdmin();

  const torneoIdValue = String(formData.get("torneoId") || "");
  const partitaIdValue = String(formData.get("partitaId") || "");

  const torneoId = Number(torneoIdValue);

  let partitaId: bigint;

  try {
    partitaId = BigInt(partitaIdValue);
  } catch {
    throw new Error("ID partita non valido.");
  }

  if (
    !Number.isSafeInteger(torneoId) ||
    torneoId <= 0 ||
    !partitaIdValue ||
    partitaId <= BigInt(0)
  ) {
    throw new Error("Dati partita non validi.");
  }

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
  });

  if (!partita) {
    throw new Error("Partita non trovata.");
  }

  if (partita.TorneoId !== torneoId) {
    throw new Error(
      "La partita non appartiene a questo torneo."
    );
  }

  // Salviamo lo stato prima della cancellazione.
  const eraCompletata = partita.Completata === true;

  await prisma.partita.delete({
    where: { id: partitaId },
  });

  // Se la partita contribuiva al ranking, lo ricostruiamo
  // dopo aver eliminato la partita.
  if (eraCompletata) {
    await ricalcolaRankingCompleto();
    await ricalcolaRankingAllenatoriCompleto();
  }

  revalidatePath(`/tornei/${torneoId}`);

  redirect(`/tornei/${torneoId}`);
}

// ==================================================
// ELIMINA GOL
// ==================================================

export async function eliminaGol(formData: FormData) {
  await requireAdmin();

  const torneoIdValue = String(formData.get("torneoId") || "");
  const partitaIdValue = String(formData.get("partitaId") || "");
  const golIdValue = String(formData.get("golId") || "");

  const torneoId = Number(torneoIdValue);

  let partitaId: bigint;

  try {
    partitaId = BigInt(partitaIdValue);
  } catch {
    throw new Error("ID partita non valido.");
  }

  const golId = Number(golIdValue);

  if (
    !Number.isSafeInteger(torneoId) ||
    torneoId <= 0 ||
    !partitaIdValue ||
    partitaId <= BigInt(0)||
    !Number.isSafeInteger(golId) ||
    golId <= 0
  ) {
    throw new Error("Dati non validi.");
  }

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
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
      "La partita non ha entrambe le squadre assegnate."
    );
  }

  const squadraCasaId = partita.SquadraCasaId;
  const squadraOspiteId = partita.SquadraOspiteId;

  const gol = await prisma.gol.findUnique({
    where: { id: golId },
    select: {
      id: true,
      partitaId: true,
    },
  });

  if (!gol) {
    throw new Error("Gol non trovato.");
  }

  if (gol.partitaId !== partitaId) {
    throw new Error(
      "Il gol non appartiene a questa partita."
    );
  }

  // ==================================================
  // ELIMINAZIONE E RICALCOLO RISULTATO
  // ==================================================

  await prisma.$transaction(async (tx) => {
    await tx.gol.delete({
      where: { id: golId },
    });

    const tuttiIGol = await tx.gol.findMany({
      where: { partitaId },
      select: {
        squadraId: true,
        tipo: true,
      },
    });

    let golCasa = 0;
    let golOspite = 0;

    for (const g of tuttiIGol) {
      let squadraCheSegna = g.squadraId;

      if (g.tipo === "AUTOGOL") {
        if (g.squadraId === squadraCasaId) {
          squadraCheSegna = squadraOspiteId;
        } else if (g.squadraId === squadraOspiteId) {
          squadraCheSegna = squadraCasaId;
        }
      }

      if (squadraCheSegna === squadraCasaId) {
        golCasa++;
      } else if (squadraCheSegna === squadraOspiteId) {
        golOspite++;
      }
    }

    // Aggiorna il risultato, senza modificare Completata.
    await tx.partita.update({
      where: { id: partitaId },
      data: {
        GolCasa: golCasa,
        GolOspite: golOspite,
      },
    });
  });

  // Se era completata, la modifica del risultato
  // richiede il ricalcolo del ranking.
  if (partita.Completata === true) {
    await ricalcolaRankingCompleto();
    await ricalcolaRankingAllenatoriCompleto();
  }

  revalidatePath(`/tornei/${torneoId}`);

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );

  revalidatePath(
    `/tornei/${torneoId}/partite/${partitaId.toString()}/modifica`
  );

  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}
