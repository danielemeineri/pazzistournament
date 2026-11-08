import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StoricoPartite from "./StoricoPartite";
import SerieSquadra from "./SerieSquadra";
import IncisivitaSquadra from "@/components/statistiche/IncisivitaSquadra";


function immagineCoppa(nomeTorneo: string, tipoTorneo: string | null | undefined): string | null {
  const nome = `${nomeTorneo} ${tipoTorneo ?? ""}`.toLocaleLowerCase("it");
  if (/mondial|world cup/.test(nome)) {
    return /club|per club/.test(nome) ? "/trofei/mondiale-club.png" : "/trofei/mondiale-nazioni.png";
  }
  if (/copa.?am[eé]rica|coppa.?america/.test(nome)) return "/trofei/copa-america.png";
  if (/africa|african/.test(nome)) return "/trofei/coppa-africa.png";
  if (/asia|asian/.test(nome)) return "/trofei/coppa-asia.png";
  if (/europe|euro|uefa/.test(nome)) return "/trofei/europeo.png";
  return null;
}

function immaginePremio(tipo: string): string | null {
  const immagini: Record<string, string> = {
    MIGLIOR_MARCATORE: "/trofei/trofeo-capocannoniere.png",
    MIGLIOR_ASSISTMAN: "/trofei/miglior-assistman.png",
    MIGLIOR_PORTIERE: "/trofei/miglior-portiere.png",
    MIGLIOR_MOMENTO: "/trofei/miglior-momento.png",
    SQUADRA_SORPRESA: "/trofei/premio-sorpresa.png",
  };
  return immagini[tipo] ?? null;
}

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SquadraPage({ params }: Props) {
  const { id } = await params;

  const squadraId = Number(id);

  if (!Number.isInteger(squadraId) || squadraId <= 0) {
    notFound();
  }

  const squadra = await prisma.squadra.findUnique({
    where: {
      id: squadraId,
    },

    include: {
      valutazioniGiochi: {
        include: {
          videogioco: true,
        },

        orderBy: {
          videogioco: {
            nome: "asc",
          },
        },
      },

      partecipazioni: {
        include: {
          torneo: {
            include: {
              gioco: true,
            },
          },

          partecipante: true,
        },

        orderBy: {
          torneo: {
            anno: "desc",
          },
        },
      },

      calciatori: {
        include: {
          calciatore: true,

          torneo: {
            include: {
              gioco: true,
            },
          },

          gol: true,

          cartelliniRossi: true,
        },

        orderBy: {
          calciatore: {
            nome: "asc",
          },
        },
      },

      trofeiVinti: {
        include: {
          torneo: {
            include: {
              gioco: true,
            },
          },
        },

        orderBy: {
          torneo: {
            anno: "desc",
          },
        },
      },

      partiteCasa: {
        include: {
          torneo: {
            include: {
              gioco: true,
            },
          },

          squadraOspite: true,

          gol: {
            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                },
              },
            },

            orderBy: {
              minuto: "asc",
            },
          },

          cartelliniRossi: {
            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                },
              },
            },

            orderBy: {
              minuto: "asc",
            },
          },
        },

        orderBy: {
          dataPartita: "desc",
        },
      },

      partiteOspite: {
        include: {
          torneo: {
            include: {
              gioco: true,
            },
          },

          squadraCasa: true,

          gol: {
            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                },
              },
            },

            orderBy: {
              minuto: "asc",
            },
          },

          cartelliniRossi: {
            include: {
              calciatoreTorneo: {
                include: {
                  calciatore: true,
                },
              },
            },

            orderBy: {
              minuto: "asc",
            },
          },
        },

        orderBy: {
          dataPartita: "desc",
        },
      },
    },
  });

  if (!squadra) {
    notFound();
  }

  /* ==========================================================
     PARTITE
  ========================================================== */

  const partite = [
    ...squadra.partiteCasa.map((partita) => ({
      ...partita,
      casa: true as const,
    })),

    ...squadra.partiteOspite.map((partita) => ({
      ...partita,
      casa: false as const,
    })),
  ].sort((a, b) => {
    const dataA = a.dataPartita
      ? new Date(a.dataPartita).getTime()
      : 0;

    const dataB = b.dataPartita
      ? new Date(b.dataPartita).getTime()
      : 0;

    return dataB - dataA;
  });

  /* ==========================================================
     STATISTICHE GENERALI
  ========================================================== */

  let vittorie = 0;
  let pareggi = 0;
  let sconfitte = 0;

  let golFatti = 0;
  let golSubiti = 0;

  for (const partita of partite) {
    if (
      partita.GolCasa === null ||
      partita.GolOspite === null
    ) {
      continue;
    }

    const golCasa = partita.GolCasa;
    const golOspite = partita.GolOspite;

    if (partita.casa) {
      golFatti += golCasa;
      golSubiti += golOspite;

      if (golCasa > golOspite) {
        vittorie++;
      } else if (golCasa === golOspite) {
        pareggi++;
      } else {
        sconfitte++;
      }
    } else {
      golFatti += golOspite;
      golSubiti += golCasa;

      if (golOspite > golCasa) {
        vittorie++;
      } else if (golOspite === golCasa) {
        pareggi++;
      } else {
        sconfitte++;
      }
    }
  }

  const partiteGiocate =
    vittorie + pareggi + sconfitte;

  const percentualeVittorie =
    partiteGiocate > 0
      ? Math.round(
          (vittorie / partiteGiocate) * 100
        )
      : 0;
  
    /* ==========================================================
     INCISIVITÀ TEMPORALE
  ========================================================== */

  const partiteConcluse = partite.filter(
    (partita) =>
      partita.GolCasa !== null &&
      partita.GolOspite !== null &&
      partita.Completata
  );

  const golPerIncisivita = partiteConcluse.flatMap(
    (partita) =>
      partita.gol.map((gol) => ({
        minuto: gol.minuto,
        recupero: gol.recupero,
        periodo: gol.periodo,
        tipo: gol.tipo,
        squadraId: gol.squadraId,
      }))
  );


  /* ==========================================================
     GIOCATORI PER VIDEOGIOCO
  ========================================================== */

  const giocatoriPerGioco = new Map<
    string,
    {
      gioco: string;

      giocatori: Map<
        number,
        {
          id: number;
          nome: string;
          gol: number;
          rossi: number;
        }
      >;
    }
  >();

  for (const elemento of squadra.calciatori) {
    const nomeGioco =
      elemento.torneo.gioco?.nome ??
      elemento.torneo.videogioco ??
      "Videogioco non specificato";

    if (!giocatoriPerGioco.has(nomeGioco)) {
      giocatoriPerGioco.set(nomeGioco, {
        gioco: nomeGioco,
        giocatori: new Map(),
      });
    }

    const gruppo =
      giocatoriPerGioco.get(nomeGioco)!;

    if (
      !gruppo.giocatori.has(
        elemento.calciatore.id
      )
    ) {
      gruppo.giocatori.set(
        elemento.calciatore.id,
        {
          id: elemento.calciatore.id,
          nome: elemento.calciatore.nome,
          gol: 0,
          rossi: 0,
        }
      );
    }

    const giocatore =
      gruppo.giocatori.get(
        elemento.calciatore.id
      )!;

    giocatore.gol += elemento.gol.length;

    giocatore.rossi +=
      elemento.cartelliniRossi.length;
  }

  const giochi = Array.from(
    giocatoriPerGioco.values()
  ).sort((a, b) =>
    a.gioco.localeCompare(b.gioco, "it")
  );

  /* ==========================================================
     TROFEI
  ========================================================== */

  // La bacheca riunisce titoli della squadra e riconoscimenti dei suoi calciatori.
  // Un premio individuale appartiene alla squadra con cui il calciatore
  // partecipava a QUEL torneo, non alle sue squadre successive.
  const premiBacheca = await prisma.trofeo.findMany({
    where: {
      OR: [
        { squadraVincitriceId: squadraId },
        { calciatoreVincitore: { squadraId } },
        { calciatoriVincitori: { some: { calciatoreTorneo: { squadraId } } } },
      ],
    },
    include: {
      torneo: { include: { gioco: true } },
      calciatoreVincitore: {
        include: { calciatore: true },
      },
      calciatoriVincitori: {
        include: {
          calciatoreTorneo: { include: { calciatore: true } },
        },
      },
    },
    orderBy: [{ torneo: { anno: "desc" } }, { tipo: "asc" }],
  });

  const trofeiVinti = premiBacheca.filter(
    (premio) => premio.squadraVincitriceId === squadraId
  );
  const premiIndividuali = premiBacheca.flatMap((premio) => {
    const nomi = new Set<string>();
    if (premio.calciatoreVincitore?.squadraId === squadraId) {
      nomi.add(premio.calciatoreVincitore.calciatore.nome);
    }
    for (const vincitore of premio.calciatoriVincitori) {
      if (vincitore.calciatoreTorneo.squadraId === squadraId) {
        nomi.add(vincitore.calciatoreTorneo.calciatore.nome);
      }
    }
    return [...nomi].map((nome) => ({
      id: `${premio.id}-${nome}`,
      nome,
      tipo: premio.tipo,
      torneo: premio.torneo,
      nota: premio.nota,
    }));
  });

  // Classifica storica specifica di questa squadra: nessun dato di altre squadre.
  const leggendeMap = new Map<number, {
    id: number; nome: string; gol: number; rossi: number;
    tornei: Set<number>; premi: number;
  }>();
  for (const presenza of squadra.calciatori) {
    const id = presenza.calciatore.id;
    if (!leggendeMap.has(id)) {
      leggendeMap.set(id, { id, nome: presenza.calciatore.nome, gol: 0, rossi: 0, tornei: new Set(), premi: 0 });
    }
    const riga = leggendeMap.get(id)!;
    riga.gol += presenza.gol.filter((gol) => gol.tipo !== "AUTOGOL").length;
    riga.rossi += presenza.cartelliniRossi.length;
    riga.tornei.add(presenza.torneoId);
  }
  // Ogni assegnazione individuale è contata una volta per calciatore e torneo.
  for (const premio of premiBacheca) {
    const ids = new Set<number>();
    if (premio.calciatoreVincitore?.squadraId === squadraId) ids.add(premio.calciatoreVincitore.calciatoreId);
    for (const vincitore of premio.calciatoriVincitori) {
      if (vincitore.calciatoreTorneo.squadraId === squadraId) ids.add(vincitore.calciatoreTorneo.calciatoreId);
    }
    for (const id of ids) {
      const riga = leggendeMap.get(id);
      if (riga) riga.premi++;
    }
  }
  const leggende = [...leggendeMap.values()];
  const capocannonieriStorici = [...leggende].sort((a,b) => b.gol - a.gol || b.premi - a.premi || a.nome.localeCompare(b.nome,"it")).slice(0,10);
  const piuPremiati = [...leggende].filter((g) => g.premi > 0).sort((a,b) => b.premi - a.premi || b.gol - a.gol || a.nome.localeCompare(b.nome,"it")).slice(0,10);

  // Record separati per videogioco, senza mischiare le diverse edizioni.
  const recordPerVideogioco = [...giocatoriPerGioco.values()].map((gruppo) => {
    const marcatori = [...gruppo.giocatori.values()].sort((a,b) => b.gol - a.gol || a.nome.localeCompare(b.nome, "it"));
    return { gioco: gruppo.gioco, marcatori: marcatori.slice(0, 3), totaleGiocatori: marcatori.length };
  }).sort((a,b) => a.gioco.localeCompare(b.gioco, "it"));
  const podioMarcatori = capocannonieriStorici.slice(0,3);
  const recordGol = capocannonieriStorici[0]?.gol ?? 0;

  const vittorieTorneo =
    trofeiVinti.filter(
      (trofeo) =>
        trofeo.tipo === "VINCITORE_TORNEO"
    ).length;

  /* ==========================================================
     RISULTATI DEI TORNEI
  ========================================================== */

  const risultati = squadra.partecipazioni.map(
    (partecipazione) => {
      const partiteTorneo =
        partite.filter(
          (partita) =>
            partita.TorneoId ===
            partecipazione.torneoId
        );

      const haVinto =
        trofeiVinti.some(
          (trofeo) =>
            trofeo.torneoId ===
              partecipazione.torneoId &&
            trofeo.tipo === "VINCITORE_TORNEO"
        );

      if (haVinto) {
        return {
          torneo: partecipazione.torneo,
          risultato: "🏆 Vincitore",
          livello: 100,
        };
      }

      // La finale per il 3°/4° posto NON è la finale per il titolo.
      // Normalizziamo anche le diciture storiche e le varianti con simboli ordinali.
      const fasi = partiteTorneo.map((partita) =>
        (partita.Fase ?? "")
          .toLocaleLowerCase("it")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/º|°|ª/g, "")
          .replace(/\s+/g, " ")
          .trim()
      );

      // Identifica la finale per il terzo posto e il relativo esito.
      // Non attribuiamo un piazzamento finché la partita non è conclusa.
      const partitaTerzoPosto = partiteTorneo.find((partita) => {
        const fase = (partita.Fase ?? "")
          .toLocaleLowerCase("it")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[º°ª]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return /(?:3\s*(?:\/|e|o)?\s*4|terz[oa]|third|bronze|3\s*posto|quarto\s*posto)/.test(fase) &&
          /(?:final|posto|place|bronze)/.test(fase);
      });

      const finaleTerzoPosto = Boolean(partitaTerzoPosto);
      let piazzamentoTerzoPosto: "terzo" | "quarto" | null = null;
      if (
        partitaTerzoPosto?.Completata &&
        partitaTerzoPosto.GolCasa !== null &&
        partitaTerzoPosto.GolOspite !== null
      ) {
        let differenza = partitaTerzoPosto.GolCasa - partitaTerzoPosto.GolOspite;
        if (
          differenza === 0 &&
          partitaTerzoPosto.AiRigori &&
          partitaTerzoPosto.RigoriCasa !== null &&
          partitaTerzoPosto.RigoriOspite !== null
        ) {
          differenza = partitaTerzoPosto.RigoriCasa - partitaTerzoPosto.RigoriOspite;
        }
        if (differenza !== 0) {
          const squadraInCasa = partitaTerzoPosto.SquadraCasaId === squadraId;
          const haVintoTerzoPosto = squadraInCasa ? differenza > 0 : differenza < 0;
          piazzamentoTerzoPosto = haVintoTerzoPosto ? "terzo" : "quarto";
        }
      }

      // Solo la finale per il titolo attribuisce il risultato di finalista.
      const finaleTitolo = fasi.some((fase) =>
        /(?:finale|final|grand final)/.test(fase) &&
        !/(?:semi|quarter|quarti|ottavi|sedicesimi|round of)/.test(fase) &&
        !/(?:3\s*(?:\/|e|o)?\s*4|terz[oa]|third|bronze|3\s*posto|quarto\s*posto)/.test(fase)
      );

      if (finaleTitolo) {
        return {
          torneo: partecipazione.torneo,
          risultato: "🥈 Finale",
          livello: 90,
        };
      }

      if (finaleTerzoPosto) {
        return {
          torneo: partecipazione.torneo,
          risultato: piazzamentoTerzoPosto === "terzo"
            ? "🥉 3° posto"
            : piazzamentoTerzoPosto === "quarto"
              ? "4° posto"
              : "Finale 3°/4° posto (esito da confermare)",
          livello: piazzamentoTerzoPosto === "terzo" ? 85 : 82,
        };
      }

      if (
        fasi.some(
          (fase) =>
            fase.includes("semifinale") ||
            fase.includes("semi")
        )
      ) {
        return {
          torneo: partecipazione.torneo,
          risultato: "Semifinale",
          livello: 80,
        };
      }

      if (
        fasi.some(
          (fase) =>
            fase.includes("quarti") ||
            fase.includes("quarter")
        )
      ) {
        return {
          torneo: partecipazione.torneo,
          risultato: "Quarti di finale",
          livello: 70,
        };
      }

      if (
        fasi.some(
          (fase) =>
            fase.includes("ottavi") ||
            fase.includes("round of 16")
        )
      ) {
        return {
          torneo: partecipazione.torneo,
          risultato: "Ottavi di finale",
          livello: 60,
        };
      }

      return {
        torneo: partecipazione.torneo,
        risultato: "Partecipazione",
        livello: 10,
      };
    }
  );

  const migliorRisultato =
    [...risultati].sort(
      (a, b) => b.livello - a.livello
    )[0];

  /* ==========================================================
     STORICO PARTITE PER TORNEO
  ========================================================== */

  const torneiStoricoMap = new Map<
    number,
    {
      id: number;
      nome: string;
      anno: number;
      gioco: string;
      partite: typeof partite;
    }
  >();

  for (const partita of partite) {
    const torneo = partita.torneo;

    if (!torneiStoricoMap.has(torneo.id)) {
      torneiStoricoMap.set(torneo.id, {
        id: torneo.id,
        nome: torneo.nome,
        anno: torneo.anno,

        gioco:
          torneo.gioco?.nome ??
          torneo.videogioco ??
          "Videogioco non specificato",

        partite: [],
      });
    }

    torneiStoricoMap
      .get(torneo.id)!
      .partite.push(partita);
  }

  const torneiStorico = Array.from(
    torneiStoricoMap.values()
  )
    .sort((a, b) => {
      if (b.anno !== a.anno) {
        return b.anno - a.anno;
      }

      return a.nome.localeCompare(
        b.nome,
        "it"
      );
    })
    .map((torneo) => ({
      ...torneo,
      numeroPartite: torneo.partite.length,
    }));

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030812] text-white">
      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="relative isolate overflow-hidden border-b border-amber-300/15 bg-[radial-gradient(ellipse_at_50%_15%,rgba(14,116,144,.22),transparent_55%),radial-gradient(ellipse_at_85%_70%,rgba(217,119,6,.12),transparent_45%),linear-gradient(160deg,#0c1d34,#030812_78%)]">
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[repeating-linear-gradient(115deg,transparent_0px,transparent_95px,rgba(255,255,255,.025)_96px,transparent_97px)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/squadre"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-200 backdrop-blur transition hover:border-amber-300/40 hover:bg-white/10"
          >
            ← Torna alle squadre
          </Link>

          <div className="relative flex flex-col items-center py-12 text-center sm:py-20">
            {/* STEMMA */}

            {squadra.stemma ? (
              <div className="relative flex h-44 w-44 items-center justify-center rounded-[38px] border border-amber-200/25 bg-gradient-to-br from-white/10 to-slate-950/80 p-7 shadow-[0_0_95px_rgba(56,189,248,.16)] ring-8 ring-white/[.025] sm:h-56 sm:w-56">
                <img
                  src={squadra.stemma}
                  alt={squadra.nome}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-[38px] border border-amber-200/25 bg-slate-900 text-7xl shadow-2xl sm:h-56 sm:w-56">
                ⚽
              </div>
            )}

            {/* NOME */}

            <p className="mt-10 text-xs font-black uppercase tracking-[0.35em] text-amber-300">
              Scheda storica
            </p>

            <h1 className="mt-3 max-w-5xl break-words bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-5xl font-black tracking-tight text-transparent drop-shadow-2xl sm:text-7xl">
              {squadra.nome}
            </h1>

            {/* INFO */}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="rounded-full border border-white/15 bg-slate-900/65 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 backdrop-blur">
                {squadra.tipo === "Nazionale"
                  ? "🌍 Nazionale"
                  : "🏟️ Club"}
              </span>

              {squadra.nazione && (
                <span className="rounded-full border border-white/15 bg-slate-900/65 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 backdrop-blur">
                  🗺️ {squadra.nazione}
                </span>
              )}

              <span className="rounded-full border border-white/15 bg-slate-900/65 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 backdrop-blur">
                📅 Dal{" "}
                {new Date(
                  squadra.creataIl
                ).getFullYear()}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
              <div><p className="text-3xl font-black text-amber-200 sm:text-4xl">{vittorieTorneo}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Titoli</p></div>
              <div className="h-10 w-px bg-white/15" />
              <div><p className="text-3xl font-black sm:text-4xl">{partiteGiocate}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Partite</p></div>
              <div className="h-10 w-px bg-white/15" />
              <div><p className="text-3xl font-black text-emerald-300 sm:text-4xl">{percentualeVittorie}%</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Vittorie</p></div>
            </div>
            <nav aria-label="Sezioni della squadra" className="mt-9 flex max-w-5xl flex-wrap justify-center gap-2">
              {[{href:"#palmares",label:"Bacheca"},{href:"#leggende",label:"Leggende"},{href:"#numeri",label:"Statistiche"},{href:"#rose",label:"Giocatori"},{href:"#partecipazioni",label:"Tornei"},{href:"#partite",label:"Partite"}].map(item=>(
                <a key={item.href} href={item.href} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 backdrop-blur transition hover:border-amber-300/50 hover:text-amber-200">{item.label}</a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-7xl space-y-2 px-4 py-6 sm:px-6 sm:py-10">
        {/* ====================================================
            PALMARES
        ==================================================== */}

        <section id="palmares" className="scroll-mt-20">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-400">
              Palmares
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              🏆 Bacheca dei trofei
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-[36px] border border-amber-300/20 bg-[#050a15] p-4 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,.18),transparent_48%),repeating-linear-gradient(90deg,transparent_0px,transparent_115px,rgba(255,255,255,.012)_116px,transparent_117px)]" />
            <div className="relative mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-amber-300/15 pb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.35em] text-amber-300">PazziTournament · Hall of Fame</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">La sala dei trofei</h3>
                <p className="mt-2 max-w-xl text-sm text-slate-400">Ogni titolo, ogni leggenda, ogni momento che ha scritto la storia di {squadra.nome}.</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center"><p className="text-4xl font-black tabular-nums text-amber-300">{vittorieTorneo}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titoli</p></div>
                <div className="w-px bg-white/10" />
                <div className="text-center"><p className="text-4xl font-black tabular-nums text-sky-300">{premiIndividuali.length}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Premi</p></div>
              </div>
            </div>
            <div className="relative">
              <div className="mb-5 flex items-center gap-3"><span className="h-px w-9 bg-amber-300/70" /><h4 className="text-sm font-black uppercase tracking-[.2em] text-amber-200">Coppe conquistate</h4><span className="h-px flex-1 bg-amber-300/15" /></div>
              {trofeiVinti.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trofeiVinti.map((trofeo) => (
                    <Link key={trofeo.id} href={`/tornei/${trofeo.torneo.id}`} className="group relative flex min-h-[350px] flex-col items-center justify-end overflow-hidden rounded-[24px] border border-amber-300/20 bg-[radial-gradient(ellipse_at_50%_35%,rgba(251,191,36,.17),transparent_58%),linear-gradient(180deg,#162238,#090f1b)] px-5 pb-6 pt-8 text-center transition-all duration-500 hover:-translate-y-2 hover:border-amber-200/60 hover:shadow-[0_20px_60px_rgba(245,158,11,.15)]">
                      <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-36 -translate-x-1/2 bg-gradient-to-b from-amber-100/15 to-transparent blur-2xl" />
                      <div className="relative mb-5 flex h-44 w-full items-center justify-center">
                        <div className="absolute bottom-0 h-3 w-36 rounded-[50%] bg-amber-300/15 blur-lg" />
                        {immagineCoppa(trofeo.torneo.nome, null) ? (
                          <img src={immagineCoppa(trofeo.torneo.nome, null)!} alt={`Coppa ${trofeo.torneo.nome}`} className="relative h-44 w-full object-contain drop-shadow-[0_15px_24px_rgba(245,158,11,.28)] transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <span className="relative text-8xl drop-shadow-[0_15px_24px_rgba(245,158,11,.28)]">🏆</span>
                        )}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{trofeo.torneo.anno} · Campioni</p>
                      <h5 className="mt-2 text-lg font-black text-white">{trofeo.torneo.nome}</h5>
                      <p className="mt-2 text-xs text-slate-400">{trofeo.torneo.gioco?.nome ?? trofeo.torneo.videogioco ?? "PazziTournament"}</p>
                      <span className="mt-4 text-xs font-bold text-amber-200 opacity-80 transition group-hover:opacity-100">Esplora il trionfo →</span>
                    </Link>
                  ))}
                </div>
              ) : <div className="rounded-2xl border border-dashed border-amber-300/20 bg-white/[.025] p-10 text-center text-sm text-slate-400">La prima coppa aspetta ancora di essere conquistata.</div>}
            </div>
            <div className="relative mt-10 border-t border-white/10 pt-8">
              <div className="mb-5 flex items-center gap-3"><span className="h-px w-9 bg-sky-300/70" /><h4 className="text-sm font-black uppercase tracking-[.2em] text-sky-200">Le leggende della squadra</h4><span className="h-px flex-1 bg-sky-300/15" /></div>
              {premiIndividuali.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {premiIndividuali.map((premio) => (
                    <Link key={premio.id} href={`/tornei/${premio.torneo.id}`} className="group relative overflow-hidden rounded-[24px] border border-sky-300/20 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,.12),transparent_55%),linear-gradient(180deg,#172740,#09111f)] p-6 text-center transition-all duration-500 hover:-translate-y-1 hover:border-sky-200/60 hover:shadow-[0_15px_50px_rgba(56,189,248,.12)]">
                      <div className="mx-auto flex h-28 w-32 items-center justify-center text-6xl transition-transform duration-500 group-hover:scale-110">{immaginePremio(premio.tipo) ? <img src={immaginePremio(premio.tipo)!} alt={premio.tipo.replaceAll("_", " ")} className="h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(56,189,248,.18)]" /> : (premio.tipo === "MIGLIOR_MARCATORE" ? "⚽" : premio.tipo === "MVP" ? "⭐" : "🏅")}</div>
                      <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-sky-300">{premio.tipo.replaceAll("_"," ")}</p>
                      <h5 className="mt-2 text-xl font-black text-white">{premio.nome}</h5>
                      <p className="mt-2 text-sm text-slate-400">{premio.torneo.nome} · {premio.torneo.anno}</p>
                      {premio.nota && <p className="mt-2 text-xs text-slate-500">{premio.nota}</p>}
                      <p className="mt-4 text-xs font-bold text-sky-300">Visualizza riconoscimento →</p>
                    </Link>
                  ))}
                </div>
              ) : <div className="rounded-2xl border border-dashed border-sky-300/20 bg-white/[.025] p-8 text-center text-sm text-slate-400">Nessun premio individuale ancora registrato per i calciatori della squadra.</div>}
            </div>
            <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/[.025] px-5 py-4">
              <p className="text-xs text-slate-400">Miglior piazzamento: <span className="font-bold text-white">{migliorRisultato?.risultato ?? "Nessun risultato"}</span>{migliorRisultato ? ` · ${migliorRisultato.torneo.nome} ${migliorRisultato.torneo.anno}` : ""}</p>
            </div>
          </div>
        </section>


        {/* ====================================================
            STATISTICHE
        ==================================================== */}

        {/* ====================================================
            HALL OF LEGENDS: dati reali per squadra
        ==================================================== */}
        <section id="leggende" className="mt-20 scroll-mt-20">
          <div className="relative overflow-hidden rounded-[36px] border border-amber-300/20 bg-[#050b18] px-4 py-9 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:px-8 sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(234,179,8,.13),transparent_58%),repeating-linear-gradient(90deg,transparent_0px,transparent_130px,rgba(255,255,255,.013)_131px,transparent_132px)]" />
            <div className="relative mb-9 text-center">
              <p className="text-[11px] font-black uppercase tracking-[.4em] text-amber-300">PazziTournament · Hall of Legends</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">Le leggende {squadra.tipo?.toLowerCase() === "nazionale" ? "della nazionale" : "del club"}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">I protagonisti della storia di {squadra.nome}. Classifiche calcolate esclusivamente dalle prestazioni e dai riconoscimenti registrati con questa squadra.</p>
            </div>
            <div className="relative mb-11 grid grid-cols-3 items-end gap-2 sm:gap-5">
              {[podioMarcatori[1],podioMarcatori[0],podioMarcatori[2]].map((giocatore, posizione) => {
                const medaglia = posizione === 1 ? "🥇" : posizione === 0 ? "🥈" : "🥉";
                const colore = posizione === 1 ? "border-amber-300/50 from-amber-300/20" : posizione === 0 ? "border-slate-300/30 from-slate-300/15" : "border-orange-400/30 from-orange-400/15";
                return <div key={giocatore?.id ?? `vuoto-${posizione}`} className={`relative flex flex-col items-center justify-end rounded-[22px] border bg-gradient-to-b ${colore} to-[#101a2d] px-2 pb-5 pt-5 text-center ${posizione === 1 ? "min-h-[275px] sm:min-h-[320px]" : "min-h-[230px] sm:min-h-[275px]"}`}>
                  <span className="text-4xl sm:text-6xl">{medaglia}</span>
                  <span className="mt-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{posizione === 1 ? "Recordman" : `${posizione === 0 ? "2°" : "3°"} posto`}</span>
                  <h3 className="mt-3 line-clamp-2 text-sm font-black text-white sm:text-xl">{giocatore?.nome ?? "Da assegnare"}</h3>
                  <p className="mt-3 text-3xl font-black tabular-nums text-amber-200 sm:text-5xl">{giocatore?.gol ?? "—"}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Gol segnati</p>
                  {giocatore && <p className="mt-3 text-[11px] text-slate-400">{giocatore.tornei.size} tornei · {giocatore.premi} premi</p>}
                </div>;
              })}
            </div>
            <div className="relative grid gap-5 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[26px] border border-amber-300/20 bg-[#111c2e]/90 p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3"><h3 className="text-xl font-black text-amber-200">⚽ Top 10 marcatori</h3><span className="text-xs text-slate-400">Record {recordGol} gol</span></div>
                {capocannonieriStorici.length ? <div className="space-y-2">{capocannonieriStorici.map((giocatore,i) => (
                  <div key={giocatore.id} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3">
                    <div className="flex items-center gap-3"><span className="w-7 text-center text-sm font-black text-amber-300">{String(i+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{giocatore.nome}</p><p className="text-[11px] text-slate-400">{giocatore.tornei.size} tornei · {giocatore.premi} premi</p></div><span className="text-xl font-black tabular-nums text-amber-200">{giocatore.gol}</span></div>
                    <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-200" style={{width:`${recordGol > 0 ? giocatore.gol / recordGol * 100 : 0}%`}} /></div>
                  </div>
                ))}</div> : <p className="text-sm text-slate-400">Nessun calciatore registrato.</p>}
              </div>
              <div className="overflow-hidden rounded-[26px] border border-sky-300/20 bg-[#101c2d]/90 p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-3"><h3 className="text-xl font-black text-sky-200">🏅 I più premiati</h3><span className="text-xs text-slate-400">Riconoscimenti individuali</span></div>
                {piuPremiati.length ? <div className="space-y-2">{piuPremiati.map((giocatore,i) => (
                  <div key={giocatore.id} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${i === 0 ? "border-sky-300/35 bg-sky-300/10" : "border-white/[.07] bg-white/[.025]"}`}><span className="w-7 text-center text-sm font-black text-sky-300">{String(i+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{giocatore.nome}</p><p className="text-[11px] text-slate-400">{giocatore.gol} gol · {giocatore.tornei.size} tornei</p></div><span className="text-2xl font-black tabular-nums text-sky-200">{giocatore.premi}</span></div>
                ))}</div> : <p className="text-sm text-slate-400">Nessun premio individuale registrato.</p>}
              </div>
            </div>
            <div className="relative mt-9 border-t border-white/10 pt-8">
              <div className="mb-5"><p className="text-[11px] font-black uppercase tracking-[.25em] text-violet-300">Record per generazione</p><h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">🎮 I migliori per videogioco</h3><p className="mt-2 text-sm text-slate-400">Le prestazioni restano separate tra FIFA, PES e le altre edizioni.</p></div>
              {recordPerVideogioco.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recordPerVideogioco.map((gruppo) => (
                <div key={gruppo.gioco} className="rounded-[22px] border border-violet-300/20 bg-gradient-to-br from-[#211c3a] to-[#0c1323] p-5"><div className="mb-4 flex items-center justify-between gap-3"><h4 className="font-black text-white">{gruppo.gioco}</h4><span className="text-xs text-violet-200">{gruppo.totaleGiocatori} giocatori</span></div><div className="space-y-3">{gruppo.marcatori.map((g,i) => <div key={g.id} className="flex items-center gap-3"><span className="text-sm font-black text-violet-300">{i+1}.</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{g.nome}</span><span className="font-black tabular-nums text-white">{g.gol} <span className="text-[10px] font-normal text-slate-400">gol</span></span></div>)}</div></div>
              ))}</div> : <p className="text-sm text-slate-400">Non ci sono ancora rose registrate per videogioco.</p>}
            </div>
            <p className="relative mt-7 text-xs text-slate-500">Autogol esclusi. I premi vengono conteggiati una sola volta per giocatore e riconoscimento. Non vengono attribuiti voti o valutazioni soggettive.</p>
          </div>
        </section>

        <section id="numeri" className="mt-16 scroll-mt-20">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-400">
              Numeri storici
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              📊 Statistiche
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Tornei disputati"
              value={squadra.partecipazioni.length}
              icon="🏆"
            />

            <StatCard
              label="Partite"
              value={partiteGiocate}
              icon="⚽"
            />

            <StatCard
              label="Vittorie"
              value={vittorie}
              icon="🟢"
            />

            <StatCard
              label="Pareggi"
              value={pareggi}
              icon="🟡"
            />

            <StatCard
              label="Sconfitte"
              value={sconfitte}
              icon="🔴"
            />

            <StatCard
              label="Gol fatti"
              value={golFatti}
              icon="⚽"
            />

            <StatCard
              label="Gol subiti"
              value={golSubiti}
              icon="🥅"
            />

            <StatCard
              label="% vittorie"
              value={`${percentualeVittorie}%`}
              icon="📈"
            />
          </div>
        </section>
        <SerieSquadra squadraId={squadra.id} />
                <IncisivitaSquadra squadraId={squadra.id} />

        {/* ====================================================
            GIOCATORI PER VIDEOGIOCO
        ==================================================== */}

        <section id="rose" className="mt-16 scroll-mt-20">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
              Archivio rose
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              👥 Giocatori
            </h2>

            <p className="mt-3 max-w-2xl text-slate-400">
              I giocatori che hanno rappresentato
              questa squadra, suddivisi per
              videogioco.
            </p>
          </div>

          <div className="space-y-6">
            {giochi.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
                Nessun giocatore registrato.
              </div>
            ) : (
              giochi.map((gruppo) => {
                const giocatori =
                  Array.from(
                    gruppo.giocatori.values()
                  ).sort((a, b) =>
                    a.nome.localeCompare(
                      b.nome,
                      "it"
                    )
                  );

                return (
                  <div
                    key={gruppo.gioco}
                    className="rounded-[28px] border border-sky-300/15 bg-gradient-to-br from-[#10213a] to-[#07101e] p-5 shadow-xl sm:p-7"
                  >
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-2xl font-black">
                        🎮 {gruppo.gioco}
                      </h3>

                      <span className="w-fit rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">
                        {giocatori.length}{" "}
                        {giocatori.length === 1
                          ? "giocatore"
                          : "giocatori"}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {giocatori.map(
                        (giocatore) => (
                          <div
                            key={giocatore.id}
                            className="rounded-2xl border border-white/10 bg-[#071324]/80 p-5 transition-all hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-[#10223c]"
                          >
                            <p className="font-black">
                              {giocatore.nome}
                            </p>

                            <div className="mt-3 flex gap-5 text-sm text-slate-400">
                              <span>
                                ⚽{" "}
                                <strong className="text-white">
                                  {giocatore.gol}
                                </strong>
                              </span>

                              <span>
                                🟥{" "}
                                <strong className="text-white">
                                  {giocatore.rossi}
                                </strong>
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ====================================================
            STORICO PARTECIPAZIONI
        ==================================================== */}

        <section id="partecipazioni" className="mt-16 scroll-mt-20">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-400">
              Storia
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              📚 Partecipazioni
            </h2>

            <p className="mt-3 text-slate-400">
              Tutte le partecipazioni della squadra
              nella storia di PazziTournament.
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1729] shadow-[0_20px_60px_rgba(0,0,0,.3)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-amber-300/15 bg-[#101f34]">
                  <tr>
                    <th className="px-5 py-4 text-sm font-bold text-slate-400">
                      Anno
                    </th>

                    <th className="px-5 py-4 text-sm font-bold text-slate-400">
                      Torneo
                    </th>

                    <th className="px-5 py-4 text-sm font-bold text-slate-400">
                      Videogioco
                    </th>

                    <th className="px-5 py-4 text-sm font-bold text-slate-400">
                      Partecipante
                    </th>

                    <th className="px-5 py-4 text-sm font-bold text-slate-400">
                      Risultato
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {risultati.map(
                    (risultato) => {
                      const partecipazione =
                        squadra.partecipazioni.find(
                          (p) =>
                            p.torneoId ===
                            risultato.torneo.id
                        );

                      return (
                        <tr
                          key={
                            risultato.torneo.id
                          }
                          className="border-b border-white/[.07] transition hover:bg-sky-300/[.06] last:border-0"
                        >
                          <td className="px-5 py-5 font-black">
                            {
                              risultato.torneo
                                .anno
                            }
                          </td>

                          <td className="px-5 py-5 font-bold">
                            {
                              risultato.torneo
                                .nome
                            }
                          </td>

                          <td className="px-5 py-5 text-slate-400">
                            {risultato.torneo
                              .gioco?.nome ??
                              risultato.torneo
                                .videogioco ??
                              "—"}
                          </td>

                          <td className="px-5 py-5 text-slate-400">
                            {partecipazione
                              ?.partecipante
                              ?.nome ??
                              "—"}
                          </td>

                          <td className="px-5 py-5 font-bold">
                            {
                              risultato.risultato
                            }
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ====================================================
            STORICO PARTITE
        ==================================================== */}

        <section id="partite" className="mt-16 scroll-mt-20">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
              Archivio partite
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              ⚽ Storico partite
            </h2>

            <p className="mt-3 max-w-2xl text-slate-400">
              Tutte le partite disputate dalla
              squadra, organizzate per torneo.
              Clicca su un torneo per visualizzare
              gli incontri.
            </p>
          </div>

          <StoricoPartite
            tornei={torneiStorico.map(
              (torneo) => ({
                id: torneo.id,
                nome: torneo.nome,
                anno: torneo.anno,
                gioco: torneo.gioco,
                numeroPartite:
                  torneo.numeroPartite,

                partite: (
                  <>
                    {torneo.partite.map(
                      (partita) => {
                        const avversaria =
                          partita.casa
                            ? partita.squadraOspite
                            : partita.squadraCasa;

                        return (
                          <div
                            key={partita.id.toString()}
                            className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#10213a] to-[#091427] p-5 shadow-lg transition hover:border-amber-300/30 hover:bg-[#142841]"
                          >
                            {/* INTESTAZIONE */}

                            <div className="flex flex-col gap-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                                  {partita.Fase && (
                                    <span className="rounded-full bg-slate-800 px-3 py-1">
                                      {
                                        partita.Fase
                                      }
                                    </span>
                                  )}

                                  {partita.giornata && (
                                    <span className="rounded-full bg-slate-800 px-3 py-1">
                                      Giornata{" "}
                                      {
                                        partita.giornata
                                      }
                                    </span>
                                  )}

                                  {partita.NumeroGara >
                                    1 && (
                                    <span className="rounded-full bg-slate-800 px-3 py-1">
                                      Gara{" "}
                                      {
                                        partita.NumeroGara
                                      }
                                    </span>
                                  )}
                                </div>

                                <span className="text-sm text-slate-500">
                                  {partita.dataPartita
                                    ? new Date(
                                        partita.dataPartita
                                      ).toLocaleDateString(
                                        "it-IT"
                                      )
                                    : "Data non disponibile"}
                                </span>
                              </div>

                              {/* RISULTATO */}

                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm font-black sm:text-base">
                                    {partita.casa
                                      ? squadra.nome
                                      : partita
                                          .squadraCasa
                                          ?.nome}
                                  </p>

                                  {partita.casa && (
                                    <p className="mt-1 text-xs text-green-400">
                                      Casa
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-2xl border border-amber-300/20 bg-[#050c19] px-5 py-3 text-center shadow-[0_0_25px_rgba(245,158,11,.07)]">
                                  <div className="text-2xl font-black tracking-wider">
                                    {partita.GolCasa ?? "-"}{" "}
                                    <span className="text-slate-600">
                                      -
                                    </span>{" "}
                                    {partita.GolOspite ?? "-"}
                                  </div>

                                  {partita.AiRigori && (
                                    <p className="mt-1 text-xs font-bold text-yellow-400">
                                      🎯{" "}
                                      {
                                        partita.RigoriCasa
                                      }{" "}
                                      -{" "}
                                      {
                                        partita.RigoriOspite
                                      }{" "}
                                      ai rigori
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-sm font-black sm:text-base">
                                    {avversaria?.nome ??
                                      "Avversaria sconosciuta"}
                                  </p>

                                  {!partita.casa && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      Trasferta
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* GOL */}

                            {partita.gol.length >
                              0 && (
                              <div className="mt-5 border-t border-slate-800 pt-4">
                                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  ⚽ Marcatori
                                </p>

                                <div className="grid gap-2 sm:grid-cols-2">
                                  {partita.gol.map(
                                    (gol) => (
                                      <div
                                        key={gol.id}
                                        className="flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3"
                                      >
                                        <span className="font-semibold">
                                          {
                                            gol
                                              .calciatoreTorneo
                                              .calciatore
                                              .nome
                                          }
                                        </span>

                                        <span className="text-sm text-slate-500">
                                          {
                                            gol.minuto
                                          }
                                          '
                                          {gol.tipo !==
                                            "NORMALE" &&
                                            ` · ${gol.tipo}`}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* CARTELLINI ROSSI */}

                            {partita
                              .cartelliniRossi
                              .length > 0 && (
                              <div className="mt-5 border-t border-slate-800 pt-4">
                                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-400">
                                  🟥 Espulsioni
                                </p>

                                <div className="grid gap-2 sm:grid-cols-2">
                                  {partita.cartelliniRossi.map(
                                    (
                                      cartellino
                                    ) => (
                                      <div
                                        key={
                                          cartellino.id
                                        }
                                        className="flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3"
                                      >
                                        <span className="font-semibold">
                                          {cartellino
                                            .calciatoreTorneo
                                            ?.calciatore
                                            .nome ??
                                            "Giocatore non specificato"}
                                        </span>

                                        {cartellino.minuto !==
                                          null && (
                                          <span className="text-sm text-slate-500">
                                            {
                                              cartellino.minuto
                                            }
                                            '
                                          </span>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </>
                ),
              })
            )}
          />
        </section>

        {/* ====================================================
            FOOTER NAVIGATION
        ==================================================== */}

        <div className="mt-16 border-t border-amber-300/10 pt-8">
          <Link
            href="/squadre"
            className="inline-flex items-center rounded-xl border border-amber-300/25 bg-[#12213a] px-5 py-3 font-bold text-amber-200 transition hover:border-amber-300/60 hover:bg-[#1c2e49]"
          >
            ← Torna all'archivio squadre
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================
   COMPONENTE STATISTICA
========================================================== */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-amber-200/10 bg-gradient-to-br from-[#10243e] via-[#0b172a] to-[#07101f] p-5 shadow-[0_14px_40px_rgba(0,0,0,.22)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/35 hover:shadow-[0_18px_55px_rgba(245,158,11,.09)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-400">
          {label}
        </p>

        <span className="text-xl transition group-hover:scale-110">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-4xl font-black tabular-nums tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}