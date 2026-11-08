"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function salvaTrofeoManuale(formData: FormData) {
  const admin = await isAdmin();

  if (!admin) {
    throw new Error("Non autorizzato.");
  }

  const torneoId = Number(formData.get("torneoId"));
  const tipo = String(formData.get("tipo"));
  const calciatoreTorneoIdValue = formData.get("calciatoreTorneoId");
  const nota = String(formData.get("nota") ?? "").trim();

  if (!Number.isInteger(torneoId)) {
    throw new Error("Torneo non valido.");
  }

  const tipiConsentiti = [
    "MIGLIOR_ASSISTMAN",
    "MIGLIOR_PORTIERE",
    "MVP",
    "MIGLIOR_MOMENTO",
  ];

  if (!tipiConsentiti.includes(tipo)) {
    throw new Error("Tipo di trofeo non valido.");
  }

  const torneo = await prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },
  });

  if (!torneo) {
    throw new Error("Torneo non trovato.");
  }

  let calciatoreTorneoId: number | null = null;

  /*
   * I primi tre premi manuali richiedono un giocatore:
   *
   * 🎯 Miglior assistman
   * 🧤 Miglior portiere
   * ⭐ MVP
   *
   * 🔥 Miglior momento invece utilizza solamente la nota.
   */
  if (tipo !== "MIGLIOR_MOMENTO") {
    if (
      calciatoreTorneoIdValue === null ||
      calciatoreTorneoIdValue === ""
    ) {
      throw new Error("Seleziona un giocatore.");
    }

    calciatoreTorneoId = Number(calciatoreTorneoIdValue);

    if (!Number.isInteger(calciatoreTorneoId)) {
      throw new Error("Giocatore non valido.");
    }

    const calciatoreTorneo =
      await prisma.calciatoreTorneo.findFirst({
        where: {
          id: calciatoreTorneoId,
          torneoId,
        },
      });

    if (!calciatoreTorneo) {
      throw new Error(
        "Il giocatore non appartiene a questo torneo."
      );
    }
  }

  if (tipo === "MIGLIOR_MOMENTO" && !nota) {
    throw new Error(
      "Inserisci una descrizione del miglior momento."
    );
  }

  await prisma.trofeo.upsert({
    where: {
      torneoId_tipo: {
        torneoId,
        tipo: tipo as
          | "MIGLIOR_ASSISTMAN"
          | "MIGLIOR_PORTIERE"
          | "MVP"
          | "MIGLIOR_MOMENTO",
      },
    },

    create: {
      torneoId,
      tipo: tipo as
        | "MIGLIOR_ASSISTMAN"
        | "MIGLIOR_PORTIERE"
        | "MVP"
        | "MIGLIOR_MOMENTO",

      calciatoreVincitoreId:
        calciatoreTorneoId,

      nota: nota || null,
    },

    update: {
      calciatoreVincitoreId:
        calciatoreTorneoId,

      nota: nota || null,
    },
  });

  revalidatePath(`/tornei/${torneoId}`);
  revalidatePath(`/tornei/${torneoId}/trofei`);

  redirect(`/tornei/${torneoId}/trofei`);
}

export async function eliminaTrofeoManuale(
  formData: FormData
) {
  const admin = await isAdmin();

  if (!admin) {
    throw new Error("Non autorizzato.");
  }

  const torneoId = Number(formData.get("torneoId"));
  const tipo = String(formData.get("tipo"));

  const tipiConsentiti = [
    "MIGLIOR_ASSISTMAN",
    "MIGLIOR_PORTIERE",
    "MVP",
    "MIGLIOR_MOMENTO",
  ];

  if (!tipiConsentiti.includes(tipo)) {
    throw new Error("Tipo di trofeo non valido.");
  }

  if (!Number.isInteger(torneoId)) {
    throw new Error("Torneo non valido.");
  }

  await prisma.trofeo.deleteMany({
    where: {
      torneoId,
      tipo: tipo as
        | "MIGLIOR_ASSISTMAN"
        | "MIGLIOR_PORTIERE"
        | "MVP"
        | "MIGLIOR_MOMENTO",
    },
  });

  revalidatePath(`/tornei/${torneoId}`);
  revalidatePath(`/tornei/${torneoId}/trofei`);

  redirect(`/tornei/${torneoId}/trofei`);
}