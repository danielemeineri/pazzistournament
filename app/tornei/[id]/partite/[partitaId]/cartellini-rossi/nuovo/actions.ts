"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function aggiungiCartellinoRosso(
formData: FormData
) {
// =========================================================
// 🔐 SOLO ADMIN
// =========================================================

await requireAdmin();

// =========================================================
// DATI FORM
// =========================================================

const torneoId = Number(
formData.get("torneoId")
);

const partitaIdValue = String(
formData.get("partitaId") || ""
);

let partitaId: bigint;

try {
partitaId = BigInt(partitaIdValue);
} catch {
throw new Error(
"ID partita non valido."
);
}

const squadraId = Number(
formData.get("squadraId")
);

const calciatoreTorneoIdValue = String(
formData.get("calciatoreTorneoId") || ""
);

const minutoValue = String(
formData.get("minuto") || ""
);

// =========================================================
// VALIDAZIONE TORNEO
// =========================================================

if (
!Number.isInteger(torneoId) ||
torneoId <= 0
) {
throw new Error(
"Torneo non valido."
);
}

// =========================================================
// VALIDAZIONE SQUADRA
// =========================================================

if (
!Number.isInteger(squadraId) ||
squadraId <= 0
) {
throw new Error(
"Squadra non valida."
);
}

// =========================================================
// VALIDAZIONE PARTITA
// =========================================================

if (!partitaIdValue) {
throw new Error(
"Partita non valida."
);
}

// =========================================================
// VERIFICA PARTITA
// =========================================================

const partita =
await prisma.partita.findUnique({
where: {
id: partitaId,
},

  include: {
    squadraCasa: true,
    squadraOspite: true,
  },
});

if (!partita) {
throw new Error(
"Partita non trovata."
);
}

// =========================================================
// VERIFICA TORNEO
// =========================================================

if (
partita.TorneoId !== torneoId
) {
throw new Error(
"La partita non appartiene a questo torneo."
);
}

// =========================================================
// VERIFICA SQUADRA
// =========================================================

if (
squadraId !== partita.SquadraCasaId &&
squadraId !== partita.SquadraOspiteId
) {
throw new Error(
"La squadra selezionata non appartiene a questa partita."
);
}

// =========================================================
// CALCIATORE
// =========================================================

let calciatoreTorneoId: number | null =
null;

if (
calciatoreTorneoIdValue !== ""
) {
const parsedCalciatoreId = Number(
calciatoreTorneoIdValue
);

if (
  !Number.isInteger(
    parsedCalciatoreId
  ) ||
  parsedCalciatoreId <= 0
) {
  throw new Error(
    "Calciatore non valido."
  );
}

calciatoreTorneoId =
  parsedCalciatoreId;

// =======================================================
// VERIFICA CALCIATORE
// =======================================================

const calciatoreTorneo =
  await prisma.calciatoreTorneo.findUnique({
    where: {
      id: calciatoreTorneoId,
    },
  });

if (!calciatoreTorneo) {
  throw new Error(
    "Calciatore non trovato."
  );
}

// =======================================================
// VERIFICA TORNEO CALCIATORE
// =======================================================

if (
  calciatoreTorneo.torneoId !==
  torneoId
) {
  throw new Error(
    "Il calciatore non appartiene a questo torneo."
  );
}

// =======================================================
// VERIFICA SQUADRA CALCIATORE
// =======================================================

if (
  calciatoreTorneo.squadraId !==
  squadraId
) {
  throw new Error(
    "Il calciatore selezionato non appartiene alla squadra indicata."
  );
}

}

// =========================================================
// MINUTO
// =========================================================

let minuto: number | null = null;

if (minutoValue !== "") {
const parsedMinuto = Number(
minutoValue
);

if (
  !Number.isInteger(parsedMinuto) ||
  parsedMinuto < 1 ||
  parsedMinuto > 130
) {
  throw new Error(
    "Il minuto deve essere compreso tra 1 e 130."
  );
}

minuto = parsedMinuto;

}

// =========================================================
// CREA CARTELLINO ROSSO
// =========================================================

await prisma.cartellinoRosso.create({
data: {
partitaId,

  calciatoreTorneoId,

  squadraId,

  minuto,
},

});

// =========================================================
// AGGIORNA CACHE
// =========================================================

revalidatePath(
`/tornei/${torneoId}`
);

revalidatePath(
`/tornei/${torneoId}/partite/${partitaId.toString()}`
);

revalidatePath(
`/tornei/${torneoId}/partite/${partitaId.toString()}/cartellini-rossi/nuovo`
);

// =========================================================
// TORNA ALLA PARTITA
// =========================================================

redirect(
`/tornei/${torneoId}/partite/${partitaId.toString()}`
);
}
