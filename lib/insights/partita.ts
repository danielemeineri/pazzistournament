import { prisma } from "@/lib/prisma";
import {
  calcolaSerie,
  getSerieGlobali,
  type EventoSerie,
  type PartitaSerie,
} from "@/lib/statistiche/serie";

// =========================================================
// PAZZI INSIGHTS 2.0 — MOTORE PARTITA
// =========================================================
// Usa lo stesso storico e le stesse regole delle serie globali.
// Non scrive nel database e non modifica statistiche esistenti.

export type PazziInsight = {
  id: string;
  tipo: "TRAGUARDO" | "STORIA" | "CURIOSITA";
  titolo: string;
  descrizione: string;
  icona: "trofeo" | "stella" | "sfida";
  priorita: number;
};

const TRAGUARDI = new Set([
  10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000,
]);

const SERIE_IMPORTANTI = new Set([3, 5, 7, 10, 15, 20, 25, 30, 50]);

// L'ordinamento replica quello usato da lib/statistiche/serie.ts.
function confrontaPartite(a: PartitaSerie, b: PartitaSerie): number {
  if (a.dataPartita && b.dataPartita) {
    const differenzaData = a.dataPartita.getTime() - b.dataPartita.getTime();
    if (differenzaData !== 0) return differenzaData;

    if (a.oraPartita && b.oraPartita) {
      const ora = (d: Date) =>
        d.getUTCHours() * 3600000 +
        d.getUTCMinutes() * 60000 +
        d.getUTCSeconds() * 1000 +
        d.getUTCMilliseconds();
      const differenzaOra = ora(a.oraPartita) - ora(b.oraPartita);
      if (differenzaOra !== 0) return differenzaOra;
    }
  }

  const idA = BigInt(a.id);
  const idB = BigInt(b.id);
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}

function eventiFinoAllaPartita(
  eventi: EventoSerie[],
  partitaCorrente: PartitaSerie,
): EventoSerie[] {
  return eventi.filter(
    (evento) => confrontaPartite(evento.partita, partitaCorrente) <= 0,
  );
}

function aggiungiTraguardo(
  insights: PazziInsight[],
  chiave: string,
  nome: string,
  numero: number,
  soggetto: "squadra" | "allenatore",
  cosa: "partite" | "vittorie",
): void {
  if (!TRAGUARDI.has(numero)) return;

  insights.push({
    id: `${chiave}-${cosa}-${numero}`,
    tipo: "TRAGUARDO",
    titolo: `${numero} ${cosa}!`,
    descrizione: `${nome} raggiunge quota ${numero} ${cosa} ${
      soggetto === "squadra" ? "nella storia" : "in carriera"
    } su PazziTournament.`,
    icona: "trofeo",
    priorita: cosa === "vittorie" ? 95 : 90,
  });
}

function aggiungiSerie(
  insights: PazziInsight[],
  chiave: string,
  nome: string,
  eventi: EventoSerie[],
): void {
  const serie = calcolaSerie(eventi);

  if (SERIE_IMPORTANTI.has(serie.vittorieAttuali)) {
    insights.push({
      id: `${chiave}-serie-vittorie-${serie.vittorieAttuali}`,
      tipo: "CURIOSITA",
      titolo: `${serie.vittorieAttuali} vittorie consecutive`,
      descrizione: `${nome} conquista la ${serie.vittorieAttuali}ª vittoria consecutiva.`,
      icona: "stella",
      priorita: 82,
    });
  }

  if (
    SERIE_IMPORTANTI.has(serie.imbattibilitaAttuale) &&
    serie.imbattibilitaAttuale !== serie.vittorieAttuali
  ) {
    insights.push({
      id: `${chiave}-serie-imbattibilita-${serie.imbattibilitaAttuale}`,
      tipo: "CURIOSITA",
      titolo: `${serie.imbattibilitaAttuale} partite senza sconfitte`,
      descrizione: `${nome} raggiunge ${serie.imbattibilitaAttuale} incontri consecutivi senza perdere.`,
      icona: "stella",
      priorita: 78,
    });
  }
}

export async function getPazziInsightsPartita(
  partitaId: bigint | string,
): Promise<PazziInsight[]> {
  let id: bigint;
  try {
    id = BigInt(partitaId);
  } catch {
    return [];
  }

  const partita = await prisma.partita.findUnique({
    where: { id },
    select: {
      id: true,
      TorneoId: true,
      Completata: true,
      GolCasa: true,
      GolOspite: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      dataPartita: true,
      OraPartita: true,
      sostitutoCasaId: true,
      sostitutoOspiteId: true,
      squadraCasa: { select: { id: true, nome: true } },
      squadraOspite: { select: { id: true, nome: true } },
    },
  });

  if (
    !partita ||
    partita.SquadraCasaId === null ||
    partita.SquadraOspiteId === null
  ) {
    return [];
  }

  // PREPARTITA: una sola partita riceve ogni traguardo previsto.
  // Le partite future già inserite occupano una posizione nella sequenza;
  // le partite concluse valgono come incontri realmente disputati.
  if (!partita.Completata) {
    type PartitaCalendario = {
      id: bigint;
      dataPartita: Date | null;
      OraPartita: Date | null;
      Completata: boolean | null;
      TorneoId: number;
      SquadraCasaId: number | null;
      SquadraOspiteId: number | null;
      sostitutoCasaId: number | null;
      sostitutoOspiteId: number | null;
    };

    // Senza data non è possibile garantire a quale giornata
    // appartenga un traguardo futuro: evitiamo annunci ambigui.
    if (!partita.dataPartita) return [];

    const calendario: PartitaCalendario[] = await prisma.partita.findMany({
      where: {
        SquadraCasaId: { not: null },
        SquadraOspiteId: { not: null },
        OR: [
          { Completata: false },
          { Completata: null },
          { Completata: true, GolCasa: { not: null }, GolOspite: { not: null } },
        ],
      },
      select: {
        id: true,
        dataPartita: true,
        OraPartita: true,
        Completata: true,
        TorneoId: true,
        SquadraCasaId: true,
        SquadraOspiteId: true,
        sostitutoCasaId: true,
        sostitutoOspiteId: true,
      },
    });

    // Stessa regola cronologica del modulo serie.ts: data, ora
    // (quando entrambe presenti), poi ID. Per le date mancanti
    // non assegniamo arbitrariamente un traguardo futuro.
    const ordinati = calendario
      .filter((p) => p.dataPartita !== null)
      .sort((a, b) =>
        confrontaPartite(
          { id: a.id.toString(), dataPartita: a.dataPartita, oraPartita: a.OraPartita } as PartitaSerie,
          { id: b.id.toString(), dataPartita: b.dataPartita, oraPartita: b.OraPartita } as PartitaSerie,
        ),
      );
    const indice = ordinati.findIndex((p) => p.id === id);
    if (indice < 0) return [];

    const prima = ordinati.slice(0, indice);
    const insights: PazziInsight[] = [];
    const squadre = [partita.squadraCasa, partita.squadraOspite].filter(
      (s): s is NonNullable<typeof s> => s !== null,
    );

    for (const squadra of squadre) {
      const precedenti = prima.filter(
        (p) => p.SquadraCasaId === squadra.id || p.SquadraOspiteId === squadra.id,
      );
      const numero = precedenti.length + 1;
      if (!TRAGUARDI.has(numero)) continue;
      const inAttesa = precedenti.filter((p) => !p.Completata).length;
      insights.push({
        id: `pre-squadra-${squadra.id}-${numero}`,
        tipo: "TRAGUARDO",
        titolo: `Traguardo in arrivo: ${numero} partite`,
        descrizione: `${squadra.nome} si prepara a disputare la sua ${numero}ª partita su PazziTournament.${inAttesa ? ` Il conteggio è previsto dal calendario e dipende da ${inAttesa} ${inAttesa === 1 ? "incontro precedente ancora da disputare" : "incontri precedenti ancora da disputare"}.` : ""}`,
        icona: "trofeo",
        priorita: 100,
      });
    }

    // Allenatori: titolare per torneo/squadra, sostituto prioritario.
    const partecipazioni = await prisma.partecipazione.findMany({
      where: { torneoId: { in: [...new Set(ordinati.map((p) => p.TorneoId))] } },
      select: { torneoId: true, squadraId: true, partecipanteId: true },
    });
    const titolari = new Map(
      partecipazioni.map((p) => [`${p.torneoId}:${p.squadraId}`, p.partecipanteId] as const),
    );
    function allenatore(p: PartitaCalendario, lato: "casa" | "ospite"): number | null {
      const squadraId = lato === "casa" ? p.SquadraCasaId : p.SquadraOspiteId;
      if (squadraId === null) return null;
      return (lato === "casa" ? p.sostitutoCasaId : p.sostitutoOspiteId)
        ?? titolari.get(`${p.TorneoId}:${squadraId}`) ?? null;
    }
    const allenatoriCorrenti = [...new Set([
      allenatore(partita, "casa"),
      allenatore(partita, "ospite"),
    ].filter((x): x is number => x !== null))];
    if (allenatoriCorrenti.length) {
      const nomi = await prisma.partecipante.findMany({
        where: { id: { in: allenatoriCorrenti } },
        select: { id: true, nome: true },
      });
      for (const persona of nomi) {
        const precedenti = prima.filter(
          (p) => allenatore(p, "casa") === persona.id || allenatore(p, "ospite") === persona.id,
        );
        const numero = precedenti.length + 1;
        if (!TRAGUARDI.has(numero)) continue;
        const inAttesa = precedenti.filter((p) => !p.Completata).length;
        insights.push({
          id: `pre-allenatore-${persona.id}-${numero}`,
          tipo: "TRAGUARDO",
          titolo: `Traguardo in arrivo: ${numero} partite`,
          descrizione: `${persona.nome} si prepara alla sua ${numero}ª partita da allenatore su PazziTournament.${inAttesa ? ` Il conteggio dipende da ${inAttesa} ${inAttesa === 1 ? "incontro precedente ancora da disputare" : "incontri precedenti ancora da disputare"}.` : ""}`,
          icona: "stella",
          priorita: 105,
        });
      }
    }
    return insights.sort((a, b) => b.priorita - a.priorita || a.id.localeCompare(b.id));
  }

  if (partita.GolCasa === null || partita.GolOspite === null) return [];

  const storico = await getSerieGlobali();

  const entitaCasa = storico.squadre.find(
    (s) => s.id === partita.SquadraCasaId,
  );
  const entitaOspite = storico.squadre.find(
    (s) => s.id === partita.SquadraOspiteId,
  );

  const partitaCorrente =
    entitaCasa?.eventi.find((e) => e.partita.id === id.toString())?.partita ??
    entitaOspite?.eventi.find((e) => e.partita.id === id.toString())?.partita;

  if (!partitaCorrente) return [];

  const insights: PazziInsight[] = [];
  const squadreCorrenti = [entitaCasa, entitaOspite].filter(
    (s): s is NonNullable<typeof s> => s !== undefined,
  );

  // =======================================================
  // TRAGUARDI E SERIE DELLE SQUADRE
  // =======================================================
  for (const squadra of squadreCorrenti) {
    const eventi = eventiFinoAllaPartita(squadra.eventi, partitaCorrente);
    const chiave = `squadra-${squadra.id}`;

    aggiungiTraguardo(
      insights, chiave, squadra.nome, eventi.length, "squadra", "partite",
    );
    aggiungiTraguardo(
      insights,
      chiave,
      squadra.nome,
      eventi.filter((e) => e.esito === "V").length,
      "squadra",
      "vittorie",
    );
    aggiungiSerie(insights, chiave, squadra.nome, eventi);
  }

  // =======================================================
  // SCONTRI DIRETTI TRA SQUADRE
  // =======================================================
  if (entitaCasa && entitaOspite) {
    const scontri = eventiFinoAllaPartita(
      entitaCasa.eventi,
      partitaCorrente,
    ).filter(
      (e) => e.avversaria.squadraId === entitaOspite.id,
    );

    const numero = scontri.length;
    if (numero === 1) {
      insights.push({
        id: `prima-sfida-${id}`,
        tipo: "STORIA",
        titolo: "Una sfida inedita",
        descrizione: `È il primo incontro registrato tra ${entitaCasa.nome} e ${entitaOspite.nome}.`,
        icona: "sfida",
        priorita: 70,
      });
    } else if (TRAGUARDI.has(numero)) {
      insights.push({
        id: `scontro-${id}-${numero}`,
        tipo: "TRAGUARDO",
        titolo: `${numero}º scontro diretto`,
        descrizione: `${entitaCasa.nome} e ${entitaOspite.nome} si affrontano per la ${numero}ª volta.`,
        icona: "sfida",
        priorita: 85,
      });
    }
  }

  // =======================================================
  // ALLENATORI E SOSTITUTI: ATTRIBUZIONE CONDIVISA
  // =======================================================
  const eventoCorrente = entitaCasa?.eventi.find(
    (e) => e.partita.id === id.toString(),
  );

  const idAllenatori = [
    eventoCorrente?.partita.casa.partecipanteId,
    eventoCorrente?.partita.ospite.partecipanteId,
  ].filter((valore): valore is number => valore != null);

  const allenatoriUnici = [...new Set(idAllenatori)];

  for (const allenatoreId of allenatoriUnici) {
    const allenatore = storico.partecipanti.find(
      (p) => p.id === allenatoreId,
    );
    if (!allenatore) continue;

    const eventi = eventiFinoAllaPartita(
      allenatore.eventi,
      partitaCorrente,
    );
    const chiave = `allenatore-${allenatore.id}`;

    aggiungiTraguardo(
      insights, chiave, allenatore.nome, eventi.length, "allenatore", "partite",
    );
    aggiungiTraguardo(
      insights,
      chiave,
      allenatore.nome,
      eventi.filter((e) => e.esito === "V").length,
      "allenatore",
      "vittorie",
    );
    aggiungiSerie(insights, chiave, allenatore.nome, eventi);
  }

  // =======================================================
  // RIVALITÀ TRA ALLENATORI
  // =======================================================
  if (allenatoriUnici.length === 2 && eventoCorrente) {
    const [allenatoreCasaId, allenatoreOspiteId] = allenatoriUnici;
    const allenatoreCasa = storico.partecipanti.find(
      (p) => p.id === allenatoreCasaId,
    );
    const allenatoreOspite = storico.partecipanti.find(
      (p) => p.id === allenatoreOspiteId,
    );

    if (allenatoreCasa && allenatoreOspite) {
      const incontri = eventiFinoAllaPartita(
        allenatoreCasa.eventi,
        partitaCorrente,
      ).filter((e) => {
        const casaId = e.partita.casa.partecipanteId;
        const ospiteId = e.partita.ospite.partecipanteId;
        return (
          (casaId === allenatoreCasaId && ospiteId === allenatoreOspiteId) ||
          (casaId === allenatoreOspiteId && ospiteId === allenatoreCasaId)
        );
      });

      const numero = incontri.length;
      if (numero === 1 || TRAGUARDI.has(numero)) {
        insights.push({
          id: `rivalita-${allenatoreCasaId}-${allenatoreOspiteId}-${numero}`,
          tipo: numero === 1 ? "STORIA" : "TRAGUARDO",
          titolo:
            numero === 1
              ? "Nasce una rivalità"
              : `${numero}º duello tra allenatori`,
          descrizione:
            numero === 1
              ? `${allenatoreCasa.nome} e ${allenatoreOspite.nome} si affrontano per la prima volta.`
              : `${allenatoreCasa.nome} e ${allenatoreOspite.nome} si sfidano per la ${numero}ª volta, indipendentemente dalle squadre allenate.`,
          icona: "sfida",
          priorita: 88,
        });
      }
    }
  }

  return insights.sort(
    (a, b) => b.priorita - a.priorita || a.id.localeCompare(b.id),
  );
}
