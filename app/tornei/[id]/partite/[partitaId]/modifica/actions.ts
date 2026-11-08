
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

  const giornataValue = String(formData.get("giornata") ?? "");
  const giornata = Number(giornataValue);

  const numeroGaraValue = String(formData.get("numeroGara") || "1");
  const numeroGara = Number(numeroGaraValue);

  const golCasaValue = String(formData.get("golCasa") ?? "");
  const golOspiteValue = String(formData.get("golOspite") ?? "");

  const partitaConclusa = formData.get("partitaConclusa") === "on";
  const aiRigori = formData.get("aiRigori") === "on";

  const rigoriCasaValue = String(formData.get("rigoriCasa") ?? "");
  const rigoriOspiteValue = String(formData.get("rigoriOspite") ?? "");

  const sostitutoCasaValue = String(
    formData.get("sostitutoCasaId") ?? ""
  ).trim();

  const sostitutoOspiteValue = String(
    formData.get("sostitutoOspiteId") ?? ""
  ).trim();

  const sostitutoCasaId =
    sostitutoCasaValue === "" ? null : Number(sostitutoCasaValue);

  const sostitutoOspiteId =
    sostitutoOspiteValue === "" ? null : Number(sostitutoOspiteValue);

  // ==================================================
  // VALIDAZIONE GENERALE
  // ==================================================

  if (
    !Number.isSafeInteger(torneoId) ||
    torneoId <= 0 ||
    !partitaIdValue ||
    partitaId <= BigInt(0) ||
    !Number.isSafeInteger(squadraCasaId) ||
    squadraCasaId <= 0 ||
    !Number.isSafeInteger(squadraOspiteId) ||
    squadraOspiteId <= 0 ||
    !dataPartitaValue ||
    !fase
  ) {
    throw new Error("Compila correttamente tutti i campi obbligatori.");
  }

  if (squadraCasaId === squadraOspiteId) {
    throw new Error(
      "La squadra di casa e quella ospite devono essere diverse."
    );
  }

  if (!Number.isSafeInteger(giornata) || giornata < 0) {
    throw new Error("La giornata non è valida.");
  }

  if (!Number.isSafeInteger(numeroGara) || numeroGara < 1) {
    throw new Error("Il numero della gara non è valido.");
  }

  for (const [nome, id] of [
    ["sostituto di casa", sostitutoCasaId],
    ["sostituto ospite", sostitutoOspiteId],
  ] as const) {
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) {
      throw new Error(`Il ${nome} selezionato non è valido.`);
    }
  }

  if (
    sostitutoCasaId !== null &&
    sostitutoCasaId === sostitutoOspiteId
  ) {
    throw new Error(
      "Lo stesso partecipante non può essere sostituto di entrambe le squadre."
    );
  }

  // ==================================================
  // RECUPERO PARTITA ESISTENTE
  // ==================================================

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
  });

  if (!partita) {
    throw new Error("Partita non trovata.");
  }

  if (partita.TorneoId !== torneoId) {
    throw new Error("La partita non appartiene a questo torneo.");
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
      partecipanteId: true,
    },
  });

  const partecipazioneCasa = partecipazioni.find(
    (p) => p.squadraId === squadraCasaId
  );

  const partecipazioneOspite = partecipazioni.find(
    (p) => p.squadraId === squadraOspiteId
  );

  if (!partecipazioneCasa || !partecipazioneOspite) {
    throw new Error(
      "Una delle squadre selezionate non appartiene a questo torneo."
    );
  }

  // ==================================================
  // CONTROLLO SOSTITUTI
  // ==================================================

  if (
    sostitutoCasaId !== null &&
    sostitutoCasaId === partecipazioneCasa.partecipanteId
  ) {
    throw new Error(
      "Il sostituto di casa non può essere lo stesso partecipante titolare."
    );
  }

  if (
    sostitutoOspiteId !== null &&
    sostitutoOspiteId === partecipazioneOspite.partecipanteId
  ) {
    throw new Error(
      "Il sostituto ospite non può essere lo stesso partecipante titolare."
    );
  }

  const idsSostituti = [
    sostitutoCasaId,
    sostitutoOspiteId,
  ].filter((id): id is number => id !== null);

  if (idsSostituti.length > 0) {
    const sostitutiEsistenti = await prisma.partecipante.findMany({
      where: {
        id: { in: idsSostituti },
      },
      select: { id: true },
    });

    const idsEsistenti = new Set(
      sostitutiEsistenti.map((p) => p.id)
    );

    if (idsSostituti.some((id) => !idsEsistenti.has(id))) {
      throw new Error("Uno dei sostituti selezionati non esiste.");
    }
  }

  // ==================================================
  // DATA
  // ==================================================

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPartitaValue)) {
    throw new Error("La data della partita non è valida.");
  }

  const dataPartita = new Date(`${dataPartitaValue}T12:00:00`);

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

    oraPartita = new Date(`1970-01-01T${oraPartitaValue}:00`);
  }

  // ==================================================
  // RISULTATO MANUALE
  // ==================================================

  let golCasaManuale: number | null = null;
  let golOspiteManuale: number | null = null;

  if (golCasaValue !== "") {
    golCasaManuale = Number(golCasaValue);

    if (!Number.isSafeInteger(golCasaManuale) || golCasaManuale < 0) {
      throw new Error(
        "Il numero di gol della squadra di casa non è valido."
      );
    }
  }

  if (golOspiteValue !== "") {
    golOspiteManuale = Number(golOspiteValue);

    if (!Number.isSafeInteger(golOspiteManuale) || golOspiteManuale < 0) {
      throw new Error(
        "Il numero di gol della squadra ospite non è valido."
      );
    }
  }

  // ==================================================
  // RIGORI
  // ==================================================

  let rigoriCasa: number | null = null;
  let rigoriOspite: number | null = null;

  if (rigoriCasaValue !== "") {
    rigoriCasa = Number(rigoriCasaValue);

    if (!Number.isSafeInteger(rigoriCasa) || rigoriCasa < 0) {
      throw new Error(
        "Il numero dei rigori della squadra di casa non è valido."
      );
    }
  }

  if (rigoriOspiteValue !== "") {
    rigoriOspite = Number(rigoriOspiteValue);

    if (!Number.isSafeInteger(rigoriOspite) || rigoriOspite < 0) {
      throw new Error(
        "Il numero dei rigori della squadra ospite non è valido."
      );
    }
  }

  if (
    aiRigori &&
    (
      rigoriCasa === null ||
      rigoriOspite === null ||
      rigoriCasa === rigoriOspite
    )
  ) {
    throw new Error(
      "Inserisci un risultato valido dei rigori, con punteggi diversi."
    );
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
  // VERIFICA MODIFICHE AL RANKING
  // ==================================================

  const dataPrecedente = partita.dataPartita
    ? partita.dataPartita.toISOString().slice(0, 10)
    : null;

  const datiRankingCambiati =
    partita.SquadraCasaId !== squadraCasaId ||
    partita.SquadraOspiteId !== squadraOspiteId ||
    partita.GolCasa !== golCasa ||
    partita.GolOspite !== golOspite ||
    partita.Fase !== fase ||
    dataPrecedente !== dataPartitaValue ||
    partita.AiRigori !== aiRigori ||
    partita.RigoriCasa !== rigoriCasa ||
    partita.RigoriOspite !== rigoriOspite;

  const sostitutiCambiati =
    partita.sostitutoCasaId !== sostitutoCasaId ||
    partita.sostitutoOspiteId !== sostitutoOspiteId;

  const statoCompletamentoCambiato =
    partita.Completata !== partitaConclusa;

  const partitaCoinvoltaNelRanking =
    partita.Completata === true || partitaConclusa;

  const ricalcoloNecessario =
    partitaCoinvoltaNelRanking &&
    (
      statoCompletamentoCambiato ||
      datiRankingCambiati
    );

  const ricalcoloAllenatoriNecessario =
    partitaCoinvoltaNelRanking &&
    (
      statoCompletamentoCambiato ||
      datiRankingCambiati ||
      sostitutiCambiati
    );

  // ==================================================
  // SALVATAGGIO PARTITA
  // ==================================================

  await prisma.partita.update({
    where: { id: partitaId },
    data: {
      SquadraCasaId: squadraCasaId,
      SquadraOspiteId: squadraOspiteId,
      dataPartita,
      OraPartita: oraPartita,
      Fase: fase,
      giornata,
      NumeroGara: numeroGara,
      GolCasa: golCasa,
      GolOspite: golOspite,
      Completata: partitaConclusa,
      AiRigori: aiRigori,
      RigoriCasa: rigoriCasa,
      RigoriOspite: rigoriOspite,
      sostitutoCasaId,
      sostitutoOspiteId,
    },
  });

  // ==================================================
  // RICALCOLO RANKING SQUADRE
  // ==================================================

  if (ricalcoloNecessario) {
    await ricalcolaRankingCompleto();
  }

  // ==================================================
  // RICALCOLO RANKING ALLENATORI
  // ==================================================

  if (ricalcoloAllenatoriNecessario) {
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
  revalidatePath("/statistiche");

  redirect(`/tornei/${torneoId}`);
}

// ==================================================
// ELIMINA PARTITA
// ==================================================

export async function eliminaPartita(formData: FormData) {
  await requireAdmin();

  const torneoId = Number(String(formData.get("torneoId") || ""));
  const partitaIdValue = String(formData.get("partitaId") || "");

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
    throw new Error("La partita non appartiene a questo torneo.");
  }

  const eraCompletata = partita.Completata === true;

  await prisma.partita.delete({
    where: { id: partitaId },
  });

  if (eraCompletata) {
    await ricalcolaRankingCompleto();
    await ricalcolaRankingAllenatoriCompleto();
  }

  revalidatePath(`/tornei/${torneoId}`);
  revalidatePath("/statistiche");

  redirect(`/tornei/${torneoId}`);
}

// ==================================================
// ELIMINA GOL
// ==================================================

export async function eliminaGol(formData: FormData) {
  await requireAdmin();

  const torneoId = Number(String(formData.get("torneoId") || ""));
  const partitaIdValue = String(formData.get("partitaId") || "");
  const golId = Number(String(formData.get("golId") || ""));

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
    partitaId <= BigInt(0) ||
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
    throw new Error("La partita non appartiene a questo torneo.");
  }

  if (
    partita.SquadraCasaId === null ||
    partita.SquadraOspiteId === null
  ) {
    throw new Error(
      "La partita non ha entrambe le squadre associate."
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
    throw new Error("Il gol non appartiene a questa partita.");
  }

  // ==================================================
  // ELIMINAZIONE GOL E RICALCOLO RISULTATO
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

    await tx.partita.update({
      where: { id: partitaId },
      data: {
        GolCasa: golCasa,
        GolOspite: golOspite,
      },
    });
  });

  // Se la partita era conclusa, entrambi i ranking devono
  // essere ricostruiti dopo la modifica del risultato.
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
  revalidatePath("/statistiche");

  redirect(
    `/tornei/${torneoId}/partite/${partitaId.toString()}`
  );
}
