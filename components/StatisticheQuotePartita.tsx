import { prisma } from "@/lib/prisma";

type Props = {
  partitaId: string;
  squadraCasaId: number | null;
  squadraOspiteId: number | null;
  dataPartita: Date | null;
  torneoTipo?: string | null;
};

type Statistiche = {
  giocate: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  fatti: number;
  subiti: number;
};

type StoricoPartita = {
  id: bigint;
  TorneoId: number;
  dataPartita: Date | null;
  SquadraCasaId: number | null;
  SquadraOspiteId: number | null;
  GolCasa: number | null;
  GolOspite: number | null;
  sostitutoCasaId: number | null;
  sostitutoOspiteId: number | null;
  torneo: {
    videogiocoId: number | null;
    videogioco: string | null;
    partecipazioni: {
      squadraId: number;
      partecipanteId: number | null;
    }[];
  };
};

type PrestazioneAllenatore = {
  id: number;
  nome: string;
  partiteGioco: number;
  puntiGioco: number;
  partiteSquadra: number;
  puntiSquadra: number;
  affidabilitaGioco: number;
  affidabilitaSquadra: number;
  effettoRating: number;
};

const panel =
  "relative overflow-hidden rounded-[28px] border border-amber-200/15 bg-[#0b172b]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,.25)] sm:p-7";

const muted = "text-sm text-slate-400";

function nuoveStatistiche(): Statistiche {
  return {
    giocate: 0,
    vittorie: 0,
    pareggi: 0,
    sconfitte: 0,
    fatti: 0,
    subiti: 0,
  };
}

function limita(valore: number, minimo: number, massimo: number) {
  return Math.max(minimo, Math.min(massimo, valore));
}

function affidabilitaCampione(numero: number, costante = 5) {
  return numero > 0 ? numero / (numero + costante) : 0;
}

function percentuale(valore: number, totale: number) {
  return totale ? `${((valore / totale) * 100).toFixed(1)}%` : "—";
}

function quota(probabilita: number) {
  return probabilita > 0 ? (1 / probabilita).toFixed(2) : "—";
}

function formatoRating(valore: number) {
  const arrotondato = Math.round(valore);
  return arrotondato > 0 ? `+${arrotondato}` : `${arrotondato}`;
}

function poisson(lambda: number, gol: number) {
  let risultato = Math.exp(-lambda);

  for (let i = 1; i <= gol; i++) {
    risultato *= lambda / i;
  }

  return risultato;
}

function limitaLambda(valore: number) {
  return limita(valore, 0.15, 4.5);
}

function probabilitaEsiti(lambdaCasa: number, lambdaOspite: number) {
  let casa = 0;
  let pareggio = 0;
  let ospite = 0;

  for (let gc = 0; gc <= 12; gc++) {
    for (let go = 0; go <= 12; go++) {
      const p = poisson(lambdaCasa, gc) * poisson(lambdaOspite, go);

      if (gc > go) casa += p;
      else if (gc < go) ospite += p;
      else pareggio += p;
    }
  }

  const totale = casa + pareggio + ospite;

  return totale > 0
    ? {
        casa: casa / totale,
        pareggio: pareggio / totale,
        ospite: ospite / totale,
      }
    : { casa: 0, pareggio: 0, ospite: 0 };
}

function èPrima(
  data: Date | null,
  id: bigint,
  dataCorrente: Date | null,
  idCorrente: bigint
) {
  if (data && dataCorrente) {
    const differenza = data.getTime() - dataCorrente.getTime();
    if (differenza !== 0) return differenza < 0;
  }

  if (data && !dataCorrente) return true;
  if (!data && dataCorrente) return id < idCorrente;

  return id < idCorrente;
}

function stessaDataGioco(
  corrente: { videogiocoId: number | null; videogioco: string | null },
  storico: { videogiocoId: number | null; videogioco: string | null }
) {
  if (
    corrente.videogiocoId !== null &&
    storico.videogiocoId !== null
  ) {
    return corrente.videogiocoId === storico.videogiocoId;
  }

  const nomeCorrente = corrente.videogioco?.trim().toLocaleLowerCase("it");
  const nomeStorico = storico.videogioco?.trim().toLocaleLowerCase("it");

  return Boolean(nomeCorrente && nomeStorico && nomeCorrente === nomeStorico);
}

function registraPartita(
  statistiche: Statistiche,
  fatti: number,
  subiti: number
) {
  statistiche.giocate++;
  statistiche.fatti += fatti;
  statistiche.subiti += subiti;

  if (fatti > subiti) statistiche.vittorie++;
  else if (fatti < subiti) statistiche.sconfitte++;
  else statistiche.pareggi++;
}

function puntiPerEsito(fatti: number, subiti: number) {
  if (fatti > subiti) return 3;
  if (fatti === subiti) return 1;
  return 0;
}

function puntiMedi(risultati: { fatti: number; subiti: number }[]) {
  if (risultati.length === 0) return 0;

  return (
    risultati.reduce(
      (somma, partita) =>
        somma + puntiPerEsito(partita.fatti, partita.subiti),
      0
    ) / risultati.length
  );
}

function Statistica({
  titolo,
  casa,
  ospite,
}: {
  titolo: string;
  casa: string | number;
  ospite: string | number;
}) {
  const numerico = (v: string | number) => {
    if (typeof v === "number") return Number.isFinite(v) ? Math.max(0, v) : 0;
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };
  const a = numerico(casa);
  const b = numerico(ospite);
  const massimo = Math.max(a, b, 0.000001);
  const larghezzaCasa = Math.min(100, a / massimo * 100);
  const larghezzaOspite = Math.min(100, b / massimo * 100);
  return (
    <div className="rounded-xl border border-white/[.06] bg-[#0c1b31]/65 px-3 py-3 sm:px-4">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">{titolo}</p>
      <div className="grid grid-cols-[48px_minmax(0,1fr)_12px_minmax(0,1fr)_48px] items-center gap-2 sm:grid-cols-[75px_minmax(0,1fr)_16px_minmax(0,1fr)_75px]">
        <strong className="text-left text-sm font-black tabular-nums text-emerald-300 sm:text-lg">{casa}</strong>
        <div className="flex h-2 justify-end overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-emerald-600 transition-all duration-700" style={{ width: `${larghezzaCasa}%` }} />
        </div>
        <span className="text-center text-[10px] text-slate-600">·</span>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-blue-600 transition-all duration-700" style={{ width: `${larghezzaOspite}%` }} />
        </div>
        <strong className="text-right text-sm font-black tabular-nums text-sky-300 sm:text-lg">{ospite}</strong>
      </div>
    </div>
  );
}

function BarraProbabilita({
  casa,
  pareggio,
  ospite,
}: {
  casa: number;
  pareggio: number;
  ospite: number;
}) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${casa * 100}%` }}
        />
        <div
          className="bg-amber-400 transition-all"
          style={{ width: `${pareggio * 100}%` }}
        />
        <div
          className="bg-sky-500 transition-all"
          style={{ width: `${ospite * 100}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="text-emerald-300">
          Casa · {(casa * 100).toFixed(1)}%
        </div>
        <div className="text-amber-300">
          Pareggio · {(pareggio * 100).toFixed(1)}%
        </div>
        <div className="text-sky-300">
          Ospite · {(ospite * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function SchedaAllenatore({
  nome,
  prestazione,
}: {
  nome: string;
  prestazione: PrestazioneAllenatore | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="break-words font-black">{nome}</div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500">Partite nel gioco</div>
          <div className="mt-1 text-xl font-black">
            {prestazione?.partiteGioco ?? 0}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">
            Partite con questa squadra nel gioco
          </div>
          <div className="mt-1 text-xl font-black">
            {prestazione?.partiteSquadra ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
        <div>
          <div className="text-xs text-slate-500">Punti medi nel gioco</div>
          <div className="mt-1 text-lg font-black">
            {prestazione && prestazione.partiteGioco > 0
              ? prestazione.puntiGioco.toFixed(2)
              : "—"}
            <span className="text-xs font-normal text-slate-500"> / 3</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">
            Punti medi con la squadra nel gioco
          </div>
          <div className="mt-1 text-lg font-black">
            {prestazione && prestazione.partiteSquadra > 0
              ? prestazione.puntiSquadra.toFixed(2)
              : "—"}
            <span className="text-xs font-normal text-slate-500"> / 3</span>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3">
        <div className="text-xs text-slate-500">
          Contributo allenatore stimato
        </div>
        <div
          className={`mt-1 text-lg font-black ${
            (prestazione?.effettoRating ?? 0) > 0
              ? "text-emerald-300"
              : (prestazione?.effettoRating ?? 0) < 0
                ? "text-rose-300"
                : "text-slate-300"
          }`}
        >
          {formatoRating(prestazione?.effettoRating ?? 0)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Stima sperimentale, ridotta quando lo storico è limitato.
        </div>
      </div>
    </div>
  );
}

export default async function StatisticheQuotePartita({
  partitaId,
  squadraCasaId,
  squadraOspiteId,
  dataPartita,
}: Props) {
  if (
    squadraCasaId == null ||
    squadraOspiteId == null ||
    squadraCasaId === squadraOspiteId
  ) {
    return null;
  }

  let idCorrente: bigint;

  try {
    idCorrente = BigInt(partitaId);
  } catch {
    return null;
  }

  const partitaCorrente = await prisma.partita.findUnique({
    where: { id: idCorrente },
    select: {
      TorneoId: true,
      dataPartita: true,
      torneo: {
        select: {
          videogiocoId: true,
          videogioco: true,
          gioco: { select: { id: true, nome: true } },
        },
      },
    },
  });

  if (!partitaCorrente) return null;

  const idCasa = squadraCasaId;
  const idOspite = squadraOspiteId;

  const videogiocoIdCorrente =
    partitaCorrente.torneo.videogiocoId ??
    partitaCorrente.torneo.gioco?.id ??
    null;

  const giocoCorrente = {
    videogiocoId: videogiocoIdCorrente,
    videogioco:
      partitaCorrente.torneo.gioco?.nome ??
      partitaCorrente.torneo.videogioco,
  };

  async function partidaValutazioni() {
    if (videogiocoIdCorrente === null) return [];

    return prisma.valutazioneSquadraGioco.findMany({
      where: {
        videogiocoId: videogiocoIdCorrente,
        squadraId: { in: [idCasa, idOspite] },
      },
      select: {
        squadraId: true,
        valutazione: true,
      },
    });
  }

  const [casa, ospite, partecipazioni, valutazioni] = await Promise.all([
    prisma.squadra.findUnique({
      where: { id: idCasa },
      select: { id: true, nome: true, tipo: true },
    }),
    prisma.squadra.findUnique({
      where: { id: idOspite },
      select: { id: true, nome: true, tipo: true },
    }),
    prisma.partecipazione.findMany({
      where: {
        torneoId: partitaCorrente.TorneoId,
        squadraId: { in: [idCasa, idOspite] },
      },
      select: {
        squadraId: true,
        partecipanteId: true,
        partecipante: { select: { id: true, nome: true } },
      },
    }),
    partidaValutazioni(),
  ]);

  if (!casa || !ospite) return null;

  const valutazioneCasa =
    valutazioni.find((v) => v.squadraId === idCasa)?.valutazione ?? null;

  const valutazioneOspite =
    valutazioni.find((v) => v.squadraId === idOspite)?.valutazione ?? null;

  const partecipazioneCasa = partecipazioni.find((p) => p.squadraId === idCasa);
  const partecipazioneOspite = partecipazioni.find((p) => p.squadraId === idOspite);

  const allenatoreCasaId = partecipazioneCasa?.partecipanteId ?? null;
  const allenatoreOspiteId = partecipazioneOspite?.partecipanteId ?? null;

  const nomeAllenatoreCasa =
    partecipazioneCasa?.partecipante?.nome ?? "Allenatore non assegnato";

  const nomeAllenatoreOspite =
    partecipazioneOspite?.partecipante?.nome ?? "Allenatore non assegnato";

  const tutteLePartite = await prisma.partita.findMany({
    where: {
      id: { not: idCorrente },
      Completata: true,
      GolCasa: { not: null },
      GolOspite: { not: null },
    },
    select: {
      id: true,
      TorneoId: true,
      dataPartita: true,
      SquadraCasaId: true,
      SquadraOspiteId: true,
      GolCasa: true,
      GolOspite: true,
      sostitutoCasaId: true,
      sostitutoOspiteId: true,
      torneo: {
        select: {
          videogiocoId: true,
          videogioco: true,
          partecipazioni: {
            select: {
              squadraId: true,
              partecipanteId: true,
            },
          },
        },
      },
    },
  });

  const precedenti = (tutteLePartite as StoricoPartita[])
    .filter((p) => èPrima(p.dataPartita, p.id, dataPartita, idCorrente))
    .sort((a, b) => {
      const da = a.dataPartita?.getTime() ?? 0;
      const db = b.dataPartita?.getTime() ?? 0;

      if (da !== db) return da - db;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const precedentiGioco = precedenti.filter((p) =>
    stessaDataGioco(giocoCorrente, p.torneo)
  );

  function statisticheSquadra(
    squadraId: number,
    partite: StoricoPartita[]
  ): Statistiche {
    const stat = nuoveStatistiche();

    for (const p of partite) {
      const inCasa = p.SquadraCasaId === squadraId;
      const inOspite = p.SquadraOspiteId === squadraId;

      if (!inCasa && !inOspite) continue;
      if (p.GolCasa === null || p.GolOspite === null) continue;

      const fatti = inCasa ? p.GolCasa : p.GolOspite;
      const subiti = inCasa ? p.GolOspite : p.GolCasa;

      registraPartita(stat, fatti, subiti);
    }

    return stat;
  }

  const statCasaGenerali = statisticheSquadra(idCasa, precedenti);
  const statOspiteGenerali = statisticheSquadra(idOspite, precedenti);
  const statCasaGioco = statisticheSquadra(idCasa, precedentiGioco);
  const statOspiteGioco = statisticheSquadra(idOspite, precedentiGioco);

  // Le statistiche totali sono solo informative: il modello usa
  // esclusivamente le medie delle partite precedenti nello stesso videogioco.
  // Se non esiste uno storico specifico, usa un valore neutro fisso.
  function statistichePerPrevisione(specifiche: Statistiche) {
    return {
      golFatti:
        specifiche.giocate > 0
          ? specifiche.fatti / specifiche.giocate
          : 1.25,
      golSubiti:
        specifiche.giocate > 0
          ? specifiche.subiti / specifiche.giocate
          : 1.25,
    };
  }

  const rendimentoCasa = statistichePerPrevisione(statCasaGioco);
  const rendimentoOspite = statistichePerPrevisione(statOspiteGioco);

  const mediaGolCasa = rendimentoCasa.golFatti;
  const mediaGolSubitiCasa = rendimentoCasa.golSubiti;
  const mediaGolOspite = rendimentoOspite.golFatti;
  const mediaGolSubitiOspite = rendimentoOspite.golSubiti;

  const scontriDiretti = {
    vittorieCasa: 0,
    pareggi: 0,
    vittorieOspite: 0,
    golCasa: 0,
    golOspite: 0,
    giocate: 0,
  };

  for (const p of precedenti) {
    if (p.GolCasa === null || p.GolOspite === null) continue;

    const diretto =
      (p.SquadraCasaId === idCasa && p.SquadraOspiteId === idOspite) ||
      (p.SquadraCasaId === idOspite && p.SquadraOspiteId === idCasa);

    if (!diretto) continue;

    const fattiCasa = p.SquadraCasaId === idCasa ? p.GolCasa : p.GolOspite;
    const fattiOspite = p.SquadraCasaId === idCasa ? p.GolOspite : p.GolCasa;

    scontriDiretti.giocate++;
    scontriDiretti.golCasa += fattiCasa;
    scontriDiretti.golOspite += fattiOspite;

    if (fattiCasa > fattiOspite) scontriDiretti.vittorieCasa++;
    else if (fattiCasa < fattiOspite) scontriDiretti.vittorieOspite++;
    else scontriDiretti.pareggi++;
  }

  const nomiAllenatori = new Map<number, string>();

  for (const p of partecipazioni) {
    if (p.partecipante) {
      nomiAllenatori.set(p.partecipante.id, p.partecipante.nome);
    }
  }

  const idsDaCercare = Array.from(
    new Set(
      [allenatoreCasaId, allenatoreOspiteId].filter(
        (id): id is number => id !== null
      )
    )
  );

  const datiAllenatori = idsDaCercare.length
    ? await prisma.partecipante.findMany({
        where: { id: { in: idsDaCercare } },
        select: { id: true, nome: true },
      })
    : [];

  for (const a of datiAllenatori) {
    nomiAllenatori.set(a.id, a.nome);
  }

  function allenatorePartita(p: StoricoPartita, squadraId: number) {
    if (p.SquadraCasaId === squadraId && p.sostitutoCasaId !== null) {
      return p.sostitutoCasaId;
    }

    if (p.SquadraOspiteId === squadraId && p.sostitutoOspiteId !== null) {
      return p.sostitutoOspiteId;
    }

    return (
      p.torneo.partecipazioni.find((part) => part.squadraId === squadraId)
        ?.partecipanteId ?? null
    );
  }

  function prestazioneAllenatore(
    allenatoreId: number | null,
    squadraId: number
  ): PrestazioneAllenatore | null {
    if (allenatoreId === null) return null;

    const risultatiGioco: { fatti: number; subiti: number }[] = [];
    const risultatiSquadra: { fatti: number; subiti: number }[] = [];

    for (const p of precedentiGioco) {
      if (
        p.SquadraCasaId === null ||
        p.SquadraOspiteId === null ||
        p.GolCasa === null ||
        p.GolOspite === null
      ) {
        continue;
      }

      for (const idSquadra of [p.SquadraCasaId, p.SquadraOspiteId]) {
        if (allenatorePartita(p, idSquadra) !== allenatoreId) continue;

        const fatti = idSquadra === p.SquadraCasaId ? p.GolCasa : p.GolOspite;
        const subiti = idSquadra === p.SquadraCasaId ? p.GolOspite : p.GolCasa;

        risultatiGioco.push({ fatti, subiti });

        // L'affinità con la squadra deve essere specifica anche per il gioco.
        if (idSquadra === squadraId) {
          risultatiSquadra.push({ fatti, subiti });
        }
      }
    }

    const puntiGioco = puntiMedi(risultatiGioco);
    const puntiSquadra = puntiMedi(risultatiSquadra);

    const affidabilitaGioco = affidabilitaCampione(
      risultatiGioco.length,
      5
    );

    const affidabilitaSquadra = affidabilitaCampione(
      risultatiSquadra.length,
      4
    );

    const effettoGioco =
      (puntiGioco - 1.5) * 55 * affidabilitaGioco;

    const effettoSquadra =
      (puntiSquadra - 1.5) * 85 * affidabilitaSquadra;

    return {
      id: allenatoreId,
      nome: nomiAllenatori.get(allenatoreId) ?? `Allenatore ${allenatoreId}`,
      partiteGioco: risultatiGioco.length,
      puntiGioco,
      partiteSquadra: risultatiSquadra.length,
      puntiSquadra,
      affidabilitaGioco,
      affidabilitaSquadra,
      effettoRating: limita(effettoGioco + effettoSquadra, -120, 120),
    };
  }

  const prestazioneCasa = prestazioneAllenatore(allenatoreCasaId, idCasa);
  const prestazioneOspite = prestazioneAllenatore(allenatoreOspiteId, idOspite);

  // Ranking di squadra: utilizzato come fattore di ripiego.
  const tipiCasa = casa.tipo.trim().toLowerCase().includes("nazional");
  const tipiOspite = ospite.tipo.trim().toLowerCase().includes("nazional");

  const tipoRanking =
    tipiCasa === tipiOspite
      ? tipiCasa
        ? "NAZIONALE"
        : "CLUB"
      : null;

  const rankings = tipoRanking
    ? await prisma.rankingSquadra.findMany({
        where: {
          squadraId: { in: [idCasa, idOspite] },
          tipo: tipoRanking,
        },
        include: {
          storico: {
            include: {
              partita: { select: { id: true, dataPartita: true } },
            },
          },
        },
      })
    : [];

  function ratingPrima(squadraId: number) {
    const ranking = rankings.find((r) => r.squadraId === squadraId);
    if (!ranking) return 0;

    const storicoPrecedente = ranking.storico
      .filter((r) =>
        èPrima(r.partita.dataPartita, r.partita.id, dataPartita, idCorrente)
      )
      .sort((a, b) => {
        const da = a.partita.dataPartita?.getTime() ?? 0;
        const db = b.partita.dataPartita?.getTime() ?? 0;

        if (da !== db) return da - db;
        return a.partita.id < b.partita.id
          ? -1
          : a.partita.id > b.partita.id
            ? 1
            : 0;
      });

    return storicoPrecedente.length
      ? storicoPrecedente[storicoPrecedente.length - 1].ratingDopo
      : 0;
  }

  const ratingCasa = ratingPrima(idCasa);
  const ratingOspite = ratingPrima(idOspite);

  // Le valutazioni specifiche del gioco hanno scala 1-100.
  // Se una valutazione manca, assumiamo il valore neutro 50.
  const differenzaValutazioneGioco =
    ((valutazioneCasa ?? 50) - (valutazioneOspite ?? 50)) * 4;

  const numeroPartiteSpecifiche = Math.min(
    statCasaGioco.giocate,
    statOspiteGioco.giocate
  );

  const affidabilitaStoricoSquadre = affidabilitaCampione(
    numeroPartiteSpecifiche,
    5
  );

  const numeroValutazioniDisponibili =
    Number(valutazioneCasa !== null) +
    Number(valutazioneOspite !== null);

  const affidabilitaValutazioni =
    (numeroValutazioniDisponibili / 2) * 0.7;

  const affidabilitaAllenatoreCasa = Math.max(
    prestazioneCasa?.affidabilitaGioco ?? 0,
    prestazioneCasa?.affidabilitaSquadra ?? 0
  );

  const affidabilitaAllenatoreOspite = Math.max(
    prestazioneOspite?.affidabilitaGioco ?? 0,
    prestazioneOspite?.affidabilitaSquadra ?? 0
  );

  const affidabilitaAllenatori =
    (affidabilitaAllenatoreCasa + affidabilitaAllenatoreOspite) / 2;

  const affidabilitaAltriDati =
    1 -
    (1 - affidabilitaStoricoSquadre) *
      (1 - affidabilitaValutazioni) *
      (1 - affidabilitaAllenatori);

  const pesoRanking = 1 - affidabilitaAltriDati;
  const differenzaRanking = ratingCasa - ratingOspite;

  const contributoRanking = limita(
    differenzaRanking * pesoRanking,
    -250,
    250
  );

  const effettoAllenatoreCasa = prestazioneCasa?.effettoRating ?? 0;
  const effettoAllenatoreOspite = prestazioneOspite?.effettoRating ?? 0;

  const differenzaRating =
    differenzaValutazioneGioco +
    contributoRanking +
    effettoAllenatoreCasa -
    effettoAllenatoreOspite;

  const baseCasa = (mediaGolCasa + mediaGolSubitiOspite) / 2;
  const baseOspite = (mediaGolOspite + mediaGolSubitiCasa) / 2;

  const fattoreRating = Math.pow(10, differenzaRating / 1600);

  const lambdaCasa = limitaLambda(
    baseCasa * 1.08 * Math.sqrt(fattoreRating)
  );

  const lambdaOspite = limitaLambda(
    baseOspite / Math.sqrt(fattoreRating)
  );

  const probabilita = probabilitaEsiti(lambdaCasa, lambdaOspite);

  const partiteCampione = numeroPartiteSpecifiche;

  const affidabilita =
    partiteCampione < 3
      ? {
          titolo: "Bassa",
          testo:
            "Pochi precedenti nel videogioco corrente: la previsione è indicativa.",
          classe: "border-red-900 bg-red-950/40 text-red-300",
        }
      : partiteCampione < 8
        ? {
            titolo: "Media",
            testo:
              "Il campione nel videogioco corrente è ancora limitato.",
            classe: "border-amber-900 bg-amber-950/40 text-amber-300",
          }
        : {
            titolo: "Più solida",
            testo:
              "Sono disponibili diversi precedenti nel videogioco corrente.",
            classe: "border-emerald-900 bg-emerald-950/40 text-emerald-300",
          };

  const nomeGioco =
    giocoCorrente.videogioco ?? "Videogioco non specificato";

  const descrizioneValutazioni =
    valutazioneCasa !== null && valutazioneOspite !== null
      ? `Valutazioni squadre nel gioco: ${valutazioneCasa}/100 e ${valutazioneOspite}/100.`
      : valutazioneCasa !== null
        ? `Valutazione disponibile per ${casa.nome}: ${valutazioneCasa}/100. Per ${ospite.nome} viene usato il valore neutro.`
        : valutazioneOspite !== null
          ? `Valutazione disponibile per ${ospite.nome}: ${valutazioneOspite}/100. Per ${casa.nome} viene usato il valore neutro.`
          : "Valutazione di entrambe le squadre non disponibile per questo gioco.";

  return (
    <div className="mt-6 space-y-6">
      <section className={panel}>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
          Analisi pre-partita
        </p>
        <h2 className="mt-1 text-2xl font-black">
          📊 Statistiche delle squadre
        </h2>
        <p className={`${muted} mt-1`}>
          Videogioco analizzato: <strong>{nomeGioco}</strong>. Le statistiche
          totali sono mostrate solo a scopo informativo e non influiscono sulle
          probabilità o sulle quote pre-partita.
        </p>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-[#071323] p-4">
          <div className="min-w-0 text-left"><p className="truncate text-base font-black text-emerald-300">{casa.nome}</p><p className="text-xs text-slate-500">Casa</p></div>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200">VS</span>
          <div className="min-w-0 text-right"><p className="truncate text-base font-black text-sky-300">{ospite.nome}</p><p className="text-xs text-slate-500">Ospite</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-blue-400/20 bg-slate-950/50 p-3 sm:p-5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-[.12em] text-blue-200">🎮 Nel videogioco: {nomeGioco}</h3>
          <p className="mb-4 text-xs text-slate-400">Storico specifico utilizzato dal motore pre-partita.</p>
          <div className="space-y-2">
            <Statistica titolo="Partite giocate" casa={statCasaGioco.giocate} ospite={statOspiteGioco.giocate} />
            <Statistica titolo="Vittorie" casa={statCasaGioco.vittorie} ospite={statOspiteGioco.vittorie} />
            <Statistica titolo="Pareggi" casa={statCasaGioco.pareggi} ospite={statOspiteGioco.pareggi} />
            <Statistica titolo="Sconfitte" casa={statCasaGioco.sconfitte} ospite={statOspiteGioco.sconfitte} />
            <Statistica titolo="Gol segnati" casa={statCasaGioco.fatti} ospite={statOspiteGioco.fatti} />
            <Statistica titolo="Gol subiti" casa={statCasaGioco.subiti} ospite={statOspiteGioco.subiti} />
            <Statistica titolo="% vittorie" casa={percentuale(statCasaGioco.vittorie, statCasaGioco.giocate)} ospite={percentuale(statOspiteGioco.vittorie, statOspiteGioco.giocate)} />
          </div>
        </div>
        <details className="group mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3 open:border-sky-400/25 sm:p-5">
          <summary className="cursor-pointer list-none font-black text-slate-200 marker:hidden">
            <span className="flex items-center justify-between gap-3">🌐 Statistiche storiche · tutti i videogiochi <span className="text-xs font-semibold text-sky-300 group-open:hidden">Mostra ▼</span><span className="hidden text-xs font-semibold text-sky-300 group-open:inline">Nascondi ▲</span></span>
          </summary>
          <p className="mt-3 text-xs font-semibold text-amber-300">Solo informative: non entrano nel calcolo delle probabilità pre-partita.</p>
          <div className="mt-4 space-y-2">
            <Statistica titolo="Partite giocate" casa={statCasaGenerali.giocate} ospite={statOspiteGenerali.giocate} />
            <Statistica titolo="Vittorie" casa={statCasaGenerali.vittorie} ospite={statOspiteGenerali.vittorie} />
            <Statistica titolo="Pareggi" casa={statCasaGenerali.pareggi} ospite={statOspiteGenerali.pareggi} />
            <Statistica titolo="Sconfitte" casa={statCasaGenerali.sconfitte} ospite={statOspiteGenerali.sconfitte} />
            <Statistica titolo="Gol segnati" casa={statCasaGenerali.fatti} ospite={statOspiteGenerali.fatti} />
            <Statistica titolo="Gol subiti" casa={statCasaGenerali.subiti} ospite={statOspiteGenerali.subiti} />
            <Statistica titolo="% vittorie" casa={percentuale(statCasaGenerali.vittorie, statCasaGenerali.giocate)} ospite={percentuale(statOspiteGenerali.vittorie, statOspiteGenerali.giocate)} />
          </div>
        </details>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="font-black">Valutazione delle squadre</h3>
          <p className="mt-1 text-xs text-slate-400">
            {descrizioneValutazioni}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-slate-900 p-3">
              <div className="break-words text-sm text-slate-400">
                {casa.nome}
              </div>
              <div className="mt-1 text-2xl font-black">
                {valutazioneCasa !== null
                  ? `${valutazioneCasa}/100`
                  : "N/D"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 p-3">
              <div className="break-words text-sm text-slate-400">
                {ospite.nome}
              </div>
              <div className="mt-1 text-2xl font-black">
                {valutazioneOspite !== null
                  ? `${valutazioneOspite}/100`
                  : "N/D"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={panel}>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
          Motore statistico PazziTournament
        </p>
        <h2 className="mt-1 text-2xl font-black">
          🎯 Probabilità e quote pre-partita
        </h2>
        <p className={`${muted} mt-2`}>
          Il modello combina valutazioni delle squadre nel videogioco,
          rendimento storico, affinità allenatore-squadra e allenatore-gioco.
          Il ranking è un correttivo di ripiego, attenuato quando aumentano i
          dati specifici. Non sono quote di bookmaker.
        </p>

        <details className="group mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 open:border-amber-300/20">
          <summary className="cursor-pointer font-black text-amber-200">🧠 Come funziona il modello · affinità, fattori e gol attesi <span className="text-xs text-slate-400 group-open:hidden">▼</span><span className="hidden text-xs text-slate-400 group-open:inline">▲</span></summary>
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
          <h3 className="font-black">🧠 Affinità degli allenatori</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            I risultati sono valutati con 3 punti per vittoria, 1 per pareggio
            e 0 per sconfitta. Le affinità con il gioco e con la squadra sono
            ridotte in base alla numerosità dello storico nel gioco corrente.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SchedaAllenatore
              nome={nomeAllenatoreCasa}
              prestazione={prestazioneCasa}
            />
            <SchedaAllenatore
              nome={nomeAllenatoreOspite}
              prestazione={prestazioneOspite}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="font-black">Come contribuiscono i fattori</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="flex items-start justify-between gap-4">
              <span>Valutazione nel videogioco</span>
              <strong>{formatoRating(differenzaValutazioneGioco)}</strong>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span>Ranking di ripiego</span>
              <strong>{formatoRating(contributoRanking)}</strong>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span>Affinità allenatori</span>
              <strong>
                {formatoRating(
                  effettoAllenatoreCasa - effettoAllenatoreOspite
                )}
              </strong>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span>Affidabilità degli altri dati</span>
              <strong>
                {(affidabilitaAltriDati * 100).toFixed(0)}%
              </strong>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Sono contributi interni del modello, non variazioni del ranking
            ufficiale.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="font-black">Gol attesi dal modello</h3>
          <p className="mt-1 text-xs text-slate-400">
            Stima basata sul rendimento offensivo e difensivo, con fattore
            campo e correzione della forza relativa.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="text-xs text-slate-400">{casa.nome}</div>
              <div className="mt-1 text-3xl font-black text-emerald-300">
                {lambdaCasa.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
              <div className="text-xs text-slate-400">{ospite.nome}</div>
              <div className="mt-1 text-3xl font-black text-sky-300">
                {lambdaOspite.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        </details>
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
          <h3 className="mb-4 font-black">Probabilità 1-X-2</h3>
          <BarraProbabilita
            casa={probabilita.casa}
            pareggio={probabilita.pareggio}
            ospite={probabilita.ospite}
          />

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              {
                nome: "1 · Vittoria casa",
                valore: quota(probabilita.casa),
                colore: "text-emerald-300",
              },
              {
                nome: "X · Pareggio",
                valore: quota(probabilita.pareggio),
                colore: "text-amber-300",
              },
              {
                nome: "2 · Vittoria ospite",
                valore: quota(probabilita.ospite),
                colore: "text-sky-300",
              },
            ].map((elemento) => (
              <div
                key={elemento.nome}
                className="rounded-xl border border-slate-800 bg-slate-900 p-3"
              >
                <div className={`text-2xl font-black ${elemento.colore}`}>
                  {elemento.valore}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {elemento.nome}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Quote pari al reciproco delle probabilità stimate, senza margine
            bookmaker. Sono stime sperimentali, non garanzie di risultato.
          </p>
        </div>

        <div className={`mt-4 rounded-2xl border p-4 ${affidabilita.classe}`}>
          <div className="font-black">
            Affidabilità indicativa: {affidabilita.titolo}
          </div>
          <p className="mt-1 text-sm">{affidabilita.testo}</p>
          <p className="mt-2 text-xs opacity-80">
            Campione minimo nel videogioco corrente: {partiteCampione} partite.
          </p>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Il modello usa una distribuzione di Poisson sui gol attesi. La
          conversione dei rating e delle affinità in contributi alle
          probabilità è sperimentale e va valutata nel tempo confrontando
          previsioni e risultati reali.
        </p>
      </section>
    </div>
  );
}
