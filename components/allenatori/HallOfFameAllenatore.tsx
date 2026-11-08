import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { partecipanteId: number };

type Categoria = "titolo" | "personale" | "calciatore";

const NOMI: Record<string, string> = {
  VINCITORE_TORNEO: "Campione",
  MIGLIOR_MARCATORE: "Capocannoniere",
  MIGLIOR_ASSISTMAN: "Miglior assistman",
  MIGLIOR_PORTIERE: "Miglior portiere",
  MVP: "Miglior giocatore",
  SQUADRA_SORPRESA: "Premio sorpresa",
  MIGLIOR_MOMENTO: "Miglior momento",
};

function immaginePremio(tipo: string): string | null {
  switch (tipo) {
    case "MIGLIOR_MARCATORE": return "/trofei/trofeo-capocannoniere.png";
    case "MIGLIOR_PORTIERE": return "/trofei/miglior-portiere.png";
    case "MIGLIOR_ASSISTMAN": return "/trofei/miglior-assistman.png";
    case "SQUADRA_SORPRESA": return "/trofei/premio-sorpresa.png";
    case "MIGLIOR_MOMENTO": return "/trofei/miglior-momento.png";
    case "MVP": return null; // Nessuna fotografia originale MVP verificata
    default: return null;
  }
}

function immagineCompetizione(nome: string, tipo: string) {
  const testo = `${nome} ${tipo}`.toLocaleLowerCase("it").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/africa|african|caf/.test(testo)) return "/trofei/coppa-africa.png";
  if (/copa america|coppa america|sudamerica|conmebol/.test(testo)) return "/trofei/copa-america.png";
  if (/asia|asian|afc/.test(testo)) return "/trofei/coppa-asia.png";
  if (/club/.test(testo)) return "/trofei/mondiale-club.png";
  if (/euro|europeo|uefa/.test(testo)) return "/trofei/europeo.png";
  return "/trofei/mondiale-nazioni.png";
}

type Premio = {
  id: string;
  categoria: Categoria;
  tipo: string;
  torneoId: number;
  torneoNome: string;
  anno: number;
  squadra: string | null;
  calciatore: string | null;
  immagine: string | null;
  nota: string | null;
};

function Ripiano({ titolo, sottotitolo, premi, tono }: {
  titolo: string; sottotitolo: string; premi: Premio[]; tono: "oro" | "viola" | "azzurro";
}) {
  const colore = tono === "oro" ? "text-amber-300" : tono === "viola" ? "text-violet-300" : "text-cyan-300";
  const bagliore = tono === "oro" ? "rgba(251,191,36,.16)" : tono === "viola" ? "rgba(167,139,250,.15)" : "rgba(34,211,238,.13)";
  return (
    <section className="relative mt-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 px-2">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[.38em] ${colore}`}>Collezione ufficiale</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{titolo}</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{sottotitolo}</p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold tracking-widest text-slate-200">{premi.length} {premi.length === 1 ? "TROFEO" : "TROFEI"}</span>
      </div>
      <div className="relative overflow-hidden rounded-[30px] border border-amber-200/15 bg-[#0b0b0d] shadow-[inset_0_0_75px_rgba(0,0,0,.95),0_25px_65px_rgba(0,0,0,.4)]">
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(ellipse at 50% 0%, ${bagliore}, transparent 68%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-amber-200/20 to-transparent" />
        <div className="relative grid grid-cols-1 gap-x-2 gap-y-0 px-4 pt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:px-6">
          {premi.length === 0 ? (
            <div className="col-span-full flex min-h-44 flex-col items-center justify-center pb-10 text-center">
              <span className="text-4xl opacity-35">🏆</span>
              <p className="mt-3 text-sm text-slate-500">Questo ripiano attende il suo primo trofeo.</p>
            </div>
          ) : premi.map((premio) => (
            <Link key={premio.id} href={`/tornei/${premio.torneoId}`} className="group relative flex min-h-[340px] flex-col items-center justify-end px-3 pb-9 text-center outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              <div className="pointer-events-none absolute left-1/2 top-3 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-300/0 blur-3xl transition-all duration-700 group-hover:bg-amber-300/20" />
              <div className="absolute right-2 top-0 rounded-md border border-amber-200/15 bg-black/50 px-2 py-1 text-xs font-black text-amber-200/90">{premio.anno}</div>
              <div className="relative flex h-44 w-full items-end justify-center pb-2 transition-transform duration-700 ease-out group-hover:-translate-y-3 group-hover:scale-110">
                {premio.immagine ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={premio.immagine} alt={`Trofeo ${premio.torneoNome}`} className="max-h-full max-w-[88%] object-contain drop-shadow-[0_15px_16px_rgba(0,0,0,.9)]" />
                ) : (
                  <span aria-label="Premio in attesa della fotografia originale" className="flex h-28 w-28 items-center justify-center rounded-full border border-amber-300/25 bg-gradient-to-br from-amber-200/15 to-slate-900 text-6xl shadow-[0_12px_35px_rgba(0,0,0,.7)]">{premio.categoria === "calciatore" ? "🥇" : "🌟"}</span>
                )}
              </div>
              <div className="relative z-10 mt-1 w-full rounded-md border border-amber-300/20 bg-gradient-to-b from-[#4a3922] via-[#251c13] to-[#100e0b] px-2 py-3 shadow-[0_8px_15px_rgba(0,0,0,.8)]">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{NOMI[premio.tipo] ?? premio.tipo.replaceAll("_", " ")}</p>
                <h4 className="mt-1 line-clamp-2 text-sm font-extrabold text-white group-hover:text-amber-200">{premio.torneoNome}</h4>
                {premio.calciatore && <p className="mt-1 text-xs font-semibold text-cyan-200">{premio.calciatore}</p>}
                {premio.squadra && <p className="mt-1 text-xs text-slate-300">{premio.squadra}</p>}
                {premio.nota && <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{premio.nota}</p>}
              </div>
              <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/0 transition-colors group-hover:text-amber-200">Apri il torneo ↗</span>
            </Link>
          ))}
        </div>
        <div aria-hidden="true" className="relative h-6 border-y border-amber-200/25 bg-gradient-to-b from-[#80613b] via-[#3b291b] to-[#140f0b] shadow-[0_12px_25px_rgba(0,0,0,.95)]">
          <div className="absolute inset-x-0 top-0 h-px bg-amber-100/45" />
          <div className="absolute inset-x-0 bottom-0 h-2 bg-black/40" />
        </div>
      </div>
    </section>
  );
}

export default async function HallOfFameAllenatore({ partecipanteId }: Props) {
  // Titoli e riconoscimenti intestati direttamente all'allenatore.
  const premiDiretti = await prisma.trofeo.findMany({
    where: { partecipanteVincitoreId: partecipanteId },
    include: { torneo: true, squadraVincitrice: true },
  });

  // Le partecipazioni individuano le squadre allenate nei rispettivi tornei.
  const partecipazioni = await prisma.partecipazione.findMany({
    where: { partecipanteId },
    select: { torneoId: true, squadraId: true },
  });
  const chiavi = new Set(partecipazioni.map((p) => `${p.torneoId}:${p.squadraId}`));
  const torneiIds = [...new Set(partecipazioni.map((p) => p.torneoId))];

  const premiCalciatori = torneiIds.length
    ? await prisma.trofeo.findMany({
        where: {
          torneoId: { in: torneiIds },
          tipo: { in: ["MIGLIOR_MARCATORE", "MIGLIOR_ASSISTMAN", "MIGLIOR_PORTIERE", "MVP"] },
        },
        include: {
          torneo: true,
          calciatoreVincitore: { include: { calciatore: true, squadra: true } },
          calciatoriVincitori: {
            include: {
              calciatoreTorneo: { include: { calciatore: true, squadra: true } },
            },
          },
        },
      })
    : [];

  const titoli: Premio[] = [];
  const personali: Premio[] = [];
  const calciatori: Premio[] = [];

  for (const premio of premiDiretti) {
    const comune = {
      id: `diretto-${premio.id}`,
      tipo: premio.tipo,
      torneoId: premio.torneoId,
      torneoNome: premio.torneo.nome,
      anno: premio.torneo.anno,
      squadra: premio.squadraVincitrice?.nome ?? null,
      calciatore: null,
      nota: premio.nota,
    };
    if (premio.tipo === "VINCITORE_TORNEO") {
      titoli.push({
        ...comune,
        categoria: "titolo",
        immagine: immagineCompetizione(premio.torneo.nome, premio.torneo.tipo),
      });
    } else if (premio.tipo === "MIGLIOR_MOMENTO" || premio.tipo === "SQUADRA_SORPRESA" || premio.tipo === "MVP") {
      personali.push({ ...comune, categoria: "personale", immagine: immaginePremio(premio.tipo) });
    }
  }

  for (const premio of premiCalciatori) {
    // Un vincitore può essere registrato sia nel campo singolo sia nella tabella ex aequo.
    // La mappa evita di mostrarlo due volte.
    const vincitori = new Map<number, NonNullable<typeof premio.calciatoreVincitore>>();
    if (premio.calciatoreVincitore) {
      vincitori.set(premio.calciatoreVincitore.id, premio.calciatoreVincitore);
    }
    for (const riga of premio.calciatoriVincitori) {
      vincitori.set(riga.calciatoreTorneo.id, riga.calciatoreTorneo);
    }
    for (const vincitore of vincitori.values()) {
      if (!chiavi.has(`${premio.torneoId}:${vincitore.squadraId}`)) continue;
      calciatori.push({
        id: `calciatore-${premio.id}-${vincitore.id}`,
        categoria: "calciatore",
        tipo: premio.tipo,
        torneoId: premio.torneoId,
        torneoNome: premio.torneo.nome,
        anno: premio.torneo.anno,
        squadra: vincitore.squadra.nome,
        calciatore: vincitore.calciatore.nome,
        immagine: immaginePremio(premio.tipo),
        nota: premio.nota,
      });
    }
  }

  const ordina = (a: Premio, b: Premio) => b.anno - a.anno || b.torneoId - a.torneoId;
  titoli.sort(ordina);
  personali.sort(ordina);
  calciatori.sort(ordina);

  return (
    <section id="hall-of-fame" className="relative mb-20 overflow-hidden rounded-[38px] border border-amber-300/20 bg-[#08090c] px-4 py-10 text-white shadow-[0_35px_110px_rgba(0,0,0,.65)] sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent 0,transparent 95px,rgba(255,255,255,.025) 96px)" }} />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[80%] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[110px]" />
      <div className="relative">
        <div className="border-b border-amber-200/15 pb-9 text-center">
          <p className="text-xs font-black uppercase tracking-[.42em] text-amber-300">PazziTournament · Trophy Room</p>
          <h2 className="mt-4 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-700 bg-clip-text text-4xl font-black uppercase tracking-tight text-transparent sm:text-6xl">La sala dei trofei</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Ogni coppa racconta una vittoria. Ogni targhetta conserva il nome di chi l’ha conquistata.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-5 py-3"><span className="text-2xl font-black text-amber-200">{titoli.length}</span><span className="ml-3 text-xs font-bold uppercase tracking-widest text-slate-300">Coppe vinte</span></div>
            <div className="rounded-xl border border-violet-300/25 bg-violet-300/10 px-5 py-3"><span className="text-2xl font-black text-violet-200">{personali.length}</span><span className="ml-3 text-xs font-bold uppercase tracking-widest text-slate-300">Premi personali</span></div>
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3"><span className="text-2xl font-black text-cyan-200">{calciatori.length}</span><span className="ml-3 text-xs font-bold uppercase tracking-widest text-slate-300">Premi dei calciatori</span></div>
          </div>
        </div>
        <Ripiano titolo="Le coppe dei campioni" sottotitolo="Titoli ufficiali conquistati alla guida della squadra vincitrice." premi={titoli} tono="oro" />
        <Ripiano titolo="I riconoscimenti personali" sottotitolo="Premi assegnati direttamente all’allenatore: Miglior momento e Premio sorpresa." premi={personali} tono="viola" />
        <Ripiano titolo="I talenti premiati" sottotitolo="Riconoscimenti conquistati dai calciatori delle squadre allenate. Non vengono conteggiati come titoli personali." premi={calciatori} tono="azzurro" />
        <p className="mt-8 text-center text-xs text-slate-500">Fotografie originali dei vostri trofei. I premi senza fotografia restano temporaneamente rappresentati da un simbolo.</p>
      </div>
    </section>
  );
}
