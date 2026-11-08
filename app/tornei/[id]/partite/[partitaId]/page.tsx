import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import TornaAlTorneo from "@/components/TornaAlTorneo";
import { eliminaPartita, eliminaGol } from "./actions";
import { isAdmin } from "@/lib/auth";
import GraficoGolAllenatore from "@/components/statistiche/GraficoGolAllenatore";
import { getGraficiGolAllenatori } from "@/lib/statistiche/gol-allenatore";
import StatisticheQuotePartita from "@/components/StatisticheQuotePartita";
import PazziInsightsPartita from "@/components/insights/PazziInsightsPartita";

type Props = {
  params: Promise<{ id: string; partitaId: string }>;
};

type PartitaPrecedente = Prisma.PartitaGetPayload<{
  include: {
    squadraCasa: true;
    squadraOspite: true;
    torneo: true;
  };
}>;

type ValoreRanking = {
  id: number;
  punti: number;
  nome: string;
};

const panel =
  "match-panel relative min-w-0 overflow-hidden rounded-[26px] border border-amber-200/15 bg-[#081426]/90 p-5 shadow-[0_22px_65px_rgba(0,0,0,0.35)] sm:rounded-[32px] sm:p-7";

const label =
  "text-[10px] font-bold uppercase tracking-wider text-slate-500";

const muted = "text-xs leading-relaxed text-slate-400";

function nomeFase(fase: string | null | undefined) {
  return fase || "Partita";
}

function nomeTipoRanking(tipo: string) {
  switch (tipo) {
    case "NAZIONALE":
      return "Ranking nazionali";
    case "CLUB":
      return "Ranking club";
    case "MISTO":
      return "Ranking misto";
    default:
      return tipo;
  }
}

function nomeRuolo(ruolo: string) {
  switch (ruolo) {
    case "TITOLARE_CASA":
      return "Titolare casa";
    case "SOSTITUTO_CASA":
      return "Sostituto casa";
    case "TITOLARE_OSPITE":
      return "Titolare ospite";
    case "SOSTITUTO_OSPITE":
      return "Sostituto ospite";
    default:
      return ruolo;
  }
}

function coloreVariazione(valore: number) {
  if (valore > 0) return "text-emerald-400";
  if (valore < 0) return "text-red-400";
  return "text-slate-300";
}

function nomePeriodo(periodo: string) {
  if (periodo === "PT" || periodo === "PRIMO_TEMPO") {
    return "Primo tempo";
  }

  if (periodo === "ST" || periodo === "SECONDO_TEMPO") {
    return "Secondo tempo";
  }

  return "Supplementari";
}

function minutoGol(minuto: number, recupero: number | null) {
  return `${minuto}'${recupero && recupero > 0 ? `+${recupero}` : ""}`;
}

function partitaPrima(
  data: Date | null,
  id: bigint,
  dataCorrente: Date | null,
  idCorrente: bigint,
) {
  if (data && dataCorrente) {
    const differenza = data.getTime() - dataCorrente.getTime();

    if (differenza !== 0) return differenza < 0;
  }

  return id < idCorrente;
}

function posizioneRankingSquadre(
  valori: ValoreRanking[],
  id: number,
): number | null {
  const ordinati = [...valori].sort(
    (a, b) =>
      b.punti - a.punti ||
      a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
  );

  const indice = ordinati.findIndex((v) => v.id === id);

  return indice === -1 ? null : indice + 1;
}

function posizioneRankingAllenatori(
  valori: ValoreRanking[],
  id: number,
): number | null {
  const ordinati = [...valori].sort(
    (a, b) =>
      b.punti - a.punti ||
      a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
  );

  const indice = ordinati.findIndex((v) => v.id === id);

  return indice === -1 ? null : indice + 1;
}

function testoVariazionePosizione(
  posizionePrima: number | null,
  posizioneDopo: number | null,
) {
  if (posizionePrima == null || posizioneDopo == null) {
    return {
      testo: "Posizione non disponibile",
      classe: "text-slate-400",
    };
  }

  const differenza = posizionePrima - posizioneDopo;

  if (differenza > 0) {
    return {
      testo: `▲ +${differenza} ${
        differenza === 1 ? "posizione" : "posizioni"
      }`,
      classe: "text-emerald-400",
    };
  }

  if (differenza < 0) {
    const perse = Math.abs(differenza);

    return {
      testo: `▼ -${perse} ${perse === 1 ? "posizione" : "posizioni"}`,
      classe: "text-red-400",
    };
  }

  return {
    testo: "— Posizione invariata",
    classe: "text-slate-300",
  };
}

function testoVariazionePunti(valore: number) {
  return valore > 0 ? `+${valore}` : String(valore);
}

function nomeTipoGol(tipo: string) {
  if (tipo === "RIGORE") return "Rigore";
  if (tipo === "AUTOGOL") return "Autogol";
  return "Gol";
}

function TitoloSezione({
  icona,
  titolo,
  descrizione,
}: {
  icona: string;
  titolo: string;
  descrizione?: string;
}) {
  return (
    <div className="mb-6 flex min-w-0 items-start gap-3 border-b border-white/10 pb-5 sm:gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200/25 bg-gradient-to-br from-amber-200/15 via-slate-800/80 to-blue-500/10 text-xl shadow-[0_0_28px_rgba(251,191,36,0.09)]">
        {icona}
      </div>

      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
          {titolo}
        </h2>

        {descrizione && (
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {descrizione}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function PartitaPage({ params }: Props) {
  const { id, partitaId } = await params;
  const admin = await isAdmin();
  const torneoId = Number(id);

  if (!Number.isSafeInteger(torneoId) || torneoId <= 0) notFound();

  let partitaIdBigInt: bigint;

  try {
    partitaIdBigInt = BigInt(partitaId);
  } catch {
    notFound();
  }

  const torneo = await prisma.torneo.findUnique({
    where: { id: torneoId },
    include: {
      partecipazioni: {
        include: {
          squadra: true,
          partecipante: true,
        },
      },
    },
  });

  if (!torneo) notFound();

  const partita = await prisma.partita.findUnique({
    where: { id: partitaIdBigInt },
    include: {
      squadraCasa: true,
      squadraOspite: true,
      girone: true,
      sostitutoCasa: { select: { id: true, nome: true } },
      sostitutoOspite: { select: { id: true, nome: true } },
      gol: {
        orderBy: [{ minuto: "asc" }, { id: "asc" }],
        include: {
          calciatoreTorneo: {
            include: { calciatore: true },
          },
          squadra: true,
        },
      },
      cartelliniRossi: {
        orderBy: [{ minuto: "asc" }, { id: "asc" }],
        include: {
          calciatoreTorneo: {
            include: { calciatore: true },
          },
          squadra: true,
        },
      },
      storicoRanking: {
        include: {
          rankingSquadra: {
            include: { squadra: true },
          },
        },
      },
      storicoRankingAllenatori: {
        include: {
          rankingAllenatore: {
            include: { partecipante: true },
          },
        },
      },
    },
  });

  if (!partita || partita.TorneoId !== torneoId) notFound();

  const torneoValido = torneo;
  const partitaValida = partita;
  const casa = partita.squadraCasa;
  const ospite = partita.squadraOspite;

  const partecipazioneCasa = torneo.partecipazioni.find(
    (p) => p.squadraId === casa?.id,
  );

  const partecipazioneOspite = torneo.partecipazioni.find(
    (p) => p.squadraId === ospite?.id,
  );

  const allenatoreCasa =
    partecipazioneCasa?.partecipante?.nome || "Allenatore non assegnato";

  const allenatoreOspite =
    partecipazioneOspite?.partecipante?.nome || "Allenatore non assegnato";

  const graficiGolAllenatori = await getGraficiGolAllenatori({
    partitaId: partita.id,
    titolareCasaId: partecipazioneCasa?.partecipanteId ?? null,
    titolareCasaNome:
      partecipazioneCasa?.partecipante?.nome ??
      "Allenatore casa non assegnato",
    titolareOspiteId: partecipazioneOspite?.partecipanteId ?? null,
    titolareOspiteNome:
      partecipazioneOspite?.partecipante?.nome ??
      "Allenatore ospite non assegnato",
    sostitutoCasaId: partita.sostitutoCasa?.id ?? null,
    sostitutoCasaNome:
      partita.sostitutoCasa?.nome ?? "Nessun sostituto casa",
    sostitutoOspiteId: partita.sostitutoOspite?.id ?? null,
    sostitutoOspiteNome:
      partita.sostitutoOspite?.nome ?? "Nessun sostituto ospite",
  });

  // Si mostrano soltanto i grafici con almeno una partita nello storico.
  const graficiGolAllenatoriVisibili = graficiGolAllenatori.filter(
    (grafico) => grafico.partite.length > 0,
  );

  const dataPartita = partita.dataPartita
    ? partita.dataPartita.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const oraPartita = partita.OraPartita
    ? `${String(partita.OraPartita.getHours()).padStart(2, "0")}:${String(
        partita.OraPartita.getMinutes(),
      ).padStart(2, "0")}`
    : null;

  // SCONTRI DIRETTI

  let precedenti: PartitaPrecedente[] = [];

  if (casa && ospite && casa.id !== ospite.id) {
    precedenti = await prisma.partita.findMany({
      where: {
        id: { not: partita.id },
        Completata: true,
        GolCasa: { not: null },
        GolOspite: { not: null },
        OR: [
          { SquadraCasaId: casa.id, SquadraOspiteId: ospite.id },
          { SquadraCasaId: ospite.id, SquadraOspiteId: casa.id },
        ],
      },
      orderBy: [{ dataPartita: "desc" }, { id: "desc" }],
      include: {
        squadraCasa: true,
        squadraOspite: true,
        torneo: true,
      },
    });
  }

  let vittorieCasa = 0;
  let vittorieOspite = 0;
  let pareggi = 0;
  let golCasaTotali = 0;
  let golOspiteTotali = 0;

  for (const p of precedenti) {
    const gc = p.GolCasa ?? 0;
    const go = p.GolOspite ?? 0;
    const casaEraCasa = p.SquadraCasaId === casa?.id;
    const fattiCasa = casaEraCasa ? gc : go;
    const fattiOspite = casaEraCasa ? go : gc;

    golCasaTotali += fattiCasa;
    golOspiteTotali += fattiOspite;

    if (fattiCasa > fattiOspite) vittorieCasa++;
    else if (fattiCasa < fattiOspite) vittorieOspite++;
    else pareggi++;
  }

  // FORMA RECENTE

  async function caricaForma(squadraId: number) {
    const recenti = await prisma.partita.findMany({
      where: {
        id: { not: partitaValida.id },
        Completata: true,
        OR: [{ SquadraCasaId: squadraId }, { SquadraOspiteId: squadraId }],
        GolCasa: { not: null },
        GolOspite: { not: null },
      },
      orderBy: [{ dataPartita: "desc" }, { id: "desc" }],
      take: 5,
      include: { squadraCasa: true, squadraOspite: true },
    });

    return recenti.map((p) => {
      const eCasa = p.SquadraCasaId === squadraId;
      const fatti = eCasa ? (p.GolCasa ?? 0) : (p.GolOspite ?? 0);
      const subiti = eCasa ? (p.GolOspite ?? 0) : (p.GolCasa ?? 0);

      const avversario = eCasa
        ? (p.squadraOspite?.nome ?? "TBD")
        : (p.squadraCasa?.nome ?? "TBD");

      return {
        risultato: fatti > subiti ? "V" : fatti < subiti ? "S" : "P",
        avversario,
        fatti,
        subiti,
      };
    });
  }

  const [formaCasa, formaOspite] = await Promise.all([
    casa ? caricaForma(casa.id) : Promise.resolve([]),
    ospite ? caricaForma(ospite.id) : Promise.resolve([]),
  ]);

  // MARCATORI

  const golCasaAccreditati = partita.gol.filter((gol) => {
    if (!casa) return false;

    return gol.tipo === "AUTOGOL"
      ? gol.squadraId !== casa.id
      : gol.squadraId === casa.id;
  });

  const golOspiteAccreditati = partita.gol.filter((gol) => {
    if (!ospite) return false;

    return gol.tipo === "AUTOGOL"
      ? gol.squadraId !== ospite.id
      : gol.squadraId === ospite.id;
  });

  // STORICO RANKING SQUADRE

  const storicoSquadre = partita.storicoRanking
    .filter((r) => r.rankingSquadra.tipo !== "MISTO")
    .sort((a, b) => {
      const tipoA = a.rankingSquadra.tipo;
      const tipoB = b.rankingSquadra.tipo;

      if (tipoA !== tipoB) return tipoA.localeCompare(tipoB);

      return a.rankingSquadra.squadra.nome.localeCompare(
        b.rankingSquadra.squadra.nome,
        "it",
      );
    });

  const storicoAllenatori = [...partita.storicoRankingAllenatori].sort(
    (a, b) => {
      if (a.ruolo !== b.ruolo) return a.ruolo.localeCompare(b.ruolo);

      return a.rankingAllenatore.partecipante.nome.localeCompare(
        b.rankingAllenatore.partecipante.nome,
        "it",
      );
    },
  );

  const tipiRankingPresenti = [
    ...new Set(
      [partita.squadraCasa, partita.squadraOspite]
        .filter(
          (squadra): squadra is NonNullable<typeof squadra> =>
            squadra !== null,
        )
        .map((squadra) =>
          squadra.tipo.toLowerCase().includes("nazional")
            ? "NAZIONALE"
            : "CLUB",
        ),
    ),
  ] as Array<"NAZIONALE" | "CLUB">;

  const [rankingSquadreCompleti, rankingAllenatoriCompleti] = await Promise.all(
    [
      tipiRankingPresenti.length > 0
        ? prisma.rankingSquadra.findMany({
            where: { tipo: { in: tipiRankingPresenti } },
            include: {
              squadra: true,
              storico: {
                include: {
                  partita: {
                    select: { id: true, dataPartita: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),

      prisma.rankingAllenatore.findMany({
        include: {
          partecipante: true,
          storico: {
            include: {
              partita: {
                select: {
                  id: true,
                  TorneoId: true,
                  dataPartita: true,
                },
              },
            },
          },
        },
      }),
    ],
  );

  // POSIZIONI RANKING SQUADRE

  const posizioniSquadre = new Map<
    number,
    { prima: number | null; dopo: number | null }
  >();

  for (const tipo of tipiRankingPresenti) {
    const rankingsTipo = rankingSquadreCompleti.filter(
      (r) => r.tipo === tipo,
    );

    const valoriPrima: ValoreRanking[] = rankingsTipo.map((ranking) => {
      const storicoPrecedente = ranking.storico
        .filter((r) =>
          partitaPrima(
            r.partita.dataPartita,
            r.partita.id,
            partita.dataPartita,
            partita.id,
          ),
        )
        .sort((a, b) => {
          const dataA = a.partita.dataPartita?.getTime() ?? 0;
          const dataB = b.partita.dataPartita?.getTime() ?? 0;

          if (dataA !== dataB) return dataA - dataB;

          return a.partita.id < b.partita.id
            ? -1
            : a.partita.id > b.partita.id
              ? 1
              : 0;
        });

      const storicoCorrente = storicoSquadre.find(
        (r) => r.rankingSquadraId === ranking.id,
      );

      return {
        id: ranking.id,
        nome: ranking.squadra.nome,
        punti:
          storicoCorrente?.ratingPrima ??
          storicoPrecedente.at(-1)?.ratingDopo ??
          0,
      };
    });

    const valoriDopo: ValoreRanking[] = valoriPrima.map((valore) => {
      if (!partita.Completata) return { ...valore };

      const storicoCorrente = storicoSquadre.find(
        (r) => r.rankingSquadraId === valore.id,
      );

      return {
        ...valore,
        punti: storicoCorrente?.ratingDopo ?? valore.punti,
      };
    });

    for (const ranking of rankingsTipo) {
      posizioniSquadre.set(ranking.id, {
        prima: posizioneRankingSquadre(valoriPrima, ranking.id),
        dopo: posizioneRankingSquadre(valoriDopo, ranking.id),
      });
    }
  }

  // RANKING ALLENATORI DEL TORNEO CORRENTE

  const storicoAllenatoriTorneo = rankingAllenatoriCompleti.flatMap(
    (ranking) =>
      ranking.storico
        .filter((r) => r.partita.TorneoId === torneoId)
        .map((r) => ({
          rankingAllenatoreId: r.rankingAllenatoreId,
          partitaId: r.partitaId,
          dataPartita: r.partita.dataPartita,
          variazione: r.variazione,
        })),
  );

  function storicoAllenatorePrima(
    r: (typeof storicoAllenatoriTorneo)[number],
  ) {
    return partitaPrima(
      r.dataPartita,
      r.partitaId,
      partitaValida.dataPartita,
      partitaValida.id,
    );
  }

  const rankingAllenatoriDelTorneo = rankingAllenatoriCompleti.filter(
    (ranking) =>
      storicoAllenatoriTorneo.some(
        (r) => r.rankingAllenatoreId === ranking.id,
      ),
  );

  const valoriPrimaAllenatori: ValoreRanking[] =
    rankingAllenatoriDelTorneo.map((ranking) => ({
      id: ranking.id,
      nome: ranking.partecipante.nome,
      punti: storicoAllenatoriTorneo
        .filter(
          (r) =>
            r.rankingAllenatoreId === ranking.id &&
            storicoAllenatorePrima(r),
        )
        .reduce((somma, r) => somma + r.variazione, 0),
    }));

  const valoriDopoAllenatori: ValoreRanking[] =
    valoriPrimaAllenatori.map((valore) => {
      if (!partita.Completata) return { ...valore };

      const variazioniCorrenti = storicoAllenatoriTorneo
        .filter(
          (r) =>
            r.rankingAllenatoreId === valore.id &&
            r.partitaId === partita.id,
        )
        .reduce((somma, r) => somma + r.variazione, 0);

      return {
        ...valore,
        punti: valore.punti + variazioniCorrenti,
      };
    });

  const posizioniAllenatori = new Map<
    number,
    { prima: number | null; dopo: number | null }
  >();

  for (const ranking of rankingAllenatoriDelTorneo) {
    posizioniAllenatori.set(ranking.id, {
      prima: posizioneRankingAllenatori(
        valoriPrimaAllenatori,
        ranking.id,
      ),
      dopo: posizioneRankingAllenatori(
        valoriDopoAllenatori,
        ranking.id,
      ),
    });
  }

  function puntiAllenatoreNelTorneo(
    rankingAllenatoreId: number,
    dopoLaPartita: boolean,
  ) {
    const valore = (
      dopoLaPartita ? valoriDopoAllenatori : valoriPrimaAllenatori
    ).find((r) => r.id === rankingAllenatoreId);

    return valore?.punti ?? 0;
  }

  // RAGGRUPPAMENTO PER TIPO DI RANKING

  const tipiDaMostrare = tipiRankingPresenti;

  const squadrePerTipo = tipiDaMostrare.map((tipo) => {
    const rankingCasa = casa
      ? (rankingSquadreCompleti.find(
          (r) => r.tipo === tipo && r.squadraId === casa.id,
        ) ?? null)
      : null;

    const rankingOspite = ospite
      ? (rankingSquadreCompleti.find(
          (r) => r.tipo === tipo && r.squadraId === ospite.id,
        ) ?? null)
      : null;

    return {
      tipo,
      casa:
        storicoSquadre.find(
          (r) =>
            r.rankingSquadra.tipo === tipo &&
            r.rankingSquadra.squadraId === casa?.id,
        ) ?? null,
      ospite:
        storicoSquadre.find(
          (r) =>
            r.rankingSquadra.tipo === tipo &&
            r.rankingSquadra.squadraId === ospite?.id,
        ) ?? null,
      rankingCasa,
      rankingOspite,
    };
  });

  const coppieAllenatori = [
    {
      titolo: "Allenatori titolari",
      ruoloCasa: "TITOLARE_CASA",
      ruoloOspite: "TITOLARE_OSPITE",
      casa: storicoAllenatori.find((r) => r.ruolo === "TITOLARE_CASA") ?? null,
      ospite:
        storicoAllenatori.find((r) => r.ruolo === "TITOLARE_OSPITE") ?? null,
      idCasa: partecipazioneCasa?.partecipanteId ?? null,
      idOspite: partecipazioneOspite?.partecipanteId ?? null,
      nomeCasa: allenatoreCasa,
      nomeOspite: allenatoreOspite,
    },
    {
      titolo: "Allenatori sostituti",
      ruoloCasa: "SOSTITUTO_CASA",
      ruoloOspite: "SOSTITUTO_OSPITE",
      casa: storicoAllenatori.find((r) => r.ruolo === "SOSTITUTO_CASA") ?? null,
      ospite:
        storicoAllenatori.find((r) => r.ruolo === "SOSTITUTO_OSPITE") ?? null,
      idCasa: partita.sostitutoCasa?.id ?? null,
      idOspite: partita.sostitutoOspite?.id ?? null,
      nomeCasa: partita.sostitutoCasa?.nome ?? "Nessun sostituto",
      nomeOspite: partita.sostitutoOspite?.nome ?? "Nessun sostituto",
    },
  ].filter(
    (coppia) =>
      coppia.casa !== null ||
      coppia.ospite !== null ||
      coppia.idCasa !== null ||
      coppia.idOspite !== null,
  );

  // SCHEDE RANKING SQUADRE

  function schedaRankingSquadra(
    r: (typeof storicoSquadre)[number] | null,
    fallback: (typeof rankingSquadreCompleti)[number] | null,
    lato: "casa" | "ospite",
  ) {
    const nomeSquadra =
      lato === "casa"
        ? (casa?.nome ?? "Squadra casa")
        : (ospite?.nome ?? "Squadra ospite");

    const squadra = r?.rankingSquadra.squadra ?? fallback?.squadra;
    const tipo = r?.rankingSquadra.tipo ?? fallback?.tipo;

    const storicoPrecedente =
      fallback?.storico
        .filter((elemento) =>
          partitaPrima(
            elemento.partita.dataPartita,
            elemento.partita.id,
            partitaValida.dataPartita,
            partitaValida.id,
          ),
        )
        .sort((a, b) => {
          const dataA = a.partita.dataPartita?.getTime() ?? 0;
          const dataB = b.partita.dataPartita?.getTime() ?? 0;

          if (dataA !== dataB) return dataA - dataB;

          return a.partita.id < b.partita.id
            ? -1
            : a.partita.id > b.partita.id
              ? 1
              : 0;
        }) ?? [];

    const ratingPrima =
      r?.ratingPrima ?? storicoPrecedente.at(-1)?.ratingDopo ?? 0;

    const ratingDopo = partitaValida.Completata
      ? (r?.ratingDopo ?? ratingPrima)
      : ratingPrima;

    const variazione = partitaValida.Completata ? (r?.variazione ?? 0) : 0;

    const idRanking = fallback?.id ?? r?.rankingSquadraId;
    const posizioni =
      idRanking != null ? posizioniSquadre.get(idRanking) : undefined;

    const variazionePosizione = testoVariazionePosizione(
      posizioni?.prima ?? null,
      posizioni?.dopo ?? null,
    );

    return (
      <div className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#10243c] to-[#060e1c] p-4 shadow-[0_12px_30px_rgba(0,0,0,.2)]">
        <div className="flex items-center gap-2.5">
          {squadra?.stemma ? (
            <img
              src={squadra.stemma}
              alt={`Stemma ${squadra.nome}`}
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl">
              ⚽
            </div>
          )}

          <div className="min-w-0">
            <div className="break-words text-sm font-black">
              {squadra?.nome ?? nomeSquadra}
            </div>
            {tipo && (
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
                {nomeTipoRanking(tipo)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
          <div className={label}>Posizione nel ranking</div>
          <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div>
              <div className="text-[10px] text-slate-500">Prima</div>
              <div className="text-lg font-black">
                {posizioni?.prima != null ? `#${posizioni.prima}` : "—"}
              </div>
            </div>
            <span className="text-sm text-slate-600">→</span>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Dopo</div>
              <div className="text-lg font-black">
                {posizioni?.dopo != null ? `#${posizioni.dopo}` : "—"}
              </div>
            </div>
          </div>
          <div className={`mt-1.5 text-xs font-bold ${variazionePosizione.classe}`}>
            {variazionePosizione.testo}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-slate-900 p-2">
            <div className={label}>Prima</div>
            <div className="mt-1 text-base font-black">{ratingPrima}</div>
          </div>
          <div className="rounded-lg bg-slate-900 p-2">
            <div className={label}>Delta</div>
            <div className={`mt-1 text-base font-black ${coloreVariazione(variazione)}`}>
              {testoVariazionePunti(variazione)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 p-2">
            <div className={label}>Dopo</div>
            <div className="mt-1 text-base font-black">{ratingDopo}</div>
          </div>
        </div>

        <div className="mt-2 text-[10px] leading-relaxed text-slate-500">
          {r
            ? `Fase: ${r.fase || "Non specificata"} · Esito: ${r.risultato}`
            : "Nessuna variazione in questa partita · Valore iniziale predefinito: 0"}
        </div>
      </div>
    );
  }

  // SCHEDE RANKING ALLENATORI

  function schedaRankingAllenatore(
    r: (typeof storicoAllenatori)[number] | null,
    lato: "casa" | "ospite",
    ruolo: string,
    partecipanteId: number | null,
    nomeFallback: string,
  ) {
    const idPartecipante =
      r?.rankingAllenatore.partecipanteId ?? partecipanteId;

    const rankingAllenatore = idPartecipante
      ? (rankingAllenatoriCompleti.find(
          (ranking) => ranking.partecipanteId === idPartecipante,
        ) ?? null)
      : null;

    const nome =
      r?.rankingAllenatore.partecipante.nome ??
      (nomeFallback || (lato === "casa" ? allenatoreCasa : allenatoreOspite));

    const rankingId =
      r?.rankingAllenatoreId ?? rankingAllenatore?.id ?? null;

    const puntiPrima =
      rankingId != null ? puntiAllenatoreNelTorneo(rankingId, false) : 0;

    const puntiDopo =
      rankingId != null ? puntiAllenatoreNelTorneo(rankingId, true) : 0;

    const variazione = partitaValida.Completata
      ? (r?.variazione ?? puntiDopo - puntiPrima)
      : 0;

    const posizioni =
      rankingId != null ? posizioniAllenatori.get(rankingId) : undefined;

    const variazionePosizione = testoVariazionePosizione(
      posizioni?.prima ?? null,
      posizioni?.dopo ?? null,
    );

    return (
      <div className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#10243c] to-[#060e1c] p-4 shadow-[0_12px_30px_rgba(0,0,0,.2)]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="break-words text-sm font-black">{nome}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-purple-300">
              {nomeRuolo(ruolo)}
            </div>
          </div>
          <div className={`shrink-0 text-right text-base font-black ${coloreVariazione(variazione)}`}>
            {testoVariazionePunti(variazione)}
            <div className="text-[10px] font-normal text-slate-500">punti gara</div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5">
          <div className={label}>Ranking del torneo corrente</div>
          <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div>
              <div className="text-[10px] text-slate-500">Prima</div>
              <div className="text-lg font-black">
                {posizioni?.prima != null ? `#${posizioni.prima}` : "—"}
              </div>
            </div>
            <span className="text-sm text-slate-600">→</span>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Dopo</div>
              <div className="text-lg font-black">
                {posizioni?.dopo != null ? `#${posizioni.dopo}` : "—"}
              </div>
            </div>
          </div>
          <div className={`mt-1.5 text-xs font-bold ${variazionePosizione.classe}`}>
            {variazionePosizione.testo}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-slate-900 p-2">
            <div className={label}>Prima</div>
            <div className="mt-1 text-base font-black">{puntiPrima}</div>
          </div>
          <div className="rounded-lg bg-slate-900 p-2">
            <div className={label}>Delta</div>
            <div className={`mt-1 text-base font-black ${coloreVariazione(variazione)}`}>
              {testoVariazionePunti(variazione)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 p-2">
            <div className={label}>Dopo</div>
            <div className="mt-1 text-base font-black">{puntiDopo}</div>
          </div>
        </div>

        <div className="mt-2 text-[10px] leading-relaxed text-slate-500">
          {r
            ? `Fase: ${r.fase || "Non specificata"} · Esito: ${r.risultato}`
            : "Nessuna variazione registrata in questa partita · Punti iniziali: 0"}
        </div>
      </div>
    );
  }

  // SCHEDA GOL

  function schedaGol(gol: (typeof partitaValida.gol)[number]) {
    const èAutogol = gol.tipo === "AUTOGOL";

    return (
      <div
        key={gol.id}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#11243b]/90 to-[#07111f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-300/35 hover:shadow-[0_14px_35px_rgba(0,0,0,.3)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 px-1.5 text-xs font-black text-white">
            {minutoGol(gol.minuto, gol.recupero)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="break-words text-sm font-bold">
              {gol.calciatoreTorneo.calciatore.nome}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {nomePeriodo(gol.periodo)}
            </div>

            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                èAutogol
                  ? "bg-red-950 text-red-300"
                  : gol.tipo === "RIGORE"
                    ? "bg-amber-950 text-amber-300"
                    : "bg-emerald-950 text-emerald-300"
              }`}
            >
              {nomeTipoGol(gol.tipo)}
            </span>

            {èAutogol && (
              <p className="mt-1.5 text-[10px] text-red-300">
                Rete accreditata alla squadra avversaria
              </p>
            )}
          </div>
        </div>

        {admin && (
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row">
            <Link
              href={`/tornei/${torneoValido.id}/partite/${partitaValida.id.toString()}/gol/${gol.id}/modifica`}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-2.5 text-center text-xs font-bold transition hover:bg-amber-500"
            >
              ✏️ Modifica gol
            </Link>

            <form action={eliminaGol} className="flex-1">
              <input type="hidden" name="torneoId" value={torneoValido.id} />
              <input
                type="hidden"
                name="partitaId"
                value={partitaValida.id.toString()}
              />
              <input type="hidden" name="golId" value={gol.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-red-300/20 bg-gradient-to-r from-red-800 to-rose-950 px-4 py-3 text-xs font-black transition hover:from-red-700 hover:to-red-900"
              >
                🗑️ Elimina
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="match-experience relative min-h-screen overflow-hidden bg-[#030812] text-white">
        <style>{`
          .match-experience { background-image: radial-gradient(ellipse 70% 35% at 0% 24%,rgba(18,64,108,.18),transparent 75%),radial-gradient(ellipse 55% 28% at 100% 58%,rgba(180,123,32,.09),transparent 78%),linear-gradient(180deg,#030812,#061021 40%,#030812); }
          .match-experience::before { content:"";position:absolute;inset:0;pointer-events:none;opacity:.13;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(to bottom,transparent 8%,black 30%,black 80%,transparent); }
          .match-panel { isolation:isolate; transition:border-color .3s ease,box-shadow .3s ease; }
          .match-panel:hover { border-color:rgba(251,191,36,.29);box-shadow:0 24px 72px rgba(0,0,0,.43),0 0 55px rgba(250,204,21,.035); }
          .match-panel::before { content:"";position:absolute;z-index:-1;inset:0;pointer-events:none;background:radial-gradient(ellipse 45% 35% at 100% 0%,rgba(48,102,155,.13),transparent 80%); }
          .match-panel::after { content:"";position:absolute;top:0;left:9%;right:9%;height:1px;background:linear-gradient(90deg,transparent,rgba(251,191,36,.43),transparent);pointer-events:none; }
          .match-panel h3 { letter-spacing:-.015em; }
          .match-panel a, .match-panel button { transition:transform .2s ease,border-color .2s ease,background-color .2s ease,box-shadow .2s ease; }
          .match-panel a:hover, .match-panel button:hover { filter:brightness(1.09); }
          .match-panel .tabular-nums { font-variant-numeric:tabular-nums; }
          @media (prefers-reduced-motion:reduce) { .match-panel, .match-panel a, .match-panel button {transition:none!important;} }
        `}</style>

      <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        <TornaAlTorneo torneoId={torneoValido.id} />

        {/* MATCH CENTER 3.0 — SCENOGRAFIA STEMMI 3D */}
        <section className="relative isolate mt-5 overflow-hidden rounded-[28px] border border-amber-200/20 bg-[#050c19] shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:rounded-[38px]">
          {/* Fondale stadio: costruito con CSS, nessun asset aggiuntivo */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(ellipse 85% 75% at 50% 105%,rgba(16,96,92,.38),transparent 70%),linear-gradient(180deg,#07142b 0%,#0a1425 42%,#02060f 100%)"}} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] opacity-50" style={{background:"repeating-linear-gradient(0deg,transparent 0px,transparent 20px,rgba(148,163,184,.07) 21px,transparent 23px),linear-gradient(180deg,transparent,rgba(13,57,61,.4))",transform:"perspective(350px) rotateX(45deg) scale(1.4)",transformOrigin:"bottom"}} />
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-36 h-80 w-80 rounded-full bg-sky-400/15 blur-[90px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full bg-amber-300/15 blur-[90px]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{background:"linear-gradient(115deg,transparent 18%,rgba(255,255,255,.045) 19%,transparent 26%,transparent 72%,rgba(255,255,255,.045) 73%,transparent 80%)"}} />

          {/* Gigantografie: i veri stemmi delle squadre dal database */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {casa?.stemma && (
              <div className="absolute -left-[23%] top-[12%] h-[70%] w-[75%] sm:-left-[12%] sm:top-[7%] sm:h-[90%] sm:w-[54%]" style={{perspective:"1100px",maskImage:"linear-gradient(90deg,black 35%,transparent 100%)",WebkitMaskImage:"linear-gradient(90deg,black 35%,transparent 100%)"}}>
                <img src={casa.stemma} alt="" className="h-full w-full object-contain opacity-[0.42] drop-shadow-[20px_30px_12px_rgba(0,0,0,0.85)] motion-safe:animate-[pulse_9s_ease-in-out_infinite]" style={{transform:"rotateY(-24deg) rotateZ(-12deg) scale(1.12)",filter:"drop-shadow(16px 24px 8px rgba(0,0,0,.9)) drop-shadow(-5px -4px 1px rgba(186,230,253,.35))"}} />
              </div>
            )}
            {ospite?.stemma && (
              <div className="absolute -right-[23%] top-[12%] h-[70%] w-[75%] sm:-right-[12%] sm:top-[7%] sm:h-[90%] sm:w-[54%]" style={{perspective:"1100px",maskImage:"linear-gradient(270deg,black 35%,transparent 100%)",WebkitMaskImage:"linear-gradient(270deg,black 35%,transparent 100%)"}}>
                <img src={ospite.stemma} alt="" className="h-full w-full object-contain opacity-[0.42] drop-shadow-[-20px_30px_12px_rgba(0,0,0,0.85)] motion-safe:animate-[pulse_11s_ease-in-out_infinite]" style={{transform:"rotateY(24deg) rotateZ(12deg) scale(1.12)",filter:"drop-shadow(-16px 24px 8px rgba(0,0,0,.9)) drop-shadow(5px -4px 1px rgba(253,230,138,.35))"}} />
              </div>
            )}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(3,8,19,.88)_0%,rgba(3,8,19,.48)_39%,transparent_76%)]" />

          <div className="relative z-10 px-4 pb-7 pt-6 sm:px-10 sm:pb-12 sm:pt-9">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300/90 sm:text-xs">PazziTournament · Match Center</p>
                <h1 className="mt-2 text-xl font-black tracking-tight text-white sm:text-3xl">{nomeFase(partitaValida.Fase)}</h1>
                <p className="mt-1 text-xs font-semibold text-slate-300 sm:text-sm">{torneoValido.nome}</p>
              </div>
              {admin && (
                <Link href={`/tornei/${torneoValido.id}/partite/${partitaValida.id.toString()}/modifica`} className="rounded-xl border border-amber-300/40 bg-amber-300/15 px-3 py-2 text-xs font-black text-amber-100 backdrop-blur transition hover:bg-amber-300/25">✏️ Modifica partita</Link>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-200 sm:mt-5 sm:text-xs">
              {partitaValida.girone && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">Girone {partitaValida.girone.nome}</span>}
              {partitaValida.giornata != null && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">Giornata {partitaValida.giornata}</span>}
              {dataPartita && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">📅 {dataPartita}</span>}
              {oraPartita && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">🕒 {oraPartita}</span>}
            </div>

            <div className="relative mt-9 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:mt-12 sm:gap-6">
              <div className="flex min-w-0 flex-col items-center text-center">
                {casa?.stemma ? <img src={casa.stemma} alt={`Stemma ${casa.nome}`} className="h-14 w-14 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,.8)] sm:h-24 sm:w-24" /> : <span className="text-4xl">⚽</span>}
                <h2 className="mt-3 break-words text-sm font-black leading-tight text-white sm:mt-5 sm:text-2xl">{casa?.nome ?? "TBD"}</h2>
                <p className="mt-2 break-words text-[10px] text-slate-300 sm:text-sm">🎮 {allenatoreCasa}</p>
                {partita.sostitutoCasa && <p className="mt-2 rounded-full border border-purple-300/20 bg-purple-500/10 px-2 py-1 text-[9px] text-purple-200 sm:text-xs">Sostituto: {partita.sostitutoCasa.nome}</p>}
              </div>
              <div className="relative z-20 flex min-w-[100px] flex-col items-center text-center sm:min-w-[240px]">
                <div className="mb-3 h-px w-14 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent sm:w-28" />
                <div className="whitespace-nowrap text-[clamp(2.75rem,9vw,8.5rem)] font-black leading-none tracking-[-.09em] text-white tabular-nums" style={{textShadow:"0 6px 0 rgba(15,23,42,.8),0 16px 28px rgba(0,0,0,.9),0 0 60px rgba(251,191,36,.20)"}}>
                  {partita.Completata || partita.GolCasa != null || partita.GolOspite != null ? <>{partita.GolCasa ?? 0}<span className="mx-1 text-amber-300/75 sm:mx-3">:</span>{partita.GolOspite ?? 0}</> : <span className="tracking-normal text-[.7em]">VS</span>}
                </div>
                {partita.AiRigori && <div className="mt-3 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black text-amber-200 sm:text-sm">Rigori {partita.RigoriCasa ?? 0} – {partita.RigoriOspite ?? 0}</div>}
                <div className={`mt-4 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest backdrop-blur sm:text-[11px] ${partita.Completata ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}>
                  {partita.Completata ? "Partita conclusa" : "In corso / non conclusa"}
                </div>
                <div className="mt-3 h-px w-14 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent sm:w-28" />
              </div>
              <div className="flex min-w-0 flex-col items-center text-center">
                {ospite?.stemma ? <img src={ospite.stemma} alt={`Stemma ${ospite.nome}`} className="h-14 w-14 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,.8)] sm:h-24 sm:w-24" /> : <span className="text-4xl">⚽</span>}
                <h2 className="mt-3 break-words text-sm font-black leading-tight text-white sm:mt-5 sm:text-2xl">{ospite?.nome ?? "TBD"}</h2>
                <p className="mt-2 break-words text-[10px] text-slate-300 sm:text-sm">🎮 {allenatoreOspite}</p>
                {partita.sostitutoOspite && <p className="mt-2 rounded-full border border-purple-300/20 bg-purple-500/10 px-2 py-1 text-[9px] text-purple-200 sm:text-xs">Sostituto: {partita.sostitutoOspite.nome}</p>}
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
        </section>

        {/* PAZZI INSIGHTS — CURIOSITÀ STATISTICHE DELLA PARTITA */}
        <PazziInsightsPartita partitaId={partitaValida.id} />

        {/* 1. MARCATORI */}
        <section className={`mt-6 ${panel}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TitoloSezione
              icona="⚽"
              titolo="Marcatori"
              descrizione={`${partita.gol.length} ${
                partita.gol.length === 1 ? "gol registrato" : "gol registrati"
              } nella partita`}
            />

            {admin && (
              <Link
                href={`/tornei/${torneoValido.id}/partite/${partitaValida.id.toString()}/gol/nuova`}
                className="inline-flex items-center justify-center rounded-xl border border-sky-300/25 bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-3 text-xs font-black shadow-[0_8px_24px_rgba(37,99,235,.22)] transition hover:scale-[1.02] hover:from-sky-500 hover:to-blue-600"
              >
                ➕ Aggiungi gol
              </Link>
            )}
          </div>

          <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {casa?.stemma && <img src={casa.stemma} alt="" className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12" />}
              <div className="min-w-0">
                <p className="truncate text-xs font-black sm:text-base">{casa?.nome ?? "Casa"}</p>
                <p className="text-2xl font-black text-amber-200">{golCasaAccreditati.length}</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Timeline</span>
            <div className="flex min-w-0 items-center justify-end gap-3 text-right">
              <div className="min-w-0">
                <p className="truncate text-xs font-black sm:text-base">{ospite?.nome ?? "Ospite"}</p>
                <p className="text-2xl font-black text-amber-200">{golOspiteAccreditati.length}</p>
              </div>
              {ospite?.stemma && <img src={ospite.stemma} alt="" className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12" />}
            </div>
          </div>

          {partita.gol.length > 0 ? (
            <div className="relative mx-auto max-w-4xl py-2">
              <div aria-hidden="true" className="absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-300/60 to-transparent" />
              {[...partita.gol]
                .sort((a, b) => {
                  const ordinePeriodo = (periodo: string) => {
                    if (periodo === "PT" || periodo === "PRIMO_TEMPO") return 0;
                    if (periodo === "ST" || periodo === "SECONDO_TEMPO") return 1;
                    return 2;
                  };
                  return ordinePeriodo(a.periodo) - ordinePeriodo(b.periodo)
                    || a.minuto - b.minuto
                    || (a.recupero ?? 0) - (b.recupero ?? 0)
                    || a.id - b.id;
                })
                .map((gol) => {
                  const latoCasa = gol.tipo === "AUTOGOL"
                    ? gol.squadraId !== casa?.id
                    : gol.squadraId === casa?.id;
                  return (
                    <div key={gol.id} className="relative grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] sm:gap-4">
                      <div className={latoCasa ? "min-w-0 text-right" : ""}>
                        {latoCasa && (
                          <div className="rounded-xl border border-amber-200/20 bg-gradient-to-l from-amber-400/10 to-slate-900/70 px-3 py-3 sm:px-5">
                            <p className="break-words text-xs font-black text-white sm:text-base">⚽ {gol.calciatoreTorneo.calciatore.nome}</p>
                            <p className="mt-1 text-[10px] text-amber-200">{nomeTipoGol(gol.tipo)} · {nomePeriodo(gol.periodo)}</p>
                            {gol.tipo === "AUTOGOL" && <p className="mt-1 text-[10px] text-rose-300">Autogol a favore</p>}
                          </div>
                        )}
                      </div>
                      <div className="z-10 flex h-11 items-center justify-center rounded-xl border border-amber-300/50 bg-[#18263a] text-[11px] font-black text-amber-100 shadow-[0_0_22px_rgba(245,158,11,.15)] sm:h-12 sm:text-sm">
                        {minutoGol(gol.minuto, gol.recupero)}
                      </div>
                      <div className={!latoCasa ? "min-w-0" : ""}>
                        {!latoCasa && (
                          <div className="rounded-xl border border-sky-300/20 bg-gradient-to-r from-sky-400/10 to-slate-900/70 px-3 py-3 sm:px-5">
                            <p className="break-words text-xs font-black text-white sm:text-base">⚽ {gol.calciatoreTorneo.calciatore.nome}</p>
                            <p className="mt-1 text-[10px] text-sky-200">{nomeTipoGol(gol.tipo)} · {nomePeriodo(gol.periodo)}</p>
                            {gol.tipo === "AUTOGOL" && <p className="mt-1 text-[10px] text-rose-300">Autogol a favore</p>}
                          </div>
                        )}
                      </div>
                      {admin && (
                        <div className="col-span-3 ml-auto w-full max-w-xl">
                          <details className="group rounded-xl border border-white/10 bg-slate-950/35">
                            <summary className="cursor-pointer px-4 py-2 text-right text-[11px] font-bold text-slate-400 transition hover:text-amber-200">Gestisci questo gol ▾</summary>
                            <div className="p-2">{schedaGol(gol)}</div>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
              Nessun gol registrato.{admin ? " Puoi aggiungerlo con il pulsante qui sopra." : ""}
            </p>
          )}
        </section>

        {/* 2. CARTELLINI ROSSI */}
        <section className={`mt-6 ${panel}`}>
          <TitoloSezione
            icona="🟥"
            titolo="Cartellini rossi"
            descrizione={`${partita.cartelliniRossi.length} ${
              partita.cartelliniRossi.length === 1
                ? "espulsione registrata"
                : "espulsioni registrate"
            }`}
          />

          {admin && (
            <Link
              href={`/tornei/${torneoValido.id}/partite/${partitaValida.id.toString()}/cartellini-rossi/nuovo`}
              className="mb-3 inline-flex rounded-xl border border-red-300/20 bg-gradient-to-r from-red-800 to-rose-950 px-4 py-3 text-xs font-black transition hover:from-red-700 hover:to-red-900"
            >
              ➕ Aggiungi cartellino
            </Link>
          )}

          {partita.cartelliniRossi.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {partita.cartelliniRossi.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-red-400/25 bg-gradient-to-r from-red-950/50 to-[#0b1426] p-4 shadow-[inset_3px_0_0_rgba(248,113,113,.6)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-950 text-xl">
                    🟥
                  </div>
                  <div className="min-w-0">
                    <div className="break-words text-sm font-bold">
                      {c.calciatoreTorneo?.calciatore?.nome ??
                        "Giocatore non disponibile"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {c.squadra.nome}
                    </div>
                    <div className="mt-1 text-[10px] text-red-300">
                      Espulsione · {c.minuto ?? "-"}'
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={muted}>Nessun cartellino rosso registrato.</p>
          )}
        </section>

        
        {/* 3. SCONTRI DIRETTI */}
        {casa && ospite && (
          <section className={`${panel} mt-6`}>
            <TitoloSezione
              icona="🆚"
              titolo="Scontri diretti"
              descrizione={`${precedenti.length} ${
                precedenti.length === 1 ? "precedente" : "precedenti"
              } tra ${casa.nome} e ${ospite.nome}`}
            />

            {precedenti.length > 0 ? (
              <>
                {/* BILANCIO DELLE SFIDE */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-500/15 to-[#091527] p-4 text-center">
                    <div className="text-2xl font-black text-emerald-400 sm:text-3xl">
                      {vittorieCasa}
                    </div>
                    <div className="mt-1 text-[10px] font-bold leading-relaxed text-slate-300 sm:text-xs">
                      Vittorie {casa.nome}
                    </div>
                    <div className="mt-1 text-xs font-bold text-emerald-400">
                      {((vittorieCasa / precedenti.length) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-600/20 to-[#091527] p-4 text-center">
                    <div className="text-2xl font-black text-slate-200 sm:text-3xl">
                      {pareggi}
                    </div>
                    <div className="mt-1 text-[10px] font-bold leading-relaxed text-slate-300 sm:text-xs">
                      Pareggi
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-300">
                      {((pareggi / precedenti.length) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-b from-sky-500/15 to-[#091527] p-4 text-center">
                    <div className="text-2xl font-black text-blue-400 sm:text-3xl">
                      {vittorieOspite}
                    </div>
                    <div className="mt-1 text-[10px] font-bold leading-relaxed text-slate-300 sm:text-xs">
                      Vittorie {ospite.nome}
                    </div>
                    <div className="mt-1 text-xs font-bold text-blue-400">
                      {((vittorieOspite / precedenti.length) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* DISTRIBUZIONE DEI RISULTATI */}
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-300">
                      Distribuzione dei risultati
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {precedenti.length} partite
                    </span>
                  </div>

                  <div
                    className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
                    aria-label="Distribuzione delle vittorie e dei pareggi"
                  >
                    {vittorieCasa > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{
                          width: `${(vittorieCasa / precedenti.length) * 100}%`,
                        }}
                      />
                    )}

                    {pareggi > 0 && (
                      <div
                        className="h-full bg-slate-400 transition-all"
                        style={{
                          width: `${(pareggi / precedenti.length) * 100}%`,
                        }}
                      />
                    )}

                    {vittorieOspite > 0 && (
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${(vittorieOspite / precedenti.length) * 100}%`,
                        }}
                      />
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                    <span>
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      {casa.nome}
                    </span>
                    <span>
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-slate-400" />
                      Pareggi
                    </span>
                    <span>
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-500" />
                      {ospite.nome}
                    </span>
                  </div>
                </div>

                {/* CONFRONTO DIRETTO: INTEGRATO NEGLI SCONTRI DIRETTI */}
                <div className="mt-5 rounded-2xl border border-sky-400/15 bg-[#071426]/75 p-4 sm:p-5">
                  <h3 className="text-base font-black text-white">🆚 Confronto diretto</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Bilancio delle sfide precedenti, esclusa la partita corrente.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { nome: `Vittorie ${casa.nome}`, valore: vittorieCasa },
                      { nome: "Pareggi", valore: pareggi },
                      { nome: `Vittorie ${ospite.nome}`, valore: vittorieOspite },
                      { nome: "Precedenti", valore: precedenti.length },
                    ].map((voce) => (
                      <div key={voce.nome} className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-center">
                        <div className="text-xl font-black tabular-nums text-white sm:text-2xl">{voce.valore}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{voce.nome}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STATISTICHE DEI GOL */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#10243c] to-[#060e1c] p-4">
                    <div className={label}>Gol segnati</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xl font-black tabular-nums">
                        {golCasaTotali}
                      </span>
                      <span className="text-xs text-slate-600">–</span>
                      <span className="text-xl font-black tabular-nums">
                        {golOspiteTotali}
                      </span>
                    </div>
                    <div className="mt-1 break-words text-[10px] text-slate-400">
                      {casa.nome} · {ospite.nome}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#10243c] to-[#060e1c] p-4">
                    <div className={label}>Media gol a partita</div>
                    <div className="mt-2 text-xl font-black tabular-nums">
                      {(golCasaTotali / precedenti.length).toFixed(2)}
                      <span className="mx-1.5 text-slate-600">–</span>
                      {(golOspiteTotali / precedenti.length).toFixed(2)}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      Media {casa.nome} – {ospite.nome}
                    </div>
                  </div>
                </div>

                {/* STORICO DEGLI INCONTRI */}
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-black">
                      Storico degli incontri
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      Dal più recente
                    </span>
                  </div>

                  <div className="space-y-2">
                    {precedenti.map((p) => (
                      <Link
                        key={p.id.toString()}
                        href={`/tornei/${p.TorneoId}/partite/${p.id.toString()}`}
                        className="block rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition hover:border-slate-600 hover:bg-slate-800/60"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-slate-400">
                          <span className="min-w-0 break-words font-semibold">
                            {p.torneo.nome}
                          </span>
                          <span className="shrink-0">
                            {p.dataPartita
                              ? p.dataPartita.toLocaleDateString("it-IT")
                              : "Data non disponibile"}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                          <span className="break-words text-xs font-bold sm:text-sm">
                            {p.squadraCasa?.nome ?? "TBD"}
                          </span>

                          <span className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-black tabular-nums">
                            {p.GolCasa ?? 0}
                            <span className="mx-1.5 text-slate-500">–</span>
                            {p.GolOspite ?? 0}
                          </span>

                          <span className="break-words text-right text-xs font-bold sm:text-sm">
                            {p.squadraOspite?.nome ?? "TBD"}
                          </span>
                        </div>

                        {p.AiRigori && (
                          <div className="mt-2 text-center text-[10px] font-semibold text-amber-300">
                            Rigori {p.RigoriCasa ?? 0} – {p.RigoriOspite ?? 0}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-center">
                <div className="text-2xl">🆚</div>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  Nessuno scontro diretto precedente
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Le statistiche compariranno dopo la prima partita conclusa tra queste squadre.
                </p>
              </div>
            )}
          </section>
        )}


        {/* 4. FORMA RECENTE */}
        {casa && ospite && (
          <section className={`mt-6 ${panel}`}>
            <TitoloSezione
              icona="📈"
              titolo="Forma recente"
              descrizione="Le ultime cinque partite concluse di ciascuna squadra"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { nome: casa.nome, forma: formaCasa },
                { nome: ospite.nome, forma: formaOspite },
              ].map((elemento) => (
                <div key={elemento.nome} className="min-w-0">
                  <h3 className="mb-3 border-b border-slate-800 pb-2 text-sm font-black">
                    {elemento.nome}
                  </h3>

                  {elemento.forma.length ? (
                    <div className="space-y-2">
                      {elemento.forma.map((f, i) => (
                        <div
                          key={`${f.avversario}-${i}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d2035] to-[#08111f] p-3.5 transition hover:border-amber-300/25"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                              f.risultato === "V"
                                ? "bg-emerald-950 text-emerald-300"
                                : f.risultato === "S"
                                  ? "bg-red-950 text-red-300"
                                  : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {f.risultato}
                          </span>

                          <div className="min-w-0 flex-1 text-xs">
                            <span className="text-slate-500">vs </span>
                            <span className="break-words font-semibold">
                              {f.avversario}
                            </span>
                          </div>

                          <div className="shrink-0 text-sm font-black tabular-nums">
                            {f.fatti}-{f.subiti}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={muted}>Nessuna partita recente.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

                {/* 5. STATISTICHE E PROBABILITÀ PRE-PARTITA */}
        {casa && ospite && (
          <StatisticheQuotePartita
            partitaId={partitaValida.id.toString()}
            squadraCasaId={casa.id}
            squadraOspiteId={ospite.id}
            dataPartita={partitaValida.dataPartita}
            torneoTipo={torneoValido.tipo}
          />
        )}

        {/* 6. RANKING SQUADRE */}
        <section className={`mt-6 ${panel}`}>
          <TitoloSezione
            icona="🏆"
            titolo="Ranking squadre"
            descrizione="Posizioni e punti prima e dopo la partita"
          />

          {squadrePerTipo.length ? (
            <div className="space-y-5">
              {squadrePerTipo.map((gruppo) => (
                <section key={gruppo.tipo}>
                  <h3 className="mb-3 border-b border-slate-800 pb-2 text-xs font-black uppercase tracking-wide text-blue-300">
                    {nomeTipoRanking(gruppo.tipo)}
                  </h3>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    {schedaRankingSquadra(
                      gruppo.casa,
                      gruppo.rankingCasa,
                      "casa",
                    )}
                    {schedaRankingSquadra(
                      gruppo.ospite,
                      gruppo.rankingOspite,
                      "ospite",
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className={muted}>
              Nessun ranking nazionale o club disponibile per questa partita.
            </p>
          )}
        </section>

        {/* 7. RANKING ALLENATORI */}
        <section className={`mt-6 ${panel}`}>
          <TitoloSezione
            icona="🎮"
            titolo="Ranking allenatori"
            descrizione="Punti e posizioni nel ranking del torneo corrente"
          />

          {coppieAllenatori.length ? (
            <div className="space-y-5">
              {coppieAllenatori.map((coppia) => (
                <section key={coppia.titolo}>
                  <h3 className="mb-3 border-b border-slate-800 pb-2 text-xs font-black uppercase tracking-wide text-purple-300">
                    {coppia.titolo}
                  </h3>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    {schedaRankingAllenatore(
                      coppia.casa,
                      "casa",
                      coppia.ruoloCasa,
                      coppia.idCasa,
                      coppia.nomeCasa,
                    )}
                    {schedaRankingAllenatore(
                      coppia.ospite,
                      "ospite",
                      coppia.ruoloOspite,
                      coppia.idOspite,
                      coppia.nomeOspite,
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className={muted}>
              Nessun punto allenatore registrato per questa partita.
            </p>
          )}
        </section>

        {/* 8. GOL DEGLI ALLENATORI */}
        <section className={`mt-6 ${panel}`}>
          <TitoloSezione
            icona="📊"
            titolo="Gol degli allenatori"
            descrizione="Andamento nelle ultime dieci partite concluse, per ruolo"
          />

          {graficiGolAllenatoriVisibili.length > 0 ? (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {graficiGolAllenatoriVisibili.map((grafico) => (
                <div
                  key={grafico.ruolo}
                  className="min-w-0 border-t border-slate-800 pt-4 first:border-t-0 first:pt-0 xl:[&:nth-child(2)]:border-t-0 xl:[&:nth-child(2)]:pt-0"
                >
                  <GraficoGolAllenatore
  nome={grafico.nome}
  ruolo={grafico.ruolo}
  partite={grafico.partite}
  fasce={grafico.fasce}
/>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-950/60 p-4 text-sm text-slate-400">
              Non ci sono partite registrate nello storico degli allenatori.
            </p>
          )}
        </section>

        {/* ELIMINAZIONE: SOLO ADMIN */}
        {admin && (
          <form action={eliminaPartita} className="mt-5 pb-10">
            <input type="hidden" name="torneoId" value={torneoValido.id} />
            <input
              type="hidden"
              name="partitaId"
              value={partitaValida.id.toString()}
            />
            <button
              type="submit"
              className="w-full rounded-xl border border-red-500/30 bg-red-950/50 p-3.5 text-sm font-black text-red-200 transition hover:border-red-400 hover:bg-red-900 sm:p-4"
            >
              🗑️ Elimina partita
            </button>
          </form>
        )}
      </div>
    </main>
  );
}