import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RankingAllenatori from "@/components/RankingAllenatori";
import MostraTutto from "@/components/MostraTutto";
import SerieGlobali from "@/components/statistiche/SerieGlobali";

type StatSquadra = {
  id: number;
  nome: string;
  tipo: string;
  stemma: string | null;
  partite: number;
  vittorie: number;
  pareggi: number;
  sconfitte: number;
  golFatti: number;
  golSubiti: number;
  differenzaReti: number;
};

type StatGiocatore = {
  id: number;
  nome: string;
  gol: number;
  squadre: string[];
};

type PartitaRecord = {
  id: number;
  torneo: string;
  torneoId: number;
  casa: string;
  ospite: string;
  golCasa: number;
  golOspite: number;
  totaleGol: number;
  scarto: number;
};

type RigaRanking = {
  id: number;
  rating: number;
  tipo: "NAZIONALE" | "CLUB" | "MISTO";
  squadra: {
    id: number;
    nome: string;
    tipo: string;
    stemma: string | null;
    bandiera: string | null;
  };
  storico: {
    variazione: number;
    risultato: string;
    fase: string | null;
    creatoIl: Date;
  }[];
};

function TabellaRanking({
  titolo,
  descrizione,
  ranking,
}: {
  titolo: string;
  descrizione: string;
  ranking: RigaRanking[];
}) {
  return (
    <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#101b32]/90 shadow-[0_20px_70px_rgba(0,0,0,.22)] backdrop-blur-xl">
      <div className="border-b border-white/10 p-6">
        <h3 className="text-2xl font-black tracking-tight text-white">{titolo}</h3>
        <p className="mt-2 text-sm text-slate-400">{descrizione}</p>
      </div>

      {ranking.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <p className="text-3xl">📊</p>
          <p className="mt-3 font-bold">Nessuna squadra presente</p>
          <p className="mt-1 text-sm">
            Non sono ancora disponibili squadre per questo ranking.
          </p>
        </div>
      ) : (
        <MostraTutto
          initialCount={3}
          minWidth="600px"
          header={
            <thead className="bg-[#071122]/90 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 text-center">Pos.</th>
                <th className="px-5 py-4 text-left">Squadra</th>
                <th className="px-5 py-4 text-center">Rating</th>
                <th className="px-5 py-4 text-center">Ultima variazione</th>
              </tr>
            </thead>
          }
          rows={ranking.map((r, index) => {
            const variazione = r.storico[0]?.variazione ?? null;
            const immagine = r.squadra.stemma;

            return (
              <tr key={r.id} className="transition hover:bg-amber-300/5">
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                    index === 0 ? "bg-yellow-500/20 text-yellow-300" :
                    index === 1 ? "bg-zinc-400/20 text-zinc-200" :
                    index === 2 ? "bg-orange-500/20 text-orange-300" : "text-slate-400"
                  }`}>{index + 1}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {immagine ? <img src={immagine} alt={r.squadra.nome} className="h-9 w-9 shrink-0 object-contain" /> :
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800">⚽</div>}
                    <span className="font-bold">{r.squadra.nome}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-center"><span className="text-xl font-black text-sky-400">{r.rating}</span></td>
                <td className="px-5 py-4 text-center">
                  {variazione === null ? <span className="text-slate-500">—</span> :
                    <span className={`font-black ${variazione > 0 ? "text-emerald-400" : variazione < 0 ? "text-red-400" : "text-slate-400"}`}>
                      {variazione > 0 ? "+" : ""}{variazione}
                    </span>}
                </td>
              </tr>
            );
          })}
        />
      )}
    </section>
  );
}

export default async function StatistichePage() {
  const [tornei, rankingSquadreRaw] = await Promise.all([
    prisma.torneo.findMany({
      orderBy: [{ anno: "desc" }, { id: "desc" }],
      include: {
        partite: {
          where: { Completata: true },
          include: {
            squadraCasa: true,
            squadraOspite: true,
            gol: {
              where: {
                tipo: { not: "AUTOGOL" },
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
        trofei: {
          include: {
            squadraVincitrice: true,
            calciatoreVincitore: {
              include: {
                calciatore: true,
                squadra: true,
              },
            },
          },
        },
      },
    }),

    prisma.rankingSquadra.findMany({
      include: {
        squadra: true,
        storico: {
          orderBy: [{ creatoIl: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
    }),
  ]);

  // =========================================================
  // RANKING
  // =========================================================

  const rankingSquadre = rankingSquadreRaw as unknown as RigaRanking[];

  const ordinaRanking = (a: RigaRanking, b: RigaRanking) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    return a.squadra.nome.localeCompare(b.squadra.nome);
  };

  const rankingNazionali = rankingSquadre
    .filter((r) => r.tipo === "NAZIONALE")
    .sort(ordinaRanking);

  const rankingClub = rankingSquadre
    .filter((r) => r.tipo === "CLUB")
    .sort(ordinaRanking);

  
const rankingMisto = rankingSquadre
  .filter((r) => r.tipo === "MISTO")
  .sort(ordinaRanking);

  // =========================================================
  // CONTATORI GENERALI
  // =========================================================

  let partiteTotali = 0;
  let golTotali = 0;
  let vittorieTotali = 0;
  let pareggiTotali = 0;

  // =========================================================
  // STATISTICHE SQUADRE E GIOCATORI
  // =========================================================

  const squadreMap = new Map<number, StatSquadra>();
  const giocatoriMap = new Map<number, StatGiocatore>();
  const recordPartite: PartitaRecord[] = [];

  const vittorieTornei = new Map<
    number,
    {
      id: number;
      nome: string;
      stemma: string | null;
      vittorie: number;
    }
  >();

  // =========================================================
  // ELABORAZIONE TORNEI
  // =========================================================

  for (const torneo of tornei) {
    for (const partita of torneo.partite) {
      if (
        partita.SquadraCasaId === null ||
        partita.SquadraOspiteId === null ||
        partita.GolCasa === null ||
        partita.GolOspite === null ||
        !partita.squadraCasa ||
        !partita.squadraOspite
      ) {
        continue;
      }

      partiteTotali += 1;

      const golCasa = partita.GolCasa;
      const golOspite = partita.GolOspite;
      const totaleGol = golCasa + golOspite;
      const scarto = Math.abs(golCasa - golOspite);

      golTotali += totaleGol;

      if (golCasa === golOspite) {
        pareggiTotali += 1;
      } else {
        vittorieTotali += 1;
      }

      // CASA
      let casa = squadreMap.get(partita.SquadraCasaId);

      if (!casa) {
        casa = {
          id: partita.SquadraCasaId,
          nome: partita.squadraCasa.nome,
          tipo: partita.squadraCasa.tipo,
          stemma: partita.squadraCasa.stemma,
          partite: 0,
          vittorie: 0,
          pareggi: 0,
          sconfitte: 0,
          golFatti: 0,
          golSubiti: 0,
          differenzaReti: 0,
        };

        squadreMap.set(partita.SquadraCasaId, casa);
      }

      casa.partite += 1;
      casa.golFatti += golCasa;
      casa.golSubiti += golOspite;

      // OSPITE
      let ospite = squadreMap.get(partita.SquadraOspiteId);

      if (!ospite) {
        ospite = {
          id: partita.SquadraOspiteId,
          nome: partita.squadraOspite.nome,
          tipo: partita.squadraOspite.tipo,
          stemma: partita.squadraOspite.stemma,
          partite: 0,
          vittorie: 0,
          pareggi: 0,
          sconfitte: 0,
          golFatti: 0,
          golSubiti: 0,
          differenzaReti: 0,
        };

        squadreMap.set(partita.SquadraOspiteId, ospite);
      }

      ospite.partite += 1;
      ospite.golFatti += golOspite;
      ospite.golSubiti += golCasa;

    
      // RISULTATO
      // Se la partita è stata decisa ai rigori, assegniamo vittoria
      // e sconfitta in base al risultato dei rigori.
      // Gol fatti, gol subiti e differenza reti restano invariati.
      if (
        partita.AiRigori &&
        partita.RigoriCasa !== null &&
        partita.RigoriOspite !== null &&
        partita.RigoriCasa !== partita.RigoriOspite
      ) {
        if (partita.RigoriCasa > partita.RigoriOspite) {
          casa.vittorie += 1;
          ospite.sconfitte += 1;
        } else {
          ospite.vittorie += 1;
          casa.sconfitte += 1;
        }
      } else if (golCasa > golOspite) {
        casa.vittorie += 1;
        ospite.sconfitte += 1;
      } else if (golCasa < golOspite) {
        ospite.vittorie += 1;
        casa.sconfitte += 1;
      } else {
        casa.pareggi += 1;
        ospite.pareggi += 1;
      }


      // RECORD PARTITA
      recordPartite.push({
        id: Number(partita.id),
        torneo: torneo.nome,
        torneoId: torneo.id,
        casa: partita.squadraCasa.nome,
        ospite: partita.squadraOspite.nome,
        golCasa,
        golOspite,
        totaleGol,
        scarto,
      });

      // MARCATORI
      for (const gol of partita.gol) {
        const calciatore = gol.calciatoreTorneo?.calciatore;
        const squadra = gol.calciatoreTorneo?.squadra;

        if (!calciatore) continue;

        let giocatore = giocatoriMap.get(calciatore.id);

        if (!giocatore) {
          giocatore = {
            id: calciatore.id,
            nome: calciatore.nome,
            gol: 0,
            squadre: [],
          };

          giocatoriMap.set(calciatore.id, giocatore);
        }

        giocatore.gol += 1;

        if (squadra && !giocatore.squadre.includes(squadra.nome)) {
          giocatore.squadre.push(squadra.nome);
        }
      }
    }

    // VINCITORE TORNEO
    const trofeoVincitore = torneo.trofei.find(
      (trofeo) => trofeo.tipo === "VINCITORE_TORNEO"
    );

    if (trofeoVincitore?.squadraVincitrice) {
      const squadra = trofeoVincitore.squadraVincitrice;
      const esistente = vittorieTornei.get(squadra.id);

      if (esistente) {
        esistente.vittorie += 1;
      } else {
        vittorieTornei.set(squadra.id, {
          id: squadra.id,
          nome: squadra.nome,
          stemma: squadra.stemma,
          vittorie: 1,
        });
      }
    }
  }

  // =========================================================
  // FINALIZZAZIONE STATISTICHE
  // =========================================================

  const squadre = Array.from(squadreMap.values()).map((squadra) => ({
    ...squadra,
    differenzaReti: squadra.golFatti - squadra.golSubiti,
    percentualeVittorie: squadra.partite > 0 ? (squadra.vittorie / squadra.partite) * 100 : 0,
  }));

  const miglioriSquadre = [...squadre].sort((a, b) => {
    if (b.vittorie !== a.vittorie) return b.vittorie - a.vittorie;
    if (b.differenzaReti !== a.differenzaReti) {
      return b.differenzaReti - a.differenzaReti;
    }
    return b.golFatti - a.golFatti;
  });

  const classificaPercentuale = (lista: typeof squadre) => [...lista].sort((a, b) => {
    if (b.percentualeVittorie !== a.percentualeVittorie) return b.percentualeVittorie - a.percentualeVittorie;
    if (b.partite !== a.partite) return b.partite - a.partite;
    return a.nome.localeCompare(b.nome);
  });

  const miglioriPercentuali = classificaPercentuale(squadre);
  const miglioriPercentualiNazionali = classificaPercentuale(
    squadre.filter((s) => s.tipo.toLowerCase().includes("naz"))
  );
  const miglioriPercentualiClub = classificaPercentuale(
    squadre.filter((s) => s.tipo.toLowerCase().includes("club"))
  );

  const miglioriAttacchi = [...squadre].sort((a, b) => {
    if (b.golFatti !== a.golFatti) return b.golFatti - a.golFatti;
    return b.differenzaReti - a.differenzaReti;
  });

  const miglioriDifese = [...squadre].sort((a, b) => {
    if (a.golSubiti !== b.golSubiti) return a.golSubiti - b.golSubiti;
    return b.differenzaReti - a.differenzaReti;
  });

  const marcatori = Array.from(giocatoriMap.values()).sort((a, b) => {
    if (b.gol !== a.gol) return b.gol - a.gol;
    return a.nome.localeCompare(b.nome);
  });

  const partitaConPiuGol =
    [...recordPartite].sort((a, b) => b.totaleGol - a.totaleGol)[0] ??
    null;

  const vittoriaConMaggiorScarto =
    recordPartite
      .filter((partita) => partita.scarto > 0)
      .sort((a, b) => b.scarto - a.scarto)[0] ?? null;

  const partitaConPiuGolCasa =
    recordPartite
      .filter((partita) => partita.golCasa > partita.golOspite)
      .sort((a, b) => b.golCasa - a.golCasa)[0] ?? null;

  const alboDOro = Array.from(vittorieTornei.values()).sort((a, b) => {
    if (b.vittorie !== a.vittorie) return b.vittorie - a.vittorie;
    return a.nome.localeCompare(b.nome);
  });

  const mediaGol =
    partiteTotali > 0 ? (golTotali / partiteTotali).toFixed(2) : "0.00";

  // =========================================================
  // PAGINA
  // =========================================================

  return (
    <main className="min-h-screen overflow-hidden bg-[#060c19] text-white">
      {/* HERO — PAZZI ANALYTICS CENTER */}
      <header className="relative isolate overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,rgba(217,167,66,.20),transparent_42%),radial-gradient(ellipse_at_10%_90%,rgba(29,103,183,.26),transparent_48%),linear-gradient(135deg,#0d1b34_0%,#050b17_70%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full border border-amber-400/15 shadow-[0_0_100px_rgba(245,158,11,.08)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 sm:pb-20 sm:pt-14">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300">
            <span aria-hidden="true">←</span> Torna alla home
          </Link>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" /> PazziTournament / Intelligence</span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Archivio storico • Dati reali</span>
          </div>
          <h1 className="mt-6 max-w-5xl text-5xl font-black uppercase leading-[0.98] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            PAZZI <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">ANALYTICS.</span>
          </h1>
          <div className="mt-7 flex flex-col gap-5 border-l-2 border-amber-400/70 pl-5 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">Ogni partita lascia un segno. Scopri i numeri, i primati e le leggende che hanno scritto la storia dei vostri tornei.</p>
            <span className="shrink-0 text-xs font-black uppercase tracking-[0.2em] text-amber-400/80">The numbers never lie / 001</span>
          </div>
        </div>
      </header>

<div className="relative mx-auto max-w-7xl space-y-4 px-6 py-14 sm:py-20">
        {/* PANORAMICA */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-400">
              Panoramica
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">🌍 Numeri globali</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-sm text-slate-500">🏆 Tornei</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-amber-400">
                {tornei.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Tornei presenti nell&apos;archivio
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-sm text-slate-500">⚽ Partite</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-sky-400">
                {partiteTotali}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Partite con risultato registrato
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-sm text-slate-500">🥅 Gol</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-emerald-400">
                {golTotali}
              </p>
              <p className="mt-2 text-sm text-slate-500">Gol registrati</p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-sm text-slate-500">📈 Media gol</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-violet-400">
                {mediaGol}
              </p>
              <p className="mt-2 text-sm text-slate-500">Gol per partita</p>
            </div>
          </div>
        </section>

        {/* RANKING */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
              Classifiche ufficiali
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              📈 Ranking PazziTournament
            </h2>
            <p className="mt-2 max-w-3xl text-slate-400">
              Classifiche nazionali, club e ranking misto. I punteggi vengono
              letti dal database e non sono ricalcolati da questa pagina.
            </p>
          </div>

          <TabellaRanking
            titolo="🌍 Ranking Nazionale"
            descrizione="Classifica riservata alle squadre nazionali."
            ranking={rankingNazionali}
          />

          <TabellaRanking
            titolo="🏟️ Ranking Club"
            descrizione="Classifica riservata alle squadre di club."
            ranking={rankingClub}
          />

          <TabellaRanking
            titolo="🏆 Ranking Misto"
            descrizione="Un'unica classifica con nazionali e club."
            ranking={rankingMisto}
          />

          <RankingAllenatori />
        </section>
        <SerieGlobali />

        {/* MARCATORI */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
              Giocatori
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              ⚽ Capocannonieri di sempre
            </h2>
            <p className="mt-2 text-slate-400">
              La classifica globale dei marcatori considerando tutti i tornei.
            </p>
          </div>

          {marcatori.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-[#101b32] p-10 text-center">
              <p className="text-4xl">⚽</p>
              <p className="mt-4 text-lg font-bold">Nessun gol registrato</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101b32]/90 shadow-[0_20px_70px_rgba(0,0,0,.22)] backdrop-blur-xl">
              <MostraTutto
                initialCount={3}
                minWidth="650px"
                header={
                  <thead className="bg-[#071122]/90 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 text-center">#</th>
                      <th className="px-6 py-4 text-left">Giocatore</th>
                      <th className="px-6 py-4 text-left">Squadre</th>
                      <th className="px-6 py-4 text-center">Gol</th>
                    </tr>
                  </thead>
                }
                rows={marcatori.map((giocatore, index) => (
                  <tr key={giocatore.id} className="transition hover:bg-amber-300/5">
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${
                        index === 0 ? "bg-yellow-500/20 text-yellow-300" :
                        index === 1 ? "bg-zinc-400/20 text-zinc-200" :
                        index === 2 ? "bg-orange-500/20 text-orange-300" : "text-slate-400"
                      }`}>{index + 1}</span>
                    </td>
                    <td className="px-6 py-5 font-bold">{giocatore.nome}</td>
                    <td className="px-6 py-5 text-slate-400">{giocatore.squadre.join(" / ")}</td>
                    <td className="px-6 py-5 text-center"><span className="text-2xl font-black text-emerald-400">{giocatore.gol}</span></td>
                  </tr>
                ))}
              />
            </div>
          )}
        </section>

        {/* MIGLIORI SQUADRE */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-400">
              Squadre
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">🏟️ Migliori squadre</h2>
            <p className="mt-2 text-slate-400">
              Il rendimento storico considerando tutte le partite registrate.
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101b32]/90 shadow-[0_20px_70px_rgba(0,0,0,.22)] backdrop-blur-xl">
            <div className="overflow-x-auto">
              <MostraTutto
                initialCount={3}
                minWidth="950px"
                header={
                  <thead className="bg-[#071122]/90 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 text-center">#</th>
                      <th className="px-5 py-4 text-left">Squadra</th>
                      <th className="px-4 py-4 text-center">PG</th>
                      <th className="px-4 py-4 text-center">V</th>
                      <th className="px-4 py-4 text-center">% V</th>
                      <th className="px-4 py-4 text-center">N</th>
                      <th className="px-4 py-4 text-center">P</th>
                      <th className="px-4 py-4 text-center">GF</th>
                      <th className="px-4 py-4 text-center">GS</th>
                      <th className="px-4 py-4 text-center">DR</th>
                    </tr>
                  </thead>
                }
                rows={miglioriSquadre.map((squadra, index) => (
                  <tr key={squadra.id} className="transition hover:bg-amber-300/5">
                    <td className="px-5 py-5 text-center font-black text-slate-500">{index + 1}</td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        {squadra.stemma ? <img src={squadra.stemma} alt={squadra.nome} className="h-9 w-9 object-contain" /> :
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">⚽</div>}
                        <span className="font-bold">{squadra.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">{squadra.partite}</td>
                    <td className="px-4 py-5 text-center font-bold text-emerald-400">{squadra.vittorie}</td>
                    <td className="px-4 py-5 text-center font-bold text-blue-300">{squadra.percentualeVittorie.toFixed(1)}%</td>
                    <td className="px-4 py-5 text-center">{squadra.pareggi}</td>
                    <td className="px-4 py-5 text-center font-bold text-red-400">{squadra.sconfitte}</td>
                    <td className="px-4 py-5 text-center">{squadra.golFatti}</td>
                    <td className="px-4 py-5 text-center">{squadra.golSubiti}</td>
                    <td className="px-4 py-5 text-center font-bold">{squadra.differenzaReti > 0 ? `+${squadra.differenzaReti}` : squadra.differenzaReti}</td>
                  </tr>
                ))}
              />
            </div>
          </div>
        </section>

        {/* PERCENTUALI DI VITTORIA */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">Rendimento</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">📊 Percentuale di vittorie</h2>
            <p className="mt-2 text-slate-400">Classifiche calcolate sulle partite completate. A parità di percentuale, prevale chi ha disputato più partite.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { titolo: "Tutte le squadre", lista: miglioriPercentuali },
              { titolo: "Nazionali", lista: miglioriPercentualiNazionali },
              { titolo: "Club", lista: miglioriPercentualiClub },
            ].map(({ titolo, lista }) => (
              <div key={titolo} className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101b32]/90 shadow-[0_20px_70px_rgba(0,0,0,.22)] backdrop-blur-xl">
                <div className="border-b border-white/10 p-5"><h3 className="text-xl font-black">{titolo}</h3></div>
                {lista.length === 0 ? <p className="p-6 text-sm text-slate-500">Nessun dato disponibile.</p> :
                  <div className="divide-y divide-white/10">
                    {lista.slice(0, 10).map((squadra, index) => (
                      <div key={squadra.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 shrink-0 text-center text-sm font-black text-slate-500">{index + 1}</span>
                          {squadra.stemma ? <img src={squadra.stemma} alt={squadra.nome} className="h-8 w-8 shrink-0 object-contain" /> : <span>⚽</span>}
                          <div className="min-w-0"><p className="truncate font-bold">{squadra.nome}</p><p className="text-xs text-slate-500">{squadra.vittorie} vittorie su {squadra.partite} partite</p></div>
                        </div>
                        <span className="shrink-0 text-lg font-black text-emerald-400">{squadra.percentualeVittorie.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>}
              </div>
            ))}
          </div>
        </section>

        {/* ATTACCO E DIFESA */}
        <section className="mb-20 scroll-mt-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                ⚔️ Miglior attacco storico
              </p>
              <h3 className="mt-2 text-2xl font-black">Più gol segnati</h3>
              <div className="mt-6 space-y-3">
                {miglioriAttacchi.slice(0, 5).map((squadra, index) => (
                  <div
                    key={squadra.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080f20]/80 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-black text-slate-600">
                        {index + 1}
                      </span>
                      {squadra.stemma ? (
                        <img
                          src={squadra.stemma}
                          alt={squadra.nome}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <span>⚽</span>
                      )}
                      <span className="font-bold">{squadra.nome}</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-400">
                      {squadra.golFatti}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">
                🛡️ Miglior difesa storica
              </p>
              <h3 className="mt-2 text-2xl font-black">Meno gol subiti</h3>
              <div className="mt-6 space-y-3">
                {miglioriDifese.slice(0, 5).map((squadra, index) => (
                  <div
                    key={squadra.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080f20]/80 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-black text-slate-600">
                        {index + 1}
                      </span>
                      {squadra.stemma ? (
                        <img
                          src={squadra.stemma}
                          alt={squadra.nome}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <span>🛡️</span>
                      )}
                      <span className="font-bold">{squadra.nome}</span>
                    </div>
                    <span className="text-2xl font-black text-sky-400">
                      {squadra.golSubiti}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RECORD */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">
              Record
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              🔥 Record di PazziTournament
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
                🔥 Partita con più gol
              </p>
              {partitaConPiuGol ? (
                <>
                  <div className="mt-6 text-center">
                    <p className="font-bold">{partitaConPiuGol.casa}</p>
                    <p className="my-3 text-4xl font-black text-orange-400">
                      {partitaConPiuGol.golCasa} - {partitaConPiuGol.golOspite}
                    </p>
                    <p className="font-bold">{partitaConPiuGol.ospite}</p>
                  </div>
                  <div className="mt-5 border-t border-slate-800 pt-4 text-center">
                    <p className="text-3xl font-black">
                      {partitaConPiuGol.totaleGol}
                    </p>
                    <p className="text-xs text-slate-500">gol complessivi</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {partitaConPiuGol.torneo}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-slate-500">Nessun dato disponibile.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
                💥 Maggior scarto
              </p>
              {vittoriaConMaggiorScarto ? (
                <>
                  <div className="mt-6 text-center">
                    <p className="font-bold">{vittoriaConMaggiorScarto.casa}</p>
                    <p className="my-3 text-4xl font-black text-red-400">
                      {vittoriaConMaggiorScarto.golCasa} -{" "}
                      {vittoriaConMaggiorScarto.golOspite}
                    </p>
                    <p className="font-bold">{vittoriaConMaggiorScarto.ospite}</p>
                  </div>
                  <div className="mt-5 border-t border-slate-800 pt-4 text-center">
                    <p className="text-3xl font-black text-red-400">
                      {vittoriaConMaggiorScarto.scarto}
                    </p>
                    <p className="text-xs text-slate-500">gol di scarto</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {vittoriaConMaggiorScarto.torneo}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-slate-500">Nessun dato disponibile.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                🏠 Più gol segnati
              </p>
              {partitaConPiuGolCasa ? (
                <>
                  <div className="mt-6 text-center">
                    <p className="font-bold">{partitaConPiuGolCasa.casa}</p>
                    <p className="my-3 text-4xl font-black text-amber-400">
                      {partitaConPiuGolCasa.golCasa} -{" "}
                      {partitaConPiuGolCasa.golOspite}
                    </p>
                    <p className="font-bold">{partitaConPiuGolCasa.ospite}</p>
                  </div>
                  <p className="mt-5 border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
                    {partitaConPiuGolCasa.torneo}
                  </p>
                </>
              ) : (
                <p className="mt-6 text-slate-500">Nessun dato disponibile.</p>
              )}
            </div>
          </div>
        </section>

        {/* ALBO D'ORO */}
        <section className="mb-20 scroll-mt-24">
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
              Storia
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">🏆 Albo d&apos;oro globale</h2>
            <p className="mt-2 text-slate-400">
              Le squadre che hanno conquistato più tornei nella storia di
              PazziTournament.
            </p>
          </div>

          {alboDOro.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-[#101b32] p-10 text-center">
              <p className="text-lg font-bold">
                Nessun torneo concluso con vincitore
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alboDOro.slice(0, 12).map((squadra, index) => (
                <div
                  key={squadra.id}
                  className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172743] to-[#0c1426] p-6 shadow-[0_20px_70px_rgba(0,0,0,.22)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/30"
                >
                  {index < 3 && (
                    <div className="absolute right-4 top-4 text-2xl">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {squadra.stemma ? (
                      <img
                        src={squadra.stemma}
                        alt={squadra.nome}
                        className="h-14 w-14 object-contain"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                        🏆
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                        Posizione {index + 1}
                      </p>
                      <h3 className="mt-1 text-xl font-black">{squadra.nome}</h3>
                      <p className="mt-1 text-sm text-amber-400">
                        {squadra.vittorie}{" "}
                        {squadra.vittorie === 1 ? "titolo" : "titoli"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ARCHIVIO TORNEI */}
        <section>
          <div className="mb-9">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
              Archivio
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">📚 Tornei analizzati</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tornei.map((torneo) => {
              const completate = torneo.partite.length;

              const gol = torneo.partite.reduce(
                (totale, partita) =>
                  totale +
                  (partita.GolCasa ?? 0) +
                  (partita.GolOspite ?? 0),
                0
              );

              return (
                <Link
                  key={torneo.id}
                  href={`/tornei/${torneo.id}`}
                  className="group rounded-3xl border border-slate-800 bg-slate-900 p-6 transition duration-300 hover:-translate-y-1 hover:border-green-500 hover:bg-slate-900/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                        {torneo.anno}
                      </p>
                      <h3 className="mt-2 text-xl font-black">
                        🏆 {torneo.nome}
                      </h3>
                    </div>
                    <span className="text-slate-600 transition group-hover:text-emerald-400">
                      →
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/5 bg-[#080f20] p-4">
                      <p className="text-xs text-slate-500">Partite</p>
                      <p className="mt-1 text-xl font-black">{completate}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-[#080f20] p-4">
                      <p className="text-xs text-slate-500">Gol</p>
                      <p className="mt-1 text-xl font-black text-emerald-400">
                        {gol}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}