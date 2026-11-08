
import { prisma } from "@/lib/prisma";

type RuoloAllenatore = {
  nome: string;
  ruolo: string;
  partecipanteId: number | null;
  lato: "CASA" | "OSPITE";
  tipo: "TITOLARE" | "SOSTITUTO";
};

export type FasciaGolAllenatore = {
  id: string;
  nome: string;
  fatti: number;
  subiti: number;
};

export type PartitaGraficoAllenatore = {
  id: string;
  avversario: string;
  fatti: number;
  subiti: number;
  data: string;
};

export type GraficoAllenatore = {
  nome: string;
  ruolo: string;
  partite: PartitaGraficoAllenatore[];
  fasce: FasciaGolAllenatore[];
};

type Parametri = {
  partitaId: bigint;
  titolareCasaId: number | null;
  titolareCasaNome: string;
  titolareOspiteId: number | null;
  titolareOspiteNome: string;
  sostitutoCasaId: number | null;
  sostitutoCasaNome: string;
  sostitutoOspiteId: number | null;
  sostitutoOspiteNome: string;
};

const FASCE = [
  { id: "0-15", nome: "0–15'" },
  { id: "16-30", nome: "16–30'" },
  { id: "31-45", nome: "31–45'" },
  { id: "recupero-pt", nome: "Recupero 1° tempo" },
  { id: "46-60", nome: "46–60'" },
  { id: "61-75", nome: "61–75'" },
  { id: "76-90", nome: "76–90'" },
  { id: "recupero-st", nome: "Recupero 2° tempo" },
  { id: "supplementari", nome: "Supplementari" },
] as const;

function creaFasceVuote(): FasciaGolAllenatore[] {
  return FASCE.map((fascia) => ({
    ...fascia,
    fatti: 0,
    subiti: 0,
  }));
}

function identificaFascia(
  minuto: number,
  recupero: number | null,
  periodo: string,
): string | null {
  const tempo = periodo.toUpperCase();

  if (tempo === "SUPPLEMENTARI") {
    return "supplementari";
  }

  if (tempo === "PT" || tempo === "PRIMO_TEMPO") {
    if ((recupero ?? 0) > 0) return "recupero-pt";
    if (minuto <= 15) return "0-15";
    if (minuto <= 30) return "16-30";
    if (minuto <= 45) return "31-45";
    return null;
  }

  if (tempo === "ST" || tempo === "SECONDO_TEMPO") {
    if ((recupero ?? 0) > 0) return "recupero-st";
    if (minuto >= 46 && minuto <= 60) return "46-60";
    if (minuto >= 61 && minuto <= 75) return "61-75";
    if (minuto >= 76 && minuto <= 90) return "76-90";
  }

  return null;
}

export async function getGraficiGolAllenatori({
  partitaId,
  titolareCasaId,
  titolareCasaNome,
  titolareOspiteId,
  titolareOspiteNome,
  sostitutoCasaId,
  sostitutoCasaNome,
  sostitutoOspiteId,
  sostitutoOspiteNome,
}: Parametri): Promise<GraficoAllenatore[]> {
  const ruoli: RuoloAllenatore[] = [
    {
      nome: titolareCasaNome,
      ruolo: "Titolare casa",
      partecipanteId: titolareCasaId,
      lato: "CASA",
      tipo: "TITOLARE",
    },
    {
      nome: titolareOspiteNome,
      ruolo: "Titolare ospite",
      partecipanteId: titolareOspiteId,
      lato: "OSPITE",
      tipo: "TITOLARE",
    },
    {
      nome: sostitutoCasaNome,
      ruolo: "Sostituto casa",
      partecipanteId: sostitutoCasaId,
      lato: "CASA",
      tipo: "SOSTITUTO",
    },
    {
      nome: sostitutoOspiteNome,
      ruolo: "Sostituto ospite",
      partecipanteId: sostitutoOspiteId,
      lato: "OSPITE",
      tipo: "SOSTITUTO",
    },
  ];

  const ruoliConPartecipante = ruoli.filter(
    (ruolo) => ruolo.partecipanteId !== null,
  );

  if (ruoliConPartecipante.length === 0) {
    return ruoli.map((ruolo) => ({
      nome: ruolo.nome,
      ruolo: ruolo.ruolo,
      partite: [],
      fasce: creaFasceVuote(),
    }));
  }

  const partite = await prisma.partita.findMany({
    where: {
      id: { not: partitaId },
      Completata: true,
      GolCasa: { not: null },
      GolOspite: { not: null },
      SquadraCasaId: { not: null },
      SquadraOspiteId: { not: null },
    },
    select: {
      id: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
      dataPartita: true,
      sostitutoCasaId: true,
      sostitutoOspiteId: true,
      squadraCasa: {
        select: { nome: true },
      },
      squadraOspite: {
        select: { nome: true },
      },
      torneo: {
        select: {
          partecipazioni: {
            select: {
              squadraId: true,
              partecipanteId: true,
            },
          },
        },
      },
      gol: {
        select: {
          squadraId: true,
          minuto: true,
          recupero: true,
          periodo: true,
          tipo: true,
        },
      },
    },
    orderBy: [{ dataPartita: "desc" }, { id: "desc" }],
  });

  function datiPerRuolo(ruolo: RuoloAllenatore) {
    if (ruolo.partecipanteId === null) {
      return {
        partite: [] as PartitaGraficoAllenatore[],
        fasce: creaFasceVuote(),
      };
    }

    const idAllenatore = ruolo.partecipanteId;

    const risultati = partite.flatMap((partita) => {
      const casaId = partita.SquadraCasaId;
      const ospiteId = partita.SquadraOspiteId;

      if (casaId === null || ospiteId === null) return [];

      let latoGiocato: "CASA" | "OSPITE" | null = null;

      if (ruolo.tipo === "TITOLARE") {
        const titolareCasa =
          partita.torneo.partecipazioni.find(
            (p) => p.squadraId === casaId,
          )?.partecipanteId ?? null;

        const titolareOspite =
          partita.torneo.partecipazioni.find(
            (p) => p.squadraId === ospiteId,
          )?.partecipanteId ?? null;

        if (ruolo.lato === "CASA" && titolareCasa === idAllenatore) {
          latoGiocato = "CASA";
        } else if (
          ruolo.lato === "OSPITE" &&
          titolareOspite === idAllenatore
        ) {
          latoGiocato = "OSPITE";
        }
      } else {
        if (
          ruolo.lato === "CASA" &&
          partita.sostitutoCasaId === idAllenatore
        ) {
          latoGiocato = "CASA";
        } else if (
          ruolo.lato === "OSPITE" &&
          partita.sostitutoOspiteId === idAllenatore
        ) {
          latoGiocato = "OSPITE";
        }
      }

      if (latoGiocato === null) return [];

      return [{
        id: partita.id.toString(),
        avversario:
          latoGiocato === "CASA"
            ? partita.squadraOspite?.nome ?? "Avversario sconosciuto"
            : partita.squadraCasa?.nome ?? "Avversario sconosciuto",
        fatti:
          latoGiocato === "CASA"
            ? partita.GolCasa ?? 0
            : partita.GolOspite ?? 0,
        subiti:
          latoGiocato === "CASA"
            ? partita.GolOspite ?? 0
            : partita.GolCasa ?? 0,
        data: partita.dataPartita
          ? partita.dataPartita.toLocaleDateString("it-IT")
          : "Data n/d",
        latoGiocato,
        casaId,
        ospiteId,
        gol: partita.gol,
      }];
    });

    const ultimeDieci = risultati.slice(0, 10);
    const fasce = creaFasceVuote();

    for (const partita of ultimeDieci) {
      const squadraAllenatore =
        partita.latoGiocato === "CASA"
          ? partita.casaId
          : partita.ospiteId;

      for (const gol of partita.gol) {
        const fasciaId = identificaFascia(
          gol.minuto,
          gol.recupero,
          String(gol.periodo),
        );

        if (!fasciaId) continue;

        let squadraCheSegna = gol.squadraId;

        if (String(gol.tipo) === "AUTOGOL") {
          if (gol.squadraId === partita.casaId) {
            squadraCheSegna = partita.ospiteId;
          } else if (gol.squadraId === partita.ospiteId) {
            squadraCheSegna = partita.casaId;
          } else {
            continue;
          }
        }

        const fascia = fasce.find((f) => f.id === fasciaId);
        if (!fascia) continue;

        if (squadraCheSegna === squadraAllenatore) {
          fascia.fatti += 1;
        } else {
          fascia.subiti += 1;
        }
      }
    }

    return {
      partite: ultimeDieci
        .map(({ latoGiocato: _lato, casaId: _casa, ospiteId: _ospite, gol: _gol, ...p }) => p)
        .reverse(),
      fasce,
    };
  }

  return ruoli.map((ruolo) => {
    const dati = datiPerRuolo(ruolo);

    return {
      nome: ruolo.nome,
      ruolo: ruolo.ruolo,
      partite: dati.partite,
      fasce: dati.fasce,
    };
  });
}
