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

  // PREPARTITA — curiosità storiche anche senza data o ora.
  // I risultati e le serie considerano esclusivamente partite concluse.
  if (!partita.Completata) {
    const insights: PazziInsight[] = [];
    const storico = await getSerieGlobali();
    const entitaCasa = storico.squadre.find(
      (s) => s.id === partita.SquadraCasaId,
    );
    const entitaOspite = storico.squadre.find(
      (s) => s.id === partita.SquadraOspiteId,
    );

    // Le partite prive di data non possono essere ordinate in modo
    // affidabile: presentiamo soltanto fatti già verificati.
    for (const squadra of [entitaCasa, entitaOspite]) {
      if (!squadra) continue;
      const eventi = squadra.eventi.filter(
        (e) => e.partita.id !== id.toString(),
      );
      const vittorie = eventi.filter((e) => e.esito === "V").length;
      if (eventi.length > 0) {
        insights.push({
          id: `pre-storico-squadra-${squadra.id}`,
          tipo: "CURIOSITA",
          titolo: `${eventi.length} partite nello storico`,
          descrizione: `${squadra.nome} ha già disputato ${eventi.length} ${eventi.length === 1 ? "partita" : "partite"} su PazziTournament, ottenendo ${vittorie} ${vittorie === 1 ? "vittoria" : "vittorie"}.`,
          icona: "stella",
          priorita: 55,
        });
      }
      // Serie calcolate sugli incontri realmente disputati.
      // La descrizione non deve far credere che la partita attuale sia già vinta.
      const serie = calcolaSerie(eventi);
      if (serie.vittorieAttuali >= 3) {
        insights.push({
          id: `pre-serie-vittorie-${squadra.id}`,
          tipo: "CURIOSITA",
          titolo: `${serie.vittorieAttuali} vittorie di fila`,
          descrizione: `${squadra.nome} arriva a questa sfida con una serie di ${serie.vittorieAttuali} vittorie consecutive nelle partite registrate.`,
          icona: "stella",
          priorita: 80,
        });
      } else if (serie.imbattibilitaAttuale >= 3) {
        insights.push({
          id: `pre-serie-imbattibilita-${squadra.id}`,
          tipo: "CURIOSITA",
          titolo: `${serie.imbattibilitaAttuale} partite senza perdere`,
          descrizione: `${squadra.nome} non perde da ${serie.imbattibilitaAttuale} partite concluse registrate.`,
          icona: "stella",
          priorita: 76,
        });
      }
    }

    if (entitaCasa && entitaOspite) {
      const scontri = entitaCasa.eventi.filter(
        (e) => e.avversaria.squadraId === entitaOspite.id,
      );
      const vittorieCasa = scontri.filter((e) => e.esito === "V").length;
      const vittorieOspite = scontri.filter((e) => e.esito === "P").length;
      const pareggi = scontri.length - vittorieCasa - vittorieOspite;
      insights.push({
        id: `pre-scontri-${id}`,
        tipo: "STORIA",
        titolo: scontri.length === 0 ? "Una sfida inedita" : `${scontri.length} precedenti tra le squadre`,
        descrizione: scontri.length === 0
          ? `Nello storico delle partite concluse non risultano precedenti tra ${entitaCasa.nome} e ${entitaOspite.nome}.`
          : `Negli scontri diretti registrati: ${vittorieCasa} vittorie per ${entitaCasa.nome}, ${vittorieOspite} per ${entitaOspite.nome} e ${pareggi} pareggi.`,
        icona: "sfida",
        priorita: 88,
      });
    }

    // Il sostituto, se presente, è l'allenatore effettivo della gara.
    const partecipazioniCorrenti = await prisma.partecipazione.findMany({
      where: {
        torneoId: partita.TorneoId,
        squadraId: { in: [partita.SquadraCasaId, partita.SquadraOspiteId] },
      },
      select: { squadraId: true, partecipanteId: true },
    });
    const titolarePerSquadra = new Map(
      partecipazioniCorrenti.map((p) => [p.squadraId, p.partecipanteId] as const),
    );
    const idCasa = partita.sostitutoCasaId ?? titolarePerSquadra.get(partita.SquadraCasaId) ?? null;
    const idOspite = partita.sostitutoOspiteId ?? titolarePerSquadra.get(partita.SquadraOspiteId) ?? null;
    const allenatori = [...new Set([idCasa, idOspite].filter((x): x is number => x !== null))];

    for (const allenatoreId of allenatori) {
      const allenatore = storico.partecipanti.find((p) => p.id === allenatoreId);
      if (!allenatore || allenatore.eventi.length === 0) continue;
      const vittorie = allenatore.eventi.filter((e) => e.esito === "V").length;
      insights.push({
        id: `pre-allenatore-storico-${allenatore.id}`,
        tipo: "CURIOSITA",
        titolo: `${allenatore.eventi.length} partite da allenatore`,
        descrizione: `${allenatore.nome} ha disputato ${allenatore.eventi.length} partite registrate su PazziTournament, con ${vittorie} ${vittorie === 1 ? "vittoria" : "vittorie"}.`,
        icona: "stella",
        priorita: 60,
      });
    }

    if (idCasa !== null && idOspite !== null && idCasa !== idOspite) {
      const coachCasa = storico.partecipanti.find((p) => p.id === idCasa);
      const coachOspite = storico.partecipanti.find((p) => p.id === idOspite);
      if (coachCasa && coachOspite) {
        const duelli = coachCasa.eventi.filter((e) => {
          const casaId = e.partita.casa.partecipanteId;
          const ospiteId = e.partita.ospite.partecipanteId;
          return (casaId === idCasa && ospiteId === idOspite) ||
            (casaId === idOspite && ospiteId === idCasa);
        });
        insights.push({
          id: `pre-rivalita-${idCasa}-${idOspite}`,
          tipo: "STORIA",
          titolo: duelli.length === 0 ? "Nasce una rivalità" : `${duelli.length} duelli tra allenatori`,
          descrizione: duelli.length === 0
            ? `Nello storico delle partite concluse non risultano sfide tra ${coachCasa.nome} e ${coachOspite.nome}.`
            : `${coachCasa.nome} e ${coachOspite.nome} si sono già affrontati ${duelli.length} ${duelli.length === 1 ? "volta" : "volte"}, anche con squadre diverse.`,
          icona: "sfida",
          priorita: 84,
        });
      }
    }

    return insights.sort(
      (a, b) => b.priorita - a.priorita || a.id.localeCompare(b.id),
    );
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
