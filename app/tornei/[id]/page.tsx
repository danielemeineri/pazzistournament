
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import ScrollRipristinoTorneo from "@/components/ScrollRipristinoTorneo";
import RankingAllenatoriTorneo from "@/components/RankingAllenatoriTorneo";
import GalleriaFotoTorneo from "@/components/tornei/GalleriaFotoTorneo";
import RoadToFinalOrdinabile from "@/components/tornei/RoadToFinalOrdinabile";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ClassificaSquadra = {
  squadraId: number;
  nome: string;
  stemma: string | null;
  giocatore: string;
  pg: number;
  v: number;
  n: number;
  p: number;
  gf: number;
  gs: number;
  dr: number;
  punti: number;
};

type ClassificaMarcatori = {
  calciatoreId: number;
  nome: string;
  gol: number;
  squadre: string[];
};

function normalizzaFase(fase: string | null) {
  if (!fase) return "Altre partite";

  const valore = fase.toLowerCase();

  if (valore.includes("girone") || valore.includes("gruppo")) {
    return "Fase a gironi";
  }

  if (valore.includes("sedices") || valore.includes("round of 32")) {
    return "Sedicesimi di finale";
  }

  if (valore.includes("ottav") || valore.includes("round of 16")) {
    return "Ottavi di finale";
  }

  if (valore.includes("quart") || valore.includes("quarter")) {
    return "Quarti di finale";
  }

  if (valore.includes("semif") || valore.includes("semi")) {
    return "Semifinali";
  }

  if (
    valore.includes("terzo") ||
    valore.includes("3°") ||
    valore.includes("3º")
  ) {
    return "Finale 3° posto";
  }

  if (valore.includes("finale") || valore === "final") {
    return "Finale";
  }

  return fase;
}

function calcolaClassifica(
  partecipazioni: {
    squadraId: number;
    squadra: {
      id: number;
      nome: string;
      stemma: string | null;
    };
    partecipante: {
      nome: string;
    } | null;
  }[],
  partite: {
    SquadraCasaId: number | null;
    SquadraOspiteId: number | null;
    GolCasa: number | null;
    GolOspite: number | null;
    Completata: boolean | null;
  }[]
): ClassificaSquadra[] {
  const classifica = new Map<number, ClassificaSquadra>();

  for (const partecipazione of partecipazioni) {
    classifica.set(partecipazione.squadraId, {
      squadraId: partecipazione.squadraId,
      nome: partecipazione.squadra.nome,
      stemma: partecipazione.squadra.stemma,
      giocatore:
        partecipazione.partecipante?.nome ||
        "Giocatore non assegnato",
      pg: 0,
      v: 0,
      n: 0,
      p: 0,
      gf: 0,
      gs: 0,
      dr: 0,
      punti: 0,
    });
  }

  for (const partita of partite) {
    if (
      !partita.Completata ||
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null ||
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const casa = classifica.get(partita.SquadraCasaId);
    const ospite = classifica.get(partita.SquadraOspiteId);

    if (!casa || !ospite) {
      continue;
    }

    casa.pg += 1;
    ospite.pg += 1;

    casa.gf += partita.GolCasa;
    casa.gs += partita.GolOspite;

    ospite.gf += partita.GolOspite;
    ospite.gs += partita.GolCasa;

    if (partita.GolCasa > partita.GolOspite) {
      casa.v += 1;
      ospite.p += 1;
      casa.punti += 3;
    } else if (partita.GolCasa < partita.GolOspite) {
      ospite.v += 1;
      casa.p += 1;
      ospite.punti += 3;
    } else {
      casa.n += 1;
      ospite.n += 1;
      casa.punti += 1;
      ospite.punti += 1;
    }
  }

  const risultato = Array.from(classifica.values());

  for (const squadra of risultato) {
    squadra.dr = squadra.gf - squadra.gs;
  }

  risultato.sort((a, b) => {
    if (b.punti !== a.punti) {
      return b.punti - a.punti;
    }

    if (b.dr !== a.dr) {
      return b.dr - a.dr;
    }

    if (b.gf !== a.gf) {
      return b.gf - a.gf;
    }

    return a.nome.localeCompare(b.nome);
  });

  return risultato;
}

function calcolaClassificaMarcatori(
  gol: {
    tipo: "NORMALE" | "RIGORE" | "AUTOGOL";
    calciatoreTorneo: {
      calciatore: {
        id: number;
        nome: string;
      };
      squadra: {
        nome: string;
      };
    };
  }[]
): ClassificaMarcatori[] {
  const marcatori = new Map<number, ClassificaMarcatori>();

  for (const golSegnato of gol) {
    if (golSegnato.tipo === "AUTOGOL") {
      continue;
    }

    const calciatore = golSegnato.calciatoreTorneo.calciatore;
    const squadra = golSegnato.calciatoreTorneo.squadra;
    const esistente = marcatori.get(calciatore.id);

    if (esistente) {
      esistente.gol += 1;

      if (!esistente.squadre.includes(squadra.nome)) {
        esistente.squadre.push(squadra.nome);
      }
    } else {
      marcatori.set(calciatore.id, {
        calciatoreId: calciatore.id,
        nome: calciatore.nome,
        gol: 1,
        squadre: [squadra.nome],
      });
    }
  }

  return Array.from(marcatori.values()).sort((a, b) => {
    if (b.gol !== a.gol) {
      return b.gol - a.gol;
    }

    return a.nome.localeCompare(b.nome);
  });
}

function getColorePosizione(posizione: number) {
  if (posizione === 1) {
    return "bg-yellow-500/20 text-yellow-300";
  }

  if (posizione === 2) {
    return "bg-zinc-400/20 text-zinc-200";
  }

  if (posizione === 3) {
    return "bg-orange-500/20 text-orange-300";
  }

  return "";
}

function getInfoTrofeo(tipo: string) {
  switch (tipo) {
    case "VINCITORE_TORNEO":
      return {
        nome: "Vincitore del torneo",
        icona: "🏆",
        descrizione: "Campione del torneo",
      };

    case "MIGLIOR_MARCATORE":
      return {
        nome: "Miglior marcatore",
        icona: "⚽",
        descrizione: "Capocannoniere del torneo",
      };

    case "SQUADRA_SORPRESA":
      return {
        nome: "Squadra sorpresa",
        icona: "💎",
        descrizione: "Squadra che ha sorpreso maggiormente",
      };

    case "MIGLIOR_ASSISTMAN":
      return {
        nome: "Miglior assistman",
        icona: "🎯",
        descrizione: "Miglior assistman del torneo",
      };

    case "MIGLIOR_PORTIERE":
      return {
        nome: "Miglior portiere",
        icona: "🧤",
        descrizione: "Miglior portiere del torneo",
      };

    case "MVP":
      return {
        nome: "MVP",
        icona: "⭐",
        descrizione: "Miglior giocatore del torneo",
      };

    case "MIGLIOR_MOMENTO":
      return {
        nome: "Miglior momento",
        icona: "🔥",
        descrizione: "Momento più memorabile del torneo",
      };

    default:
      return {
        nome: "Trofeo",
        icona: "🏅",
        descrizione: "Premio del torneo",
      };
  }
}

async function caricaTorneo(torneoId: number) {
  return prisma.torneo.findUnique({
    where: {
      id: torneoId,
    },

    include: {
      gioco: true,

      foto: {
        orderBy: {
          creatoIl: "desc",
        },
      },

      gironi: {
        orderBy: {
          nome: "asc",
        },

        include: {
          partecipazioni: {
            include: {
              squadra: true,
              partecipante: true,
            },
          },

          partite: {
            orderBy: [
              {
                giornata: "asc",
              },
              {
                dataPartita: "asc",
              },
              {
                OraPartita: "asc",
              },
            ],

            include: {
              squadraCasa: true,
              squadraOspite: true,
            },
          },
        },
      },

      partecipazioni: {
        include: {
          squadra: true,
          partecipante: true,
        },
      },

      trofei: {
        orderBy: {
          tipo: "asc",
        },

        include: {
          squadraVincitrice: true,

          calciatoreVincitore: {
            include: {
              calciatore: true,
              squadra: true,
            },
          },

          calciatoriVincitori: {
            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                  squadra: true,
                },
              },
            },
          },
        },
      },

      partite: {
        orderBy: [
          {
            dataPartita: "asc",
          },
          {
            OraPartita: "asc",
          },
        ],

        include: {
          squadraCasa: true,
          squadraOspite: true,

          gol: {
            where: {
              tipo: {
                not: "AUTOGOL",
              },
            },

            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                  squadra: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

type PartitaRoad = NonNullable<Awaited<ReturnType<typeof caricaTorneo>>>["partite"][number];

// Evidenzia la qualificazione, non la vittoria della singola gara.
// Nei doppi confronti il verdetto compare soltanto dopo il ritorno.
function vincitoreSfida(gareOriginali: PartitaRoad[], richiedeRitorno: boolean): number | null {
  const gare = [...gareOriginali].sort((a, b) =>
    (a.NumeroGara ?? 0) - (b.NumeroGara ?? 0) ||
    (a.dataPartita?.getTime() ?? 0) - (b.dataPartita?.getTime() ?? 0) ||
    a.id.toString().localeCompare(b.id.toString())
  );
  if (richiedeRitorno && gare.length < 2) return null;
  if (!gare.length || gare.some((g) => !g.Completata || g.GolCasa == null || g.GolOspite == null)) return null;
  const prima = gare[0];
  const casaId = prima.squadraCasa?.id;
  const ospiteId = prima.squadraOspite?.id;
  if (casaId == null || ospiteId == null || casaId === ospiteId) return null;
  let golCasa = 0;
  let golOspite = 0;
  for (const gara of gare) {
    if (gara.squadraCasa?.id === casaId && gara.squadraOspite?.id === ospiteId) {
      golCasa += gara.GolCasa ?? 0;
      golOspite += gara.GolOspite ?? 0;
    } else if (gara.squadraCasa?.id === ospiteId && gara.squadraOspite?.id === casaId) {
      golCasa += gara.GolOspite ?? 0;
      golOspite += gara.GolCasa ?? 0;
    } else return null;
  }
  if (golCasa !== golOspite) return golCasa > golOspite ? casaId : ospiteId;
  // In caso di parità aggregata valgono i rigori registrati, non i gol in trasferta.
  const garaRigori = [...gare].reverse().find((g) => g.AiRigori && g.RigoriCasa != null && g.RigoriOspite != null && g.RigoriCasa !== g.RigoriOspite);
  if (!garaRigori) return null;
  return (garaRigori.RigoriCasa! > garaRigori.RigoriOspite!) ? garaRigori.squadraCasa?.id ?? null : garaRigori.squadraOspite?.id ?? null;
}

// Ordine cronologico stabile: data, ora e ID come ultimo criterio.
function timestampPartita(partita: PartitaRoad): number {
  if (!partita.dataPartita) return Number.MAX_SAFE_INTEGER;
  return new Date(partita.dataPartita).getTime();
}
function oraPartitaTesto(partita: PartitaRoad): string {
  if (!partita.OraPartita) return "";
  const data = new Date(partita.OraPartita);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
function confrontaPartiteCronologiche(a: PartitaRoad, b: PartitaRoad): number {
  return timestampPartita(a) - timestampPartita(b) ||
    oraPartitaTesto(a).localeCompare(oraPartitaTesto(b)) ||
    (a.NumeroGara ?? 0) - (b.NumeroGara ?? 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function dataOraPartita(partita: PartitaRoad): string {
  const giorno = partita.dataPartita ? new Date(partita.dataPartita).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "Data da definire";
  const ora = oraPartitaTesto(partita);
  return `${giorno}${ora ? ` · ore ${ora}` : ""}`;
}

// In una sfida terminata in parità, il passaggio effettivo al turno seguente
// è prova del qualificato. Se il dato non esiste, non inventiamo il verdetto.
function qualificataSfida(
  gare: PartitaRoad[],
  richiedeRitorno: boolean,
  partiteTurnoSuccessivo: PartitaRoad[],
  campioneId: number | null = null
): number | null {
  const qualificataDaRisultato = vincitoreSfida(gare, richiedeRitorno);
  if (qualificataDaRisultato != null) return qualificataDaRisultato;
  if (!gare.length || (richiedeRitorno && gare.length < 2) ||
      gare.some(g => !g.Completata || g.GolCasa == null || g.GolOspite == null)) return null;
  const squadre = [gare[0].squadraCasa?.id, gare[0].squadraOspite?.id].filter((id): id is number => id != null);
  if (squadre.length !== 2) return null;
  const presenti = squadre.filter(id => partiteTurnoSuccessivo.some(p => p.squadraCasa?.id === id || p.squadraOspite?.id === id));
  if (presenti.length === 1) return presenti[0];
  if (campioneId != null && squadre.includes(campioneId)) return campioneId;
  return null;
}

function RoadMatch({ partita, torneoId, compact = false, qualificataId = null }: { partita: PartitaRoad; torneoId: number; compact?: boolean; qualificataId?: number | null }) {
  const casaVince = partita.Completata && qualificataId === partita.squadraCasa?.id;
  const ospiteVince = partita.Completata && qualificataId === partita.squadraOspite?.id;
  return (
    <Link href={`/tornei/${torneoId}/partite/${partita.id.toString()}`} className={`group relative block w-full overflow-hidden rounded-xl border border-white/15 bg-[#101c31]/95 transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_0_30px_rgba(245,189,75,0.17)] ${compact ? "px-2 py-2" : "px-3 py-3"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/35 to-transparent" />
      <div className="mb-2 flex justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-500"><span>{partita.NumeroGara > 1 ? `Gara ${partita.NumeroGara}` : "Match"}</span><span className={partita.Completata ? "text-emerald-400" : "text-amber-300"}>{partita.Completata ? "FT" : "VS"}</span></div>
      {[
        { squadra: partita.squadraCasa, gol: partita.GolCasa, vince: casaVince },
        { squadra: partita.squadraOspite, gol: partita.GolOspite, vince: ospiteVince },
      ].map((riga, i) => (
        <div key={i} className={`flex items-center gap-2 rounded-md px-1 py-1.5 ${riga.vince ? "bg-amber-300/10" : ""} ${partita.Completata && !riga.vince && (casaVince || ospiteVince) ? "opacity-45" : ""}`}>
          {riga.squadra?.stemma ? <img src={riga.squadra.stemma} alt="" className="h-7 w-7 shrink-0 object-contain drop-shadow-md" /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center">⚽</span>}
          <span className={`min-w-0 flex-1 truncate text-[11px] font-bold ${riga.vince ? "text-amber-200" : "text-slate-100"}`}>{riga.squadra?.nome ?? "Da definire"}</span>
          <span className={`text-sm font-black tabular-nums ${riga.vince ? "text-amber-200" : "text-slate-300"}`}>{partita.Completata ? (riga.gol ?? "–") : "–"}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-white/10 pt-2 text-center text-[10px] font-semibold tracking-wide text-sky-200">{dataOraPartita(partita)}</div>
      {partita.AiRigori && <div className="mt-1 border-t border-white/10 pt-1 text-center text-[9px] text-amber-200">Rigori {partita.RigoriCasa ?? "–"}–{partita.RigoriOspite ?? "–"}</div>}
    </Link>
  );
}


// Un accoppiamento raccoglie le gare tra le stesse due squadre nella stessa fase.
// Non deduciamo mai il passaggio del turno dalla sola posizione nell'elenco.
type SfidaTabellone = { chiave: string; partite: PartitaRoad[]; squadre: NonNullable<PartitaRoad["squadraCasa"]>[] };

function creaSfideTabellone(partite: PartitaRoad[]): SfidaTabellone[] {
  const sfide = new Map<string, SfidaTabellone>();
  for (const partita of partite) {
    const casa = partita.squadraCasa;
    const ospite = partita.squadraOspite;
    // Partite senza entrambe le squadre non vengono unite erroneamente.
    const chiave = casa && ospite
      ? [casa.id, ospite.id].sort((a, b) => a - b).join(":")
      : `partita:${partita.id.toString()}`;
    let sfida = sfide.get(chiave);
    if (!sfida) {
      sfida = { chiave, partite: [], squadre: [casa, ospite].filter((x): x is NonNullable<typeof x> => x != null) };
      sfide.set(chiave, sfida);
    }
    sfida.partite.push(partita);
  }
  return [...sfide.values()];
}

function SfidaCard({ sfida, torneoId, finale = false, qualificataId }: { sfida: SfidaTabellone; torneoId: number; finale?: boolean; qualificataId: number | null }) {
  const gare = [...sfida.partite].sort((a, b) =>
    (a.NumeroGara ?? 0) - (b.NumeroGara ?? 0) ||
    (a.dataPartita?.getTime() ?? 0) - (b.dataPartita?.getTime() ?? 0) ||
    a.id.toString().localeCompare(b.id.toString())
  );
  const completa = gare.every((gara) => gara.Completata && gara.GolCasa != null && gara.GolOspite != null);
  const totali = sfida.squadre.map((squadra) => ({
    squadra,
    gol: gare.reduce((somma, gara) => somma + (gara.squadraCasa?.id === squadra.id ? (gara.GolCasa ?? 0) : gara.squadraOspite?.id === squadra.id ? (gara.GolOspite ?? 0) : 0), 0),
  }));
  const vincitore = qualificataId;
  return (
    <div className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-[#08192e]/95 p-3 shadow-[0_12px_35px_rgba(0,0,0,.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(56,189,248,.18)] ${finale ? "border-amber-300/70 shadow-[0_0_35px_rgba(251,191,36,.14)]" : "border-cyan-300/30 hover:border-cyan-300/70"}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
      <div className="mb-2 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-widest text-cyan-200/80">
        <span>{gare.length > 1 ? `${gare.length} gare` : "Gara unica"}</span>
        <span>{completa ? "Conclusa" : "Da giocare"}</span>
      </div>
      {totali.map(({ squadra, gol }) => (
        <div key={squadra.id} className={`flex min-w-0 items-center gap-2 rounded-lg px-1 py-1.5 ${vincitore === squadra.id ? "bg-emerald-400/10 text-emerald-200" : "text-slate-100"}`}>
          {squadra.stemma ? <img src={squadra.stemma} alt="" className="h-7 w-7 shrink-0 object-contain" /> : <span className="flex h-7 w-7 items-center justify-center">⚽</span>}
          <span className="min-w-0 flex-1 truncate text-xs font-bold">{squadra.nome}</span>
          <span className="text-sm font-black tabular-nums">{completa ? gol : "–"}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-white/10 pt-2">
        {gare.map((gara, index) => (
          <Link key={gara.id.toString()} href={`/tornei/${torneoId}/partite/${gara.id.toString()}`} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
            <span>{gare.length > 1 ? (gara.NumeroGara === 2 ? "Ritorno" : gara.NumeroGara === 1 ? "Andata" : `Gara ${index + 1}`) : "Dettaglio partita"} · {dataOraPartita(gara)}</span>
            <span className="font-bold tabular-nums">{gara.Completata ? `${gara.GolCasa ?? "–"}–${gara.GolOspite ?? "–"}` : "VS"} ↗</span>
          </Link>
        ))}
        {gare.some((gara) => gara.AiRigori) && <p className="mt-1 text-center text-[10px] text-amber-300">Rigori: {gare.filter((gara) => gara.AiRigori).map((gara) => `${gara.RigoriCasa ?? "–"}–${gara.RigoriOspite ?? "–"}`).join(" · ")}</p>}
      </div>
    </div>
  );
}

function TurnoTabellone({ titolo, sfide, torneoId, qualificata, reverse = false }: { titolo: string; sfide: SfidaTabellone[]; torneoId: number; qualificata: (sfida: SfidaTabellone) => number | null; reverse?: boolean }) {
  if (sfide.length === 0) return null;
  return (
    <div className="relative space-y-3">
      <div className="flex items-center justify-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-300/35" />
        <h4 className="text-center text-[11px] font-black uppercase tracking-[.2em] text-cyan-100">{titolo}</h4>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-300/35" />
      </div>
      <div className={`grid gap-3 ${sfide.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : sfide.length === 3 ? "grid-cols-2 lg:grid-cols-3" : sfide.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-sm mx-auto"}`}>
        {sfide.map((sfida) => <SfidaCard key={sfida.chiave} sfida={sfida} torneoId={torneoId} qualificataId={qualificata(sfida)} />)}
      </div>
      <div className="flex justify-center" aria-hidden="true"><span className="h-5 w-px bg-gradient-to-b from-cyan-300/70 to-amber-300/70" /></div>
    </div>
  );
}

export default async function TorneoPage({ params }: Props) {
  const { id } = await params;
  const torneoId = Number(id);

  if (!Number.isInteger(torneoId)) {
    notFound();
  }

  let torneo = await caricaTorneo(torneoId);

  if (!torneo) {
    notFound();
  }

  // =========================================================
  // AGGIORNAMENTO AUTOMATICO TROFEI
  // =========================================================

  const torneoConcluso =
    torneo.partite.length > 0 &&
    torneo.partite.every(
      (partita) => partita.Completata === true
    );

  // I trofei vengono soltanto letti dalla pagina.
// Nessuna scrittura nel database durante la visita.

  // =========================================================
  // CONTROLLO ADMIN E GALLERIA
  // =========================================================

  const admin = await isAdmin();

  const fotoGalleria = torneo.foto.map((foto) => ({
    id: foto.id,
    url: supabaseAdmin.storage
      .from("torneo-foto")
      .getPublicUrl(foto.percorso).data.publicUrl,
    didascalia: foto.didascalia,
    creatoIl: foto.creatoIl.toISOString(),
  }));

  // =========================================================
  // PARTITE
  // =========================================================

  const partiteCompletate = torneo.partite.filter(
    (partita) => partita.Completata === true
  );

  const percentuale =
    torneo.partite.length > 0
      ? Math.round(
          (partiteCompletate.length / torneo.partite.length) * 100
        )
      : 0;

  // =========================================================
  // CLASSIFICA MARCATORI
  // =========================================================

  const tuttiIGol = torneo.partite.flatMap(
    (partita) => partita.gol
  );

  const classificaMarcatori =
    calcolaClassificaMarcatori(tuttiIGol);

  // =========================================================
  // STATISTICHE TORNEO
  // =========================================================

  const partiteConRisultato = torneo.partite.filter(
    (partita) =>
      partita.Completata === true &&
      partita.GolCasa !== null &&
      partita.GolOspite !== null &&
      partita.SquadraCasaId !== null &&
      partita.SquadraOspiteId !== null
  );

  let golTotali = 0;
  let vittorie = 0;
  let pareggi = 0;

  let partitaConPiuGol: (typeof torneo.partite)[number] | null =
    null;

  let partitaConMaggiorScarto:
    | (typeof torneo.partite)[number]
    | null = null;

  for (const partita of partiteConRisultato) {
    const golCasa = partita.GolCasa ?? 0;
    const golOspite = partita.GolOspite ?? 0;
    const golPartita = golCasa + golOspite;
    const scarto = Math.abs(golCasa - golOspite);

    golTotali += golPartita;

    if (golCasa === golOspite) {
      pareggi += 1;
    } else {
      vittorie += 1;
    }

    if (
      !partitaConPiuGol ||
      golPartita >
        (partitaConPiuGol.GolCasa ?? 0) +
          (partitaConPiuGol.GolOspite ?? 0)
    ) {
      partitaConPiuGol = partita;
    }

    if (
      scarto > 0 &&
      (!partitaConMaggiorScarto ||
        scarto >
          Math.abs(
            (partitaConMaggiorScarto.GolCasa ?? 0) -
              (partitaConMaggiorScarto.GolOspite ?? 0)
          ))
    ) {
      partitaConMaggiorScarto = partita;
    }
  }

  const mediaGol =
    partiteConRisultato.length > 0
      ? (golTotali / partiteConRisultato.length).toFixed(2)
      : "0.00";

  // =========================================================
  // STATISTICHE SQUADRE
  // =========================================================

  const statisticheSquadre = new Map<
    number,
    {
      nome: string;
      gf: number;
      gs: number;
      vittorie: number;
      pareggi: number;
      sconfitte: number;
      partite: number;
      punti: number;
    }
  >();

  for (const partecipazione of torneo.partecipazioni) {
    statisticheSquadre.set(partecipazione.squadraId, {
      nome: partecipazione.squadra.nome,
      gf: 0,
      gs: 0,
      vittorie: 0,
      pareggi: 0,
      sconfitte: 0,
      partite: 0,
      punti: 0,
    });
  }

  for (const partita of partiteConRisultato) {
    if (
      partita.SquadraCasaId === null ||
      partita.SquadraOspiteId === null
    ) {
      continue;
    }

    const casa = statisticheSquadre.get(
      partita.SquadraCasaId
    );

    const ospite = statisticheSquadre.get(
      partita.SquadraOspiteId
    );

    if (!casa || !ospite) {
      continue;
    }

    casa.partite += 1;
    ospite.partite += 1;

    casa.gf += partita.GolCasa ?? 0;
    casa.gs += partita.GolOspite ?? 0;

    ospite.gf += partita.GolOspite ?? 0;
    ospite.gs += partita.GolCasa ?? 0;

    if ((partita.GolCasa ?? 0) > (partita.GolOspite ?? 0)) {
      casa.vittorie += 1;
      casa.punti += 3;
      ospite.sconfitte += 1;
    } else if (
      (partita.GolCasa ?? 0) < (partita.GolOspite ?? 0)
    ) {
      ospite.vittorie += 1;
      ospite.punti += 3;
      casa.sconfitte += 1;
    } else {
      casa.pareggi += 1;
      ospite.pareggi += 1;
      casa.punti += 1;
      ospite.punti += 1;
    }
  }

  const statisticheSquadreArray = Array.from(
    statisticheSquadre.values()
  );

  const migliorAttacco =
    statisticheSquadreArray.length > 0
      ? statisticheSquadreArray.reduce((migliore, squadra) =>
          squadra.gf > migliore.gf ? squadra : migliore
        )
      : null;

  const migliorDifesa =
    statisticheSquadreArray.length > 0
      ? statisticheSquadreArray.reduce((migliore, squadra) =>
          squadra.gs < migliore.gs ? squadra : migliore
        )
      : null;

  const squadraConPiuVittorie =
    statisticheSquadreArray.length > 0
      ? statisticheSquadreArray.reduce((migliore, squadra) =>
          squadra.vittorie > migliore.vittorie
            ? squadra
            : migliore
        )
      : null;

  const squadraConPiuPunti =
    statisticheSquadreArray.length > 0
      ? statisticheSquadreArray.reduce((migliore, squadra) =>
          squadra.punti > migliore.punti ? squadra : migliore
        )
      : null;

  const squadraConPiuGolSubiti =
    statisticheSquadreArray.length > 0
      ? statisticheSquadreArray.reduce((peggiore, squadra) =>
          squadra.gs > peggiore.gs ? squadra : peggiore
        )
      : null;

  // =========================================================
  // FASI ELIMINAZIONE
  // =========================================================

  const partiteEliminazione = torneo.partite.filter((partita) => {
    const fase = normalizzaFase(partita.Fase);
    return fase !== "Fase a gironi";
  });

  const fasiEliminazione = [
    "Sedicesimi di finale",
    "Ottavi di finale",
    "Quarti di finale",
    "Semifinali",
    "Finale 3° posto",
    "Finale",
  ];

  const partitePerFase = new Map<string, typeof torneo.partite>();

  for (const partita of partiteEliminazione) {
    const fase = normalizzaFase(partita.Fase);

    if (!partitePerFase.has(fase)) {
      partitePerFase.set(fase, []);
    }

    partitePerFase.get(fase)!.push(partita);
  }

  // Ordine delle partite nelle sezioni per fase: data e ora crescenti.
  for (const lista of partitePerFase.values()) lista.sort(confrontaPartiteCronologiche);

  // La qualificazione in caso di pareggio si desume dai partecipanti al turno successivo.
  // Per la finale, in caso di parità, è valido anche il trofeo vincitore assegnato.
  const faseSuccessiva: Record<string, string> = {
    "Sedicesimi di finale": "Ottavi di finale",
    "Ottavi di finale": "Quarti di finale",
    "Quarti di finale": "Semifinali",
    "Semifinali": "Finale",
  };
  // Riferimento non nullo catturato per la funzione interna.
  const torneoVerificato = torneo;
  function qualificataPerFase(fase: string, gare: PartitaRoad[]): number | null {
    const richiedeRitorno = torneoVerificato.andataRitorno && fase !== "Finale" && fase !== "Finale 3° posto";
    const prossimoTurno = partitePerFase.get(faseSuccessiva[fase] ?? "") ?? [];
    const campione = fase === "Finale" ? (torneoVerificato.trofei.find(t => t.tipo === "VINCITORE_TORNEO")?.squadraVincitrice?.id ?? null) : null;
    return qualificataSfida(gare, richiedeRitorno, prossimoTurno, campione);
  }

  // =========================================================
  // TROFEI
  // =========================================================

  const trofeoVincitore = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "VINCITORE_TORNEO"
  );

  const trofeoMarcatore = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "MIGLIOR_MARCATORE"
  );

  const trofeoSquadraSorpresa = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "SQUADRA_SORPRESA"
  );

  const trofeoAssistman = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "MIGLIOR_ASSISTMAN"
  );

  const trofeoPortiere = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "MIGLIOR_PORTIERE"
  );

  const trofeoMvp = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "MVP"
  );

  const trofeoMomento = torneo.trofei.find(
    (trofeo) => trofeo.tipo === "MIGLIOR_MOMENTO"
  );

  const trofeiPrincipali = [
    {
      tipo: "VINCITORE_TORNEO",
      trofeo: trofeoVincitore,
    },
    {
      tipo: "MIGLIOR_MARCATORE",
      trofeo: trofeoMarcatore,
    },
    {
      tipo: "SQUADRA_SORPRESA",
      trofeo: trofeoSquadraSorpresa,
    },
  ];

  const trofeiManuali = [
    {
      tipo: "MIGLIOR_ASSISTMAN",
      trofeo: trofeoAssistman,
    },
    {
      tipo: "MIGLIOR_PORTIERE",
      trofeo: trofeoPortiere,
    },
    {
      tipo: "MVP",
      trofeo: trofeoMvp,
    },
    {
      tipo: "MIGLIOR_MOMENTO",
      trofeo: trofeoMomento,
    },
  ];

  // Identità visiva: la scelta della palette non modifica i dati del torneo.
  const identita = `${torneo.nome} ${torneo.tipo}`.toLowerCase();
  const temaCompetizione = /africa/.test(identita)
    ? "africa"
    : /asia/.test(identita)
      ? "asia"
      : /club|champions|libertadores/.test(identita)
        ? "club"
        : /europ|uefa/.test(identita)
          ? "europa"
          : /am[eé]rica|america|copa/.test(identita)
            ? "america"
            : "mondiale";

  // Immagini già utilizzate dalla Home: nessuna modifica allo schema o ai dati.
  const coppaCompetizione = temaCompetizione === "africa"
    ? "/trofei/coppa-africa.png"
    : temaCompetizione === "asia"
      ? "/trofei/coppa-asia.png"
      : temaCompetizione === "europa"
        ? "/trofei/europeo.png"
        : temaCompetizione === "america"
          ? "/trofei/copa-america.png"
          : temaCompetizione === "club"
            ? "/trofei/mondiale-club.png"
            : "/trofei/mondiale-nazioni.png";

  return (
    <main className={`pt-tournament pt-theme-${temaCompetizione} min-h-screen overflow-hidden text-white`}>
      <style>{` 
        .pt-tournament {
          --pt-accent: #e7c681;
          --pt-accent-rgb: 231,198,129;
          --pt-secondary: #658cdb;
          --pt-ink: #080f20;
          color: #f6f0e6;
          background: radial-gradient(ellipse at 50% 0%, rgba(var(--pt-accent-rgb),.08), transparent 32%), #080f20;
          isolation: isolate;
        }
        .pt-theme-europa { --pt-accent:#8fc7ff; --pt-accent-rgb:143,199,255; --pt-secondary:#365ac9; }
        .pt-theme-america { --pt-accent:#e6bd79; --pt-accent-rgb:230,189,121; --pt-secondary:#3a9caa; }
        .pt-theme-africa { --pt-accent:#e8b778; --pt-accent-rgb:232,183,120; --pt-secondary:#aa6648; }
        .pt-theme-asia { --pt-accent:#f2b1a1; --pt-accent-rgb:242,177,161; --pt-secondary:#b4486c; }
        .pt-theme-club { --pt-accent:#d9c6ff; --pt-accent-rgb:217,198,255; --pt-secondary:#7765c4; }
        .pt-tournament .pt-tournament-hero {
          position:relative; isolation:isolate; min-height:580px;
          background: radial-gradient(ellipse at 50% 32%, rgba(var(--pt-accent-rgb),.18), transparent 35%),
            radial-gradient(ellipse at 12% 14%, rgba(87,125,194,.22), transparent 42%),
            radial-gradient(ellipse at 90% 15%, rgba(var(--pt-accent-rgb),.12), transparent 38%),
            linear-gradient(160deg,#192c4c 0%,#0c1830 49%,#070d1b 100%);
        }
        .pt-tournament .pt-tournament-hero::before {
          content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
          background:repeating-linear-gradient(90deg, transparent 0 15.8%, rgba(255,255,255,.025) 15.85% 15.9%, transparent 16% 32%),
            radial-gradient(ellipse at 50% 115%, rgba(6,16,33,0) 15%, rgba(5,10,22,.8) 78%);
        }
        .pt-tournament .pt-tournament-hero::after {
          content:""; position:absolute; inset:auto 0 0; height:180px; pointer-events:none;
          background:linear-gradient(transparent,#080f20);
        }
        .pt-spotlight { position:absolute; width:42vw; max-width:700px; height:660px; top:-210px;
          opacity:.35; filter:blur(23px); pointer-events:none; transform-origin:top center;
          background:conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(var(--pt-accent-rgb),.33) 12deg, transparent 26deg);
          animation:ptSweep 10s ease-in-out infinite alternate; }
        .pt-spotlight-left {left:-6%; transform:rotate(20deg)}
        .pt-spotlight-right {right:-6%; animation-delay:-5s; transform:rotate(-20deg)}
        .pt-stadium-orbit { position:absolute; top:48%; left:50%; width:560px; height:560px; border-radius:50%;
          border:1px solid rgba(var(--pt-accent-rgb),.16); transform:translate(-50%,-50%);
          box-shadow:0 0 0 48px rgba(var(--pt-accent-rgb),.025),0 0 0 105px rgba(var(--pt-accent-rgb),.015),inset 0 0 75px rgba(var(--pt-accent-rgb),.055);
          pointer-events:none; }
        .pt-tournament .pt-hero-label {color:var(--pt-accent); letter-spacing:.32em; font-size:11px; font-weight:900; text-transform:uppercase;}
        .pt-tournament .pt-hero-title {max-width:900px; font-size:clamp(3rem,7.6vw,7rem); line-height:.98;
          letter-spacing:-.065em; text-transform:uppercase; font-weight:950; text-shadow:0 14px 65px rgba(0,0,0,.6);
          animation:ptRise .9s cubic-bezier(.2,.8,.2,1) both; }
        .pt-tournament .pt-hero-trophy { display:grid; place-items:center; width:132px; height:132px; margin:0 auto 30px;
          border-radius:50%; border:1px solid rgba(var(--pt-accent-rgb),.38);
          background:radial-gradient(circle at 50% 35%,rgba(var(--pt-accent-rgb),.22),rgba(9,18,35,.5) 70%);
          box-shadow:0 0 80px rgba(var(--pt-accent-rgb),.13),inset 0 0 40px rgba(var(--pt-accent-rgb),.1);
          font-size:70px; animation:ptFloat 5s ease-in-out infinite; }
        .pt-tournament .pt-hero-back {color:var(--pt-accent); border:1px solid rgba(var(--pt-accent-rgb),.28);
          border-radius:999px; padding:10px 19px; background:rgba(8,16,32,.45); backdrop-filter:blur(12px);}
        .pt-tournament .pt-hero-back:hover {background:rgba(var(--pt-accent-rgb),.13);}
        .pt-tournament .pt-progress-panel {border:1px solid rgba(var(--pt-accent-rgb),.4);
          background:linear-gradient(140deg,rgba(31,49,76,.88),rgba(9,18,36,.92));
          box-shadow:0 22px 65px rgba(0,0,0,.32),0 0 45px rgba(var(--pt-accent-rgb),.06); backdrop-filter:blur(22px);}
        .pt-tournament .pt-progress-fill {background:linear-gradient(90deg,var(--pt-secondary),var(--pt-accent));
          box-shadow:0 0 25px rgba(var(--pt-accent-rgb),.35);}
        .pt-tournament .pt-accent-text {color:var(--pt-accent)!important;}
        .pt-tournament .pt-accent-border {border-color:rgba(var(--pt-accent-rgb),.38)!important;}
        .pt-tournament .pt-section-title {font-size:clamp(1.7rem,3vw,2.6rem);letter-spacing:-.045em;line-height:1.1;}
        .pt-tournament .pt-section-eyebrow {color:var(--pt-accent)!important;font-size:10px;letter-spacing:.24em;text-transform:uppercase;}
        .pt-tournament .pt-surface {background:linear-gradient(145deg,rgba(29,46,73,.88),rgba(11,21,40,.96))!important;
          border-color:rgba(var(--pt-accent-rgb),.19)!important; box-shadow:0 18px 45px rgba(0,0,0,.19),inset 0 1px rgba(255,255,255,.045);}
        .pt-tournament .pt-match-card {position:relative; overflow:hidden; border:1px solid rgba(var(--pt-accent-rgb),.19)!important;
          background:linear-gradient(135deg,rgba(26,43,71,.94),rgba(8,16,31,.96))!important;
          box-shadow:0 12px 32px rgba(0,0,0,.2); transition:transform .4s cubic-bezier(.2,.75,.2,1),border-color .3s,box-shadow .3s;}
        .pt-tournament .pt-match-card::before {content:"";position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(115deg,transparent 30%,rgba(var(--pt-accent-rgb),.08) 48%,transparent 60%);
          transform:translateX(-125%);transition:transform .8s;}
        .pt-tournament .pt-match-card:hover {transform:translateY(-7px);border-color:rgba(var(--pt-accent-rgb),.65)!important;
          box-shadow:0 23px 55px rgba(0,0,0,.33),0 0 26px rgba(var(--pt-accent-rgb),.1);}
        .pt-tournament .pt-match-card:hover::before {transform:translateX(125%);}
        .pt-tournament .pt-stat-card {position:relative;overflow:hidden; border:1px solid rgba(var(--pt-accent-rgb),.2)!important;
          background:radial-gradient(circle at 100% 0%,rgba(var(--pt-accent-rgb),.13),transparent 58%),
          linear-gradient(145deg,#1b2b48,#0d192e)!important;
          box-shadow:0 18px 40px rgba(0,0,0,.2);transition:transform .35s,box-shadow .35s;}
        .pt-tournament .pt-stat-card:hover {transform:translateY(-6px);box-shadow:0 26px 55px rgba(0,0,0,.33);}
        .pt-tournament .pt-award-card {position:relative;overflow:hidden; border-color:rgba(var(--pt-accent-rgb),.34)!important;
          background:radial-gradient(ellipse at 50% -10%,rgba(var(--pt-accent-rgb),.2),transparent 65%),
          linear-gradient(150deg,#26324b,#111a2d 65%,#0b1222)!important;
          box-shadow:inset 0 1px rgba(255,255,255,.09),0 20px 55px rgba(0,0,0,.27);}
        .pt-tournament .pt-award-card:hover {box-shadow:0 30px 65px rgba(0,0,0,.38),0 0 35px rgba(var(--pt-accent-rgb),.13);}
        .pt-tournament table {border-collapse:separate;border-spacing:0;}
        .pt-tournament thead {background:rgba(5,12,26,.72)!important;}
        .pt-tournament thead th {color:rgba(var(--pt-accent-rgb),.8);font-size:10px;letter-spacing:.1em;}
        .pt-tournament tbody tr {transition:background .25s;}
        .pt-tournament tbody tr:hover {background:rgba(var(--pt-accent-rgb),.075)!important;}
        .pt-tournament .pt-chapter {position:relative;scroll-margin-top:80px;}
        .pt-tournament .pt-chapter::before {content:"";position:absolute;top:-20px;left:0;width:100px;height:1px;
          background:linear-gradient(90deg,var(--pt-accent),transparent);}
        .pt-tournament .pt-section-nav {position:relative;z-index:5;display:flex;gap:10px;flex-wrap:wrap;margin:0 0 54px;
          padding:13px;border:1px solid rgba(var(--pt-accent-rgb),.2);border-radius:22px;
          background:rgba(15,28,49,.82);backdrop-filter:blur(18px);box-shadow:0 12px 38px rgba(0,0,0,.18);}
        .pt-tournament .pt-section-nav a {padding:11px 17px;border:1px solid rgba(var(--pt-accent-rgb),.15);
          border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;
          color:#e8e4df;transition:background .25s,transform .25s;}
        .pt-tournament .pt-section-nav a:hover {background:rgba(var(--pt-accent-rgb),.14);transform:translateY(-2px);}
        @keyframes ptRise {from{opacity:0;transform:translateY(30px);filter:blur(8px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
        @keyframes ptFloat {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes ptSweep {from{rotate:-12deg}to{rotate:12deg}}
        @media(max-width:640px){.pt-tournament .pt-tournament-hero{min-height:520px}.pt-stadium-orbit{width:320px;height:320px}.pt-spotlight{opacity:.17}}
        @media(prefers-reduced-motion:reduce){.pt-tournament *, .pt-tournament *::before,.pt-tournament *::after{animation:none!important;transition:none!important}}

        /* EXPERIENCE 3.0: scenografia CSS, indipendente dal database. */
        .pt-tournament .pt-tournament-hero{min-height:780px;background:radial-gradient(ellipse at 50% 82%,rgba(24,95,85,.38),transparent 39%),linear-gradient(180deg,#050a15 0%,#101d37 50%,#070d19 100%)}
        .pt-arena{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
        .pt-arena::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 16%,rgba(231,241,255,.13),transparent 38%),repeating-linear-gradient(90deg,transparent 0 8%,rgba(255,255,255,.018) 8.1% 8.3%,transparent 8.4% 16%);mask-image:linear-gradient(#000,transparent 80%)}
        .pt-arena-stands{position:absolute;left:-15%;width:130%;bottom:13%;height:46%;border-radius:50% 50% 0 0/75% 75% 0 0;border-top:14px solid rgba(205,225,255,.15);box-shadow:0 -20px 55px rgba(100,148,214,.08),inset 0 45px 90px #050914;background:repeating-linear-gradient(0deg,rgba(220,232,255,.07) 0 2px,transparent 3px 17px),linear-gradient(180deg,#0a162a,#040813);transform:perspective(700px) rotateX(23deg)}
        .pt-arena-pitch{position:absolute;bottom:-33%;left:-20%;width:140%;height:55%;border-radius:50%;background:radial-gradient(ellipse at 50% 15%,rgba(50,134,107,.42),rgba(5,30,32,.8) 50%,transparent 76%);filter:blur(5px)}
        .pt-arena-light{position:absolute;top:-20%;width:28%;height:95%;filter:blur(17px);opacity:.56;transform-origin:top center;background:conic-gradient(from 165deg at 50% 0%,transparent 0deg,rgba(205,230,255,.29) 13deg,transparent 28deg);animation:pt-arena-sweep 8s ease-in-out infinite alternate}
        .pt-arena-light.a{left:4%;transform:rotate(18deg)}.pt-arena-light.b{right:4%;animation-delay:-4s;transform:rotate(-18deg)}
        .pt-arena-flood{position:absolute;top:18%;width:24%;height:7px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.96) 0 8px,transparent 9px 17px);filter:drop-shadow(0 0 12px #cceaff) drop-shadow(0 0 32px #8abfff);opacity:.65}.pt-arena-flood.left{left:-5%;transform:rotate(-15deg)}.pt-arena-flood.right{right:-5%;transform:rotate(15deg)}
        .pt-tournament .pt-tournament-hero::after{height:230px;z-index:1}
        .pt-experience-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);align-items:center;gap:2rem;min-height:560px}
        .pt-experience-copy{position:relative;z-index:4}.pt-experience-eyebrow{display:inline-flex;align-items:center;gap:12px;color:var(--pt-accent);font-size:11px;font-weight:900;letter-spacing:.3em;text-transform:uppercase}.pt-experience-eyebrow::before{content:"";width:35px;height:1px;background:var(--pt-accent)}
        .pt-tournament .pt-experience-title{font-size:clamp(3.6rem,7.7vw,8.2rem);line-height:.89;letter-spacing:-.075em;max-width:950px;text-transform:uppercase;font-weight:950;text-wrap:balance;text-shadow:0 9px 30px #000,0 0 90px rgba(var(--pt-accent-rgb),.16);animation:ptRise 1s ease-out both}
        .pt-experience-year{font-size:clamp(1.5rem,3vw,3rem);letter-spacing:.32em;color:var(--pt-accent);font-weight:800;margin-top:1.5rem}
        .pt-trophy-stage{position:relative;min-height:590px;display:flex;align-items:center;justify-content:center;isolation:isolate;perspective:1000px}
        .pt-trophy-halo{position:absolute;inset:8% 0;border-radius:50%;background:radial-gradient(ellipse,rgba(var(--pt-accent-rgb),.26),transparent 64%);filter:blur(12px);animation:pt-halo 5s ease-in-out infinite alternate}
        .pt-trophy-ring{position:absolute;top:13%;left:50%;width:min(85%,410px);aspect-ratio:1;border:1px solid rgba(var(--pt-accent-rgb),.33);border-radius:50%;transform:translateX(-50%) rotateX(68deg);box-shadow:0 0 0 35px rgba(var(--pt-accent-rgb),.035),0 0 60px rgba(var(--pt-accent-rgb),.18)}
        .pt-trophy-actual{position:relative;z-index:3;width:min(100%,440px);height:480px;object-fit:contain;filter:drop-shadow(0 0 30px rgba(var(--pt-accent-rgb),.48)) drop-shadow(0 30px 40px rgba(0,0,0,.8));animation:pt-trophy-float 6s ease-in-out infinite;transform-origin:center bottom}
        .pt-trophy-podium{position:absolute;bottom:13px;left:50%;width:78%;height:75px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at 50% 35%,rgba(var(--pt-accent-rgb),.5),rgba(10,17,32,.95) 56%,transparent 73%);box-shadow:0 0 80px rgba(var(--pt-accent-rgb),.16)}
        .pt-trophy-caption{position:absolute;bottom:0;z-index:4;color:var(--pt-accent);font-size:10px;letter-spacing:.36em;font-weight:900;text-transform:uppercase}
        .pt-tournament .pt-experience-progress{position:relative;z-index:5;max-width:1200px;margin:0 auto 30px;border:1px solid rgba(var(--pt-accent-rgb),.28);background:linear-gradient(110deg,rgba(10,18,34,.92),rgba(20,33,56,.88));backdrop-filter:blur(18px);box-shadow:0 30px 70px rgba(0,0,0,.3)}
        .pt-experience-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:25px}.pt-experience-meta span{border:1px solid rgba(var(--pt-accent-rgb),.22);background:rgba(5,11,25,.6);padding:9px 15px;border-radius:999px;color:#e9e8e6;font-size:12px;font-weight:700}
        .pt-experience-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}.pt-experience-actions a{border:1px solid rgba(var(--pt-accent-rgb),.3);background:rgba(10,17,32,.85);padding:12px 16px;border-radius:12px;font-size:12px;font-weight:800;transition:transform .3s,background .3s,border-color .3s}.pt-experience-actions a:hover{transform:translateY(-4px);border-color:var(--pt-accent);background:rgba(var(--pt-accent-rgb),.15)}
        .pt-tournament .pt-stat-card,.pt-tournament .pt-match-card{backdrop-filter:blur(10px)}
        @keyframes pt-arena-sweep{from{rotate:-8deg;opacity:.32}to{rotate:10deg;opacity:.8}}@keyframes pt-trophy-float{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-22px) rotate(1.5deg)}}@keyframes pt-halo{from{opacity:.5;transform:scale(.92)}to{opacity:1;transform:scale(1.08)}}
        @media(max-width:900px){.pt-experience-grid{grid-template-columns:1fr;gap:0}.pt-experience-copy{text-align:center;padding-top:20px}.pt-experience-eyebrow{justify-content:center}.pt-experience-meta,.pt-experience-actions{justify-content:center}.pt-trophy-stage{min-height:380px}.pt-trophy-actual{height:340px;width:90%}.pt-tournament .pt-tournament-hero{min-height:0}.pt-experience-title{margin-inline:auto}.pt-trophy-ring{top:0}}
        @media(max-width:550px){.pt-tournament .pt-experience-title{font-size:clamp(3.1rem,13vw,5rem)}.pt-trophy-stage{min-height:340px}.pt-trophy-actual{height:300px}.pt-trophy-podium{bottom:4px}.pt-arena-stands{bottom:23%}}
        @media(prefers-reduced-motion:reduce){.pt-arena-light,.pt-trophy-actual,.pt-trophy-halo{animation:none!important}}
      `}</style>
      <ScrollRipristinoTorneo />

      {/* HERO — EXPERIENCE 3.0: coppa reale, stadio e progressi originali */}
      <div className="pt-tournament-hero relative overflow-hidden">
        <div className="pt-arena" aria-hidden="true">
          <div className="pt-arena-stands" />
          <div className="pt-arena-pitch" />
          <div className="pt-arena-light a" />
          <div className="pt-arena-light b" />
          <div className="pt-arena-flood left" />
          <div className="pt-arena-flood right" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-12 md:pt-16">
          <Link href="/tornei" className="pt-hero-back mb-5 inline-flex text-sm font-semibold transition">
            ← Torna ai tornei
          </Link>
          <div className="pt-experience-grid">
            <div className="pt-experience-copy">
              <p className="pt-experience-eyebrow mb-6">PAZZITOURNAMENT · OFFICIAL COMPETITION</p>
              <h1 className="pt-experience-title">{torneo.nome}</h1>
              <div className="pt-experience-year">{torneo.anno}</div>
              <div className="pt-experience-meta">
                <span>🌍 {torneo.tipo}</span>
                {torneo.videogioco && <span>🎮 {torneo.videogioco}</span>}
                {torneo.gioco && <span>🎮 {torneo.gioco.nome}</span>}
                <span>{torneoConcluso ? "🏆 Torneo concluso" : "⚡ Torneo in corso"}</span>
              </div>
              {admin && (
                <div className="pt-experience-actions">
                  <Link href={`/tornei/${torneo.id}/partite/nuova`}>＋ Inserisci partita</Link>
                  <Link href={`/tornei/${torneo.id}/modifica`}>✎ Modifica torneo</Link>
                  <Link href={`/tornei/${torneo.id}/squadre`}>⚙ Gestisci squadre e gironi</Link>
                  <Link href={`/tornei/${torneo.id}/trofei`}>🏆 Gestisci trofei</Link>
                </div>
              )}
            </div>
            <div className="pt-trophy-stage">
              <div className="pt-trophy-halo" aria-hidden="true" />
              <div className="pt-trophy-ring" aria-hidden="true" />
              <img src={coppaCompetizione} alt={`Trofeo ${torneo.nome}`} className="pt-trophy-actual" />
              <div className="pt-trophy-podium" aria-hidden="true" />
              <span className="pt-trophy-caption">THE ROAD TO GLORY</span>
            </div>
          </div>
          <div className="pt-experience-progress rounded-3xl p-6 md:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="pt-hero-label">IL CAMMINO VERSO LA GLORIA</p>
                <p className="mt-2 text-sm text-slate-300">{partiteCompletate.length} di {torneo.partite.length} partite completate</p>
              </div>
              <span className="pt-accent-text text-4xl font-black">{percentuale}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="pt-progress-fill h-full rounded-full transition-all duration-1000" style={{ width: `${percentuale}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <nav className="pt-section-nav" aria-label="Sezioni del torneo">
          <a href="#gironi">Gironi</a>
          <a href="#eliminazione">Partite per fase</a>
          <a href="#tabellone">Tabellone</a>
          <a href="#partite">Partite</a>
          <a href="#statistiche-premi">Statistiche e premi</a>
          <a href="#galleria">Galleria</a>
        </nav>
        {/* INFO */}
        <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pt-stat-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Squadre</p>
            <p className="pt-section-title mt-2 text-3xl font-black">{torneo.squadre}</p>
          </div>

          <div className="pt-stat-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Formula</p>
            <p className="mt-2 text-xl font-bold">{torneo.formula}</p>
          </div>

          <div className="pt-stat-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Andata / Ritorno</p>
            <p className="mt-2 text-xl font-bold">
              {torneo.andataRitorno ? "Sì" : "No"}
            </p>
          </div>

          <div className="pt-stat-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Partite completate</p>
            <p className="mt-2 text-3xl font-black text-green-400">
              {partiteCompletate.length}
            </p>
          </div>
        </section>

        {/* FASE A GIRONI */}
        <section id="gironi" className="pt-chapter mb-16">
          <div className="mb-8">
            <p className="pt-section-eyebrow text-sm font-bold uppercase tracking-widest text-green-400">
              Prima fase
            </p>
            <h2 className="pt-section-title mt-2 text-3xl font-black">📊 Fase a gironi</h2>
            <p className="mt-2 text-slate-400">
              Classifiche aggiornate automaticamente in base ai risultati
              registrati.
            </p>
          </div>

          {torneo.gironi.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <p className="text-lg font-bold">Nessun girone disponibile</p>
              <p className="mt-2 text-sm text-slate-500">
                I gironi non risultano ancora associati a questo torneo.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {torneo.gironi.map((girone) => {
                const classifica = calcolaClassifica(
                  girone.partecipazioni,
                  girone.partite
                );

                return (
                  <div
                    key={girone.id}
                    className="pt-surface overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl"
                  >
                    <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-green-950/30 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                            Classifica
                          </p>
                          <h3 className="mt-1 text-2xl font-black">
                            {girone.nome}
                          </h3>
                        </div>

                        <span className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-400">
                          {girone.partecipazioni.length} squadre
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] text-sm">
                        <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-4 text-center">#</th>
                            <th className="px-4 py-4 text-left">Squadra</th>
                            <th className="px-3 py-4 text-left">Giocatore</th>
                            <th className="px-3 py-4 text-center">PG</th>
                            <th className="px-3 py-4 text-center">V</th>
                            <th className="px-3 py-4 text-center">N</th>
                            <th className="px-3 py-4 text-center">P</th>
                            <th className="px-3 py-4 text-center">GF</th>
                            <th className="px-3 py-4 text-center">GS</th>
                            <th className="px-3 py-4 text-center">DR</th>
                            <th className="px-4 py-4 text-center">PT</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800">
                          {classifica.map((squadra, index) => (
                            <tr
                              key={squadra.squadraId}
                              className={`transition ${index < 2 ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "hover:bg-slate-800/60"}`}
                            >
                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-black ${index < 2 ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300/60" : getColorePosizione(index + 1)}`}
                                >
                                  {index + 1}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {squadra.stemma ? (
                                    <img
                                      src={squadra.stemma}
                                      alt={squadra.nome}
                                      className="h-9 w-9 object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
                                      ⚽
                                    </div>
                                  )}
                                  <span className={`font-bold ${index < 2 ? "text-emerald-300" : ""}`}>{squadra.nome}</span>
                                  
                                </div>
                              </td>

                              <td className="px-3 py-4 text-slate-400">
                                {squadra.giocatore}
                              </td>
                              <td className="px-3 py-4 text-center">{squadra.pg}</td>
                              <td className="px-3 py-4 text-center text-green-400">
                                {squadra.v}
                              </td>
                              <td className="px-3 py-4 text-center">{squadra.n}</td>
                              <td className="px-3 py-4 text-center text-red-400">
                                {squadra.p}
                              </td>
                              <td className="px-3 py-4 text-center">{squadra.gf}</td>
                              <td className="px-3 py-4 text-center">{squadra.gs}</td>
                              <td className="px-3 py-4 text-center font-semibold">
                                {squadra.dr > 0 ? `+${squadra.dr}` : squadra.dr}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-lg font-black text-yellow-400">
                                  {squadra.punti}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-slate-800 p-6">
                      <h4 className="mb-4 text-lg font-bold">⚽ Partite</h4>

                      {girone.partite.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Nessuna partita registrata.
                        </p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {girone.partite.map((partita) => (
                            <Link
                              key={partita.id.toString()}
                              href={`/tornei/${torneo.id}/partite/${partita.id.toString()}`}
                              className="pt-match-card group rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:-translate-y-1 hover:border-green-500"
                            >
                              <div className="mb-3 flex justify-between text-xs text-slate-500">
                                <span>{partita.Fase || girone.nome}</span>
                                {partita.giornata && (
                                  <span>Giornata {partita.giornata}</span>
                                )}
                              </div>

                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                <span className="text-right font-semibold">
                                  {partita.squadraCasa?.nome}
                                </span>

                                <div className="text-center">
                                  <span className="font-black text-green-400">
                                    {partita.Completata
                                      ? `${partita.GolCasa ?? 0} - ${partita.GolOspite ?? 0}`
                                      : "VS"}
                                  </span>

                                  {partita.Completata && partita.AiRigori && (
                                    <p className="mt-1 text-xs font-semibold text-yellow-400">
                                      Rigori {partita.RigoriCasa ?? 0} -{" "}
                                      {partita.RigoriOspite ?? 0}
                                    </p>
                                  )}
                                </div>

                                <span className="font-semibold">
                                  {partita.squadraOspite?.nome}
                                </span>
                              </div>

                              {/* DATA E ORA PARTITA */}
                              {(partita.dataPartita || partita.OraPartita) && (
                                <div className="mt-4 border-t border-slate-800 pt-3 text-center text-xs text-slate-500">
                                  {partita.dataPartita &&
                                    new Date(
                                      partita.dataPartita
                                    ).toLocaleDateString("it-IT")}

                                  {partita.OraPartita &&
                                    ` · ${new Date(
                                      partita.OraPartita
                                    ).toLocaleTimeString("it-IT", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  `}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CONSULTAZIONE DELLE PARTITE PER FASE */}
        <section id="eliminazione" className="pt-chapter mb-16">
          <div className="mb-7">
            <p className="pt-section-eyebrow font-black">MATCH CENTER</p>
            <h2 className="pt-section-title mt-3 font-black uppercase">Partite per fase</h2>
            <p className="mt-2 text-sm text-slate-400">Ogni incontro rimane consultabile singolarmente, anche nei turni con andata e ritorno.</p>
          </div>
          {partiteEliminazione.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-[#101b2d] p-10 text-center text-slate-400">Nessuna partita a eliminazione diretta ancora registrata.</div>
          ) : (
            <div className="space-y-5">
              {fasiEliminazione.filter((fase) => (partitePerFase.get(fase)?.length ?? 0) > 0).map((fase) => (
                <details key={fase} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0e1a2d]" open={fase === "Finale"}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-white/[.04]">
                    <span className="text-lg font-black text-white">{fase}</span>
                    <span className="flex items-center gap-3 text-xs text-slate-400">{partitePerFase.get(fase)?.length} partite <span className="text-amber-300 group-open:rotate-180">⌄</span></span>
                  </summary>
                  <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(partitePerFase.get(fase) ?? []).map((partita) => {
                      const stessaSfida = (partitePerFase.get(fase) ?? []).filter((altra) =>
                        partita.squadraCasa?.id != null && partita.squadraOspite?.id != null &&
                        [altra.squadraCasa?.id, altra.squadraOspite?.id].includes(partita.squadraCasa?.id) &&
                        [altra.squadraCasa?.id, altra.squadraOspite?.id].includes(partita.squadraOspite?.id)
                      );
                      const richiedeRitorno = torneo.andataRitorno && fase !== "Finale";
                      const garaFinale = !richiedeRitorno || (stessaSfida.length >= 2 &&
                        [...stessaSfida].sort((a, b) => (a.NumeroGara ?? 0) - (b.NumeroGara ?? 0) || (a.dataPartita?.getTime() ?? 0) - (b.dataPartita?.getTime() ?? 0) || a.id.toString().localeCompare(b.id.toString())).slice(-1)[0]?.id === partita.id);
                      const qualificataId = garaFinale ? qualificataPerFase(fase, stessaSfida.length ? stessaSfida : [partita]) : null;
                      return <RoadMatch key={partita.id.toString()} partita={partita} torneoId={torneo.id} qualificataId={qualificataId} />;
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>

        {/* TABELLONE CINEMATOGRAFICO PAZZITOURNAMENT */}
        <section id="tabellone" className="pt-chapter relative mb-20 overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(ellipse_at_50%_45%,rgba(24,88,150,.36),transparent_65%),linear-gradient(160deg,#041022,#0a1d36_48%,#030d1c)] px-3 py-10 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:px-6 lg:px-10">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(110deg,transparent 20%,rgba(125,211,252,.2) 50%,transparent 80%)" }} />
          <div className="relative z-10">
            <div className="mb-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-[.4em] text-cyan-300">PazziTournament · Road to Glory</p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">{torneo.nome}</h2>
              <p className="mt-3 text-xs font-bold uppercase tracking-[.25em] text-amber-200">Tabellone fase finale · {torneo.anno}</p>
            </div>
            {partiteEliminazione.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-400">Il tabellone apparirà quando saranno inserite le sfide a eliminazione diretta.</div>
            ) : (
              <div className="mx-auto max-w-6xl space-y-5">
                {(() => {
                  const sfide = (fase: string) => creaSfideTabellone(partitePerFase.get(fase) ?? []);
                  const qualificata = (fase: string) => (sfida: SfidaTabellone) => qualificataPerFase(fase, sfida.partite);
                  const ottavi = sfide("Ottavi di finale");
                  const sedicesimi = sfide("Sedicesimi di finale");
                  const primiTurni = ottavi.length ? ottavi : sedicesimi;
                  const quarti = sfide("Quarti di finale");
                  const semifinali = sfide("Semifinali");
                  const finali = sfide("Finale");
                  const faseDaComponenti = (id: string, titolo: string, lista: SfidaTabellone[], nomeFase: string) => ({
                    id,
                    titolo,
                    sfide: lista.map((sfida) => ({
                      id: sfida.chiave,
                      card: <SfidaCard key={sfida.chiave} sfida={sfida} torneoId={torneo.id} qualificataId={qualificataPerFase(nomeFase, sfida.partite)} />,
                    })),
                  });
                  const turni = [
                    faseDaComponenti("primo", ottavi.length ? "Ottavi di finale" : "Sedicesimi di finale", primiTurni, ottavi.length ? "Ottavi di finale" : "Sedicesimi di finale"),
                    faseDaComponenti("quarti", "Quarti di finale", quarti, "Quarti di finale"),
                    faseDaComponenti("semifinali", "Semifinali", semifinali, "Semifinali"),
                  ];
                  const finale = (
                    <div className="relative mx-auto max-w-xl rounded-[2rem] border border-amber-300/50 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,.22),transparent_70%),#101a2b] px-5 py-8 text-center shadow-[0_0_70px_rgba(245,158,11,.12)]">
                      <p className="text-xs font-black uppercase tracking-[.4em] text-amber-300">Il grande finale</p>
                      <img src={coppaCompetizione} alt={`Trofeo ${torneo.nome}`} className="mx-auto my-3 h-44 w-44 object-contain drop-shadow-[0_0_30px_rgba(251,191,36,.3)]" />
                      <h3 className="mb-5 text-3xl font-black uppercase tracking-widest text-white">Finale</h3>
                      <div className="mx-auto max-w-sm space-y-3">
                        {finali.map((sfida) => <SfidaCard key={sfida.chiave} sfida={sfida} torneoId={torneo.id} finale qualificataId={qualificataPerFase("Finale", sfida.partite)} />)}
                        {finali.length === 0 && <p className="text-sm text-slate-400">Finale ancora da definire</p>}
                      </div>
                      {trofeoVincitore?.squadraVincitrice && <div className="mt-5 border-t border-amber-300/25 pt-5"><p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">Campione del torneo</p><p className="mt-2 text-2xl font-black text-white">{trofeoVincitore.squadraVincitrice.nome}</p></div>}
                    </div>
                  );
                  const terzoPosto = (partitePerFase.get("Finale 3° posto")?.length ?? 0) > 0
                    ? <div className="mx-auto max-w-xl border-t border-white/10 pt-6"><h3 className="mb-4 text-center text-sm font-black uppercase tracking-widest text-slate-300">🥉 Finale 3° posto</h3><div className="space-y-3">{sfide("Finale 3° posto").map((sfida) => <SfidaCard key={sfida.chiave} sfida={sfida} torneoId={torneo.id} qualificataId={qualificataPerFase("Finale 3° posto", sfida.partite)} />)}</div></div>
                    : null;
                  return <RoadToFinalOrdinabile torneoId={torneo.id} admin={admin} turni={turni} finale={finale} terzoPosto={terzoPosto} />;

                })()}
                <p className="mx-auto max-w-3xl pt-4 text-center text-[11px] leading-relaxed text-slate-400">Le gare di andata e ritorno tra le stesse squadre sono riunite in un unico riquadro. La disposizione delle sfide è personalizzabile. I collegamenti tra turni non vengono dedotti automaticamente senza dati certi sugli incroci.</p>
              </div>
            )}
          </div>
        </section>

        {/* TUTTE LE PARTITE */}
        <section id="partite" className="pt-chapter mb-20">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Archivio
            </p>
            <h2 className="pt-section-title mt-2 text-3xl font-black">📅 Tutte le partite</h2>
            <p className="mt-2 text-slate-400">
              Riepilogo generale delle partite del torneo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">Totale</p>
                <p className="mt-1 text-2xl font-black">
                  {torneo.partite.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Completate</p>
                <p className="mt-1 text-2xl font-black text-green-400">
                  {partiteCompletate.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Da giocare</p>
                <p className="mt-1 text-2xl font-black text-yellow-400">
                  {torneo.partite.length - partiteCompletate.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICHE E PREMI */}
        <section id="statistiche-premi" className="pt-chapter relative mt-24 border-t border-slate-800 pt-20">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />

          <div className="mb-16 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-green-400">
              Archivio storico
            </p>
            <h2 className="pt-section-title mt-3 text-4xl font-black sm:text-5xl">
              📊 Statistiche e premi
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-slate-400">
              Tutti i numeri, i record, le classifiche e i riconoscimenti che
              raccontano la storia di questo torneo.
            </p>
          </div>

          {/* RANKING ALLENATORI: PRESENTE UNA SOLA VOLTA */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-widest text-purple-400">
                Ranking
              </p>
              <h3 className="pt-section-title mt-2 text-3xl font-black">
                🧑‍🏫 Ranking allenatori del torneo
              </h3>
              <p className="mt-2 text-slate-400">
                Classifica degli allenatori in base ai risultati ottenuti in
                questo torneo.
              </p>
            </div>

            <RankingAllenatoriTorneo torneoId={torneo.id} />
          </section>

          {/* STATISTICHE TORNEO */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-400">
                Statistiche
              </p>
              <h3 className="pt-section-title mt-2 text-3xl font-black">
                📈 Statistiche del torneo
              </h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-sm font-semibold text-slate-500">
                  ⚽ Gol totali
                </p>
                <p className="mt-3 text-4xl font-black text-green-400">
                  {golTotali}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  In {partiteConRisultato.length} partite
                </p>
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-sm font-semibold text-slate-500">
                  📊 Media gol
                </p>
                <p className="mt-3 text-4xl font-black text-blue-400">
                  {mediaGol}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Gol per partita
                </p>
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-sm font-semibold text-slate-500">
                  🏆 Vittorie
                </p>
                <p className="mt-3 text-4xl font-black text-yellow-400">
                  {vittorie}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Partite decise
                </p>
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-sm font-semibold text-slate-500">
                  🤝 Pareggi
                </p>
                <p className="mt-3 text-4xl font-black text-purple-400">
                  {pareggi}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Partite terminate in parità
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                      Partita più spettacolare
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      🔥 Più gol in una partita
                    </h3>
                  </div>
                  <div className="text-3xl">⚽</div>
                </div>

                {partitaConPiuGol ? (
                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <p className="text-right font-bold">
                        {partitaConPiuGol.squadraCasa?.nome}
                      </p>
                      <p className="text-2xl font-black text-orange-400">
                        {partitaConPiuGol.GolCasa} -{" "}
                        {partitaConPiuGol.GolOspite}
                      </p>
                      <p className="font-bold">
                        {partitaConPiuGol.squadraOspite?.nome}
                      </p>
                    </div>
                    <p className="mt-4 text-center text-sm text-slate-500">
                      {(partitaConPiuGol.GolCasa ?? 0) +
                        (partitaConPiuGol.GolOspite ?? 0)}{" "}
                      gol complessivi
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-600">
                    Nessuna partita completata.
                  </p>
                )}
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                      Record del torneo
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      💥 Maggior scarto
                    </h3>
                  </div>
                  <div className="text-3xl">🚀</div>
                </div>

                {partitaConMaggiorScarto ? (
                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <p className="text-right font-bold">
                        {partitaConMaggiorScarto.squadraCasa?.nome}
                      </p>
                      <p className="text-2xl font-black text-red-400">
                        {partitaConMaggiorScarto.GolCasa} -{" "}
                        {partitaConMaggiorScarto.GolOspite}
                      </p>
                      <p className="font-bold">
                        {partitaConMaggiorScarto.squadraOspite?.nome}
                      </p>
                    </div>
                    <p className="mt-4 text-center text-sm text-slate-500">
                      Scarto di{" "}
                      {Math.abs(
                        (partitaConMaggiorScarto.GolCasa ?? 0) -
                          (partitaConMaggiorScarto.GolOspite ?? 0)
                      )}{" "}
                      gol
                    </p>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-600">
                    Nessuna partita completata.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* STATISTICHE SQUADRE */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="pt-section-eyebrow text-sm font-bold uppercase tracking-widest text-green-400">
                Squadre
              </p>
              <h3 className="pt-section-title mt-2 text-3xl font-black">
                ⚔️ Record delle squadre
              </h3>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                  ⚔️ Miglior attacco
                </p>
                {migliorAttacco ? (
                  <div className="mt-5">
                    <p className="text-xl font-black">{migliorAttacco.nome}</p>
                    <p className="mt-1 text-sm text-slate-500">Gol segnati</p>
                    <p className="mt-3 text-4xl font-black text-green-400">
                      {migliorAttacco.gf}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    Nessun dato disponibile.
                  </p>
                )}
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  🛡️ Miglior difesa
                </p>
                {migliorDifesa ? (
                  <div className="mt-5">
                    <p className="text-xl font-black">{migliorDifesa.nome}</p>
                    <p className="mt-1 text-sm text-slate-500">Gol subiti</p>
                    <p className="mt-3 text-4xl font-black text-blue-400">
                      {migliorDifesa.gs}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    Nessun dato disponibile.
                  </p>
                )}
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                  🏆 Più vittorie
                </p>
                {squadraConPiuVittorie ? (
                  <div className="mt-5">
                    <p className="text-xl font-black">
                      {squadraConPiuVittorie.nome}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Vittorie</p>
                    <p className="mt-3 text-4xl font-black text-yellow-400">
                      {squadraConPiuVittorie.vittorie}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    Nessun dato disponibile.
                  </p>
                )}
              </div>

              <div className="pt-stat-card rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                  💣 Più gol subiti
                </p>
                {squadraConPiuGolSubiti ? (
                  <div className="mt-5">
                    <p className="text-xl font-black">
                      {squadraConPiuGolSubiti.nome}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Gol subiti</p>
                    <p className="mt-3 text-4xl font-black text-red-400">
                      {squadraConPiuGolSubiti.gs}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-600">
                    Nessun dato disponibile.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
              <div className="border-b border-slate-800 px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  Ranking
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  📊 Rendimento di tutte le squadre
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-4 text-center">#</th>
                      <th className="px-4 py-4 text-left">Squadra</th>
                      <th className="px-3 py-4 text-center">PG</th>
                      <th className="px-3 py-4 text-center">V</th>
                      <th className="px-3 py-4 text-center">N</th>
                      <th className="px-3 py-4 text-center">P</th>
                      <th className="px-3 py-4 text-center">GF</th>
                      <th className="px-3 py-4 text-center">GS</th>
                      <th className="px-3 py-4 text-center">DR</th>
                      <th className="px-4 py-4 text-center">PT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {statisticheSquadreArray
                      .slice()
                      .sort((a, b) => {
                        if (b.punti !== a.punti) {
                          return b.punti - a.punti;
                        }
                        const drA = a.gf - a.gs;
                        const drB = b.gf - b.gs;
                        if (drB !== drA) {
                          return drB - drA;
                        }
                        return a.nome.localeCompare(b.nome);
                      })
                      .map((squadra, index) => (
                        <tr
                          key={squadra.nome}
                          className={`transition ${index < 2 ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "hover:bg-slate-800/60"}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-black ${index < 2 ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300/60" : getColorePosizione(index + 1)}`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-bold">
                            {squadra.nome}
                          </td>
                          <td className="px-3 py-4 text-center">
                            {squadra.partite}
                          </td>
                          <td className="px-3 py-4 text-center text-green-400">
                            {squadra.vittorie}
                          </td>
                          <td className="px-3 py-4 text-center">
                            {squadra.pareggi}
                          </td>
                          <td className="px-3 py-4 text-center text-red-400">
                            {squadra.sconfitte}
                          </td>
                          <td className="px-3 py-4 text-center">{squadra.gf}</td>
                          <td className="px-3 py-4 text-center">{squadra.gs}</td>
                          <td className="px-3 py-4 text-center font-semibold">
                            {squadra.gf - squadra.gs > 0
                              ? `+${squadra.gf - squadra.gs}`
                              : squadra.gf - squadra.gs}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-lg font-black text-yellow-400">
                              {squadra.punti}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* CLASSIFICA MARCATORI */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="pt-section-eyebrow text-sm font-bold uppercase tracking-widest text-yellow-400">
                Statistiche individuali
              </p>
              <h3 className="pt-section-title mt-2 text-3xl font-black">
                🥅 Classifica capocannonieri
              </h3>
              <p className="mt-2 text-slate-400">
                I migliori marcatori del torneo in base ai gol registrati.
              </p>
            </div>

            {classificaMarcatori.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
                <div className="mb-3 text-4xl">⚽</div>
                <h3 className="text-xl font-bold">Nessun gol registrato</h3>
                <p className="mt-2 text-sm text-slate-500">
                  La classifica marcatori verrà aggiornata automaticamente
                  quando verranno inseriti i primi gol.
                </p>
              </div>
            ) : (
              <div className="pt-surface overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4 text-center">#</th>
                        <th className="px-6 py-4 text-left">Giocatore</th>
                        <th className="px-6 py-4 text-left">Squadra</th>
                        <th className="px-6 py-4 text-center">Gol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {classificaMarcatori.map((marcatore, index) => (
                        <tr
                          key={marcatore.calciatoreId}
                          className={`transition ${index < 2 ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "hover:bg-slate-800/60"}`}
                        >
                          <td className="px-6 py-5 text-center">
                            <span
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                                index === 0
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : index === 1
                                    ? "bg-zinc-400/20 text-zinc-200"
                                    : index === 2
                                      ? "bg-orange-500/20 text-orange-300"
                                      : "text-slate-400"
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-bold">{marcatore.nome}</span>
                          </td>
                          <td className="px-6 py-5 text-slate-400">
                            {marcatore.squadre.join(" / ")}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-2xl font-black text-green-400">
                              {marcatore.gol}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* TROFEI PRINCIPALI */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="pt-section-eyebrow text-sm font-bold uppercase tracking-widest text-yellow-400">
                Premi
              </p>
              <h3 className="pt-section-title mt-2 text-3xl font-black">
                🏆 Premi del torneo
              </h3>
              <p className="mt-2 max-w-3xl text-slate-400">
                I tre principali riconoscimenti del torneo.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {trofeiPrincipali.map(({ tipo, trofeo }) => {
                const info = getInfoTrofeo(tipo);

                const vincitoriMarcatori =
                  tipo === "MIGLIOR_MARCATORE"
                    ? trofeo?.calciatoriVincitori.map(
                        (vincitore) => vincitore.calciatoreTorneo
                      ) ?? []
                    : [];

                const nomeVincitore =
                  trofeo?.squadraVincitrice?.nome ||
                  (tipo !== "MIGLIOR_MARCATORE"
                    ? trofeo?.calciatoreVincitore?.calciatore.nome
                    : null) ||
                  (tipo === "MIGLIOR_MARCATORE" &&
                  vincitoriMarcatori.length > 0
                    ? vincitoriMarcatori
                        .map((vincitore) => vincitore.calciatore.nome)
                        .join(" / ")
                    : null) ||
                  "Da assegnare";

                const squadraVincitore =
                  tipo !== "MIGLIOR_MARCATORE"
                    ? trofeo?.calciatoreVincitore?.squadra.nome
                    : null;

                const assegnato = Boolean(trofeo);
                const isSquadraSorpresa = tipo === "SQUADRA_SORPRESA";

                return (
                  <div
                    key={tipo}
                    className={`pt-award-card group relative overflow-hidden rounded-3xl border p-6 shadow-xl transition duration-300 hover:-translate-y-1 ${
                      assegnato
                        ? "border-yellow-500/30 bg-slate-900 hover:border-yellow-500/60"
                        : "border-slate-800 bg-slate-900/70"
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-transparent" />
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 text-3xl">
                        {info.icona}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                          {info.nome}
                        </p>
                        {tipo === "MIGLIOR_MARCATORE" &&
                        vincitoriMarcatori.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {vincitoriMarcatori.map((vincitore) => (
                              <div
                                key={vincitore.id}
                                className="rounded-xl border border-yellow-500/20 bg-slate-950/70 p-3"
                              >
                                <p className="font-black text-white">
                                  {vincitore.calciatore.nome}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  {vincitore.squadra.nome}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <h3
                            className={`mt-2 text-xl font-black ${
                              assegnato ? "text-white" : "text-slate-500"
                            }`}
                          >
                            {nomeVincitore}
                          </h3>
                        )}
                        {squadraVincitore && (
                          <p className="mt-1 text-sm text-slate-400">
                            {squadraVincitore}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-800 pt-4">
                      {!isSquadraSorpresa && (
                        <>
                          {trofeo?.valore !== null &&
                            trofeo?.valore !== undefined && (
                              <p className="mb-2 text-sm font-bold text-green-400">
                                {trofeo.valore} gol
                              </p>
                            )}
                          <p className="text-sm leading-6 text-slate-500">
                            {trofeo?.nota ||
                              (assegnato
                                ? info.descrizione
                                : "Il premio verrà assegnato al termine del torneo.")}
                          </p>
                        </>
                      )}

                      {isSquadraSorpresa && trofeo?.nota && (
                        <p className="text-sm leading-6 text-slate-500">
                          {trofeo.nota}
                        </p>
                      )}

                      {isSquadraSorpresa && !trofeo && (
                        <p className="text-sm leading-6 text-slate-600">
                          Il premio verrà assegnato al termine del torneo.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* PREMI SPECIALI */}
          <section>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-purple-400">
                  Premi speciali
                </p>
                <h3 className="pt-section-title mt-2 text-3xl font-black">
                  ⭐ Premi individuali
                </h3>
                <p className="mt-2 max-w-3xl text-slate-400">
                  Riconoscimenti assegnati manualmente dall&apos;amministratore
                  al termine del torneo.
                </p>
              </div>

              {admin && (
                <Link
                  href={`/tornei/${torneo.id}/trofei`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3 font-bold text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-500/20"
                >
                  🏆 Gestisci premi
                </Link>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trofeiManuali.map(({ tipo, trofeo }) => {
                const info = getInfoTrofeo(tipo);
                const giocatore = trofeo?.calciatoreVincitore;
                const assegnato = Boolean(trofeo);

                return (
                  <div
                    key={tipo}
                    className={`pt-award-card relative overflow-hidden rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 ${
                      assegnato
                        ? "border-purple-500/30 bg-slate-900 hover:border-purple-500/60"
                        : "border-slate-800 bg-slate-900/70"
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-transparent" />
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-3xl">
                      {info.icona}
                    </div>

                    <p className="mt-5 text-xs font-bold uppercase tracking-widest text-purple-400">
                      Premio speciale
                    </p>
                    <h3 className="mt-2 text-xl font-black">{info.nome}</h3>

                    {giocatore ? (
                      <>
                        <p className="mt-4 text-lg font-black text-white">
                          {giocatore.calciatore.nome}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {giocatore.squadra.nome}
                        </p>
                      </>
                    ) : (
                      <p className="mt-4 text-lg font-bold text-slate-600">
                        Da assegnare
                      </p>
                    )}

                    {tipo === "MIGLIOR_MOMENTO" && trofeo?.nota && (
                      <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-5 text-slate-400">
                        {trofeo.nota}
                      </p>
                    )}

                    {tipo !== "MIGLIOR_MOMENTO" && !assegnato && (
                      <p className="mt-4 text-sm leading-5 text-slate-600">
                        Premio non ancora assegnato.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        {/* GALLERIA FOTOGRAFICA: SEMPRE IN FONDO ALLA PAGINA */}
        <section id="galleria" className="pt-chapter mt-24 border-t border-slate-800 pt-16">
          <div className="mb-8">
            <p className="pt-section-eyebrow text-sm font-bold uppercase tracking-widest text-green-400">
              Ricordi del torneo
            </p>
            <h2 className="pt-section-title mt-2 text-3xl font-black">
              📸 Galleria fotografica
            </h2>
            <p className="mt-2 text-slate-400">
              Le foto che raccontano i momenti più belli di questo torneo.
            </p>
          </div>

          <GalleriaFotoTorneo
            torneoId={torneo.id}
            admin={admin}
            foto={fotoGalleria}
          />
        </section>
      </div>
    </main>
  );
}
