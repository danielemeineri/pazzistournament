import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import Link from "next/link";
import ListaSquadre from "@/components/ListaSquadre";
import AtlanteSquadre from "@/components/AtlanteSquadre";

// @ts-ignore - Il pacchetto espone i dati dei Paesi senza tipi completi.
import countriesData from "world-countries";

type PaeseCatalogo = {
  cca3: string;
  ccn3: string;
  name: {
    common: string;
    official: string;
  };
  translations?: {
    ita?: {
      common: string;
      official: string;
    };
  };
  region?: string;
  subregion?: string;
};

type AllenatoreConteggio = {
  id: number;
  nome: string;
  partecipazioni: number;
};

type PaeseAtlante = {
  codice: string;
  nome: string;
  continente: string;
  allenatori: AllenatoreConteggio[];
  leaders: AllenatoreConteggio[];
  totale: number;
};

type SquadraAtlante = {
  nome: string;
  partecipazioni: {
    torneoId: number;
    partecipanteId: number | null;
    partecipante: {
      nome: string;
    } | null;
  }[];
};

function normalizza(testo: string) {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ricavaContinente(paese: PaeseCatalogo): string {
  const regione = paese.region ?? "";
  const sottoregione = paese.subregion ?? "";

  if (regione === "Europe") return "Europe";
  if (regione === "Asia") return "Asia";
  if (regione === "Africa") return "Africa";
  if (regione === "Oceania") return "Oceania";

  if (regione === "Americas") {
    if (sottoregione === "South America") {
      return "South America";
    }

    return "North America";
  }

  if (regione === "Antarctic") return "Antarctica";

  return "Other";
}

// Territori del Regno Unito separati nell'atlante.
// I codici sono interni all'atlante e non richiedono modifiche al database.
const NAZIONI_BRITANNICHE: Record<
  string,
  {
    codice: string;
    nome: string;
  }
> = {
  inghilterra: {
    codice: "GB-ENG",
    nome: "Inghilterra",
  },
  scozia: {
    codice: "GB-SCT",
    nome: "Scozia",
  },
  galles: {
    codice: "GB-WLS",
    nome: "Galles",
  },
  "irlanda del nord": {
    codice: "GB-NIR",
    nome: "Irlanda del Nord",
  },
};

function costruisciAtlante(
  squadre: SquadraAtlante[]
): PaeseAtlante[] {
  const catalogo = countriesData as unknown as PaeseCatalogo[];

  const paesePerNome = new Map<string, PaeseCatalogo>();
  const paesePerCodice = new Map<string, PaeseCatalogo>();

  for (const paese of catalogo) {
    if (!paese.ccn3 || !paese.cca3) continue;

    paesePerCodice.set(paese.cca3, paese);

    paesePerNome.set(normalizza(paese.name.common), paese);
    paesePerNome.set(normalizza(paese.name.official), paese);

    const nomeItaliano = paese.translations?.ita?.common;

    if (nomeItaliano) {
      paesePerNome.set(normalizza(nomeItaliano), paese);
    }

    const nomeItalianoUfficiale = paese.translations?.ita?.official;

    if (nomeItalianoUfficiale) {
      paesePerNome.set(normalizza(nomeItalianoUfficiale), paese);
    }
  }

  const alias: Record<string, string> = {
    usa: "USA",
    "stati uniti": "USA",
    "stati uniti d america": "USA",
    america: "USA",

    "corea del sud": "KOR",
    "corea del nord": "PRK",

    "costa d avorio": "CIV",
    "repubblica ceca": "CZE",
    "paesi bassi": "NLD",
    olanda: "NLD",

    "emirati arabi": "ARE",
    "emirati arabi uniti": "ARE",

    "nuova zelanda": "NZL",
    "macedonia del nord": "MKD",

    "arabia saudita": "SAU",
    "sud africa": "ZAF",
    "capo verde": "CPV",
    "burkina faso": "BFA",
    "guinea equatoriale": "GNQ",
    "repubblica democratica del congo": "COD",
    "congo dr": "COD",
    congo: "COG",

    iran: "IRN",
    cina: "CHN",
    russia: "RUS",
    turchia: "TUR",
    vietnam: "VNM",
    bolivia: "BOL",
    venezuela: "VEN",
    paraguay: "PRY",
    uruguay: "URY",
    messico: "MEX",
    brasile: "BRA",
    argentina: "ARG",
    giappone: "JPN",
  };

  const conteggi = new Map<
    string,
    {
      nome: string;
      paese: PaeseCatalogo;
      allenatori: Map<number, AllenatoreConteggio>;
    }
  >();

  const partecipazioniGiaContate = new Set<string>();

  for (const squadra of squadre) {
    const nomeNormalizzato = normalizza(squadra.nome);

    // Prima controlliamo se la squadra appartiene
    // a una delle quattro nazioni britanniche.
    const nazioneBritannica =
      NAZIONI_BRITANNICHE[nomeNormalizzato];

    let paese: PaeseCatalogo | undefined;
    let codice: string;
    let nomePaese: string;

    if (nazioneBritannica) {
      // Per i territori britannici utilizziamo
      // il Regno Unito come riferimento geografico,
      // ma manteniamo codici e conteggi indipendenti.
      paese = paesePerCodice.get("GBR");

      if (!paese) continue;

      codice = nazioneBritannica.codice;
      nomePaese = nazioneBritannica.nome;
    } else {
      paese = paesePerNome.get(nomeNormalizzato);

      if (!paese && alias[nomeNormalizzato]) {
        paese = paesePerCodice.get(alias[nomeNormalizzato]);
      }

      if (!paese || !paese.ccn3) continue;

      codice = paese.ccn3.padStart(3, "0");
      nomePaese =
        paese.translations?.ita?.common ??
        paese.name.common;
    }

    if (!conteggi.has(codice)) {
      conteggi.set(codice, {
        nome: nomePaese,
        paese,
        allenatori: new Map(),
      });
    }

    const datiPaese = conteggi.get(codice)!;

    for (const partecipazione of squadra.partecipazioni) {
      const partecipante = partecipazione.partecipante;

      if (
        !partecipante ||
        partecipazione.partecipanteId === null
      ) {
        continue;
      }

      const nomeAllenatore = partecipante.nome.trim();

      if (
        !nomeAllenatore ||
        normalizza(nomeAllenatore) === "cpu"
      ) {
        continue;
      }

      const chiave = [
        codice,
        partecipazione.torneoId,
        partecipazione.partecipanteId,
      ].join("|");

      if (partecipazioniGiaContate.has(chiave)) {
        continue;
      }

      partecipazioniGiaContate.add(chiave);

      const allenatoreEsistente = datiPaese.allenatori.get(
        partecipazione.partecipanteId
      );

      if (allenatoreEsistente) {
        allenatoreEsistente.partecipazioni++;
      } else {
        datiPaese.allenatori.set(
          partecipazione.partecipanteId,
          {
            id: partecipazione.partecipanteId,
            nome: nomeAllenatore,
            partecipazioni: 1,
          }
        );
      }
    }
  }

  const risultato: PaeseAtlante[] = [];

  for (const [codice, dati] of conteggi) {
    const allenatori = Array.from(
      dati.allenatori.values()
    ).sort(
      (a, b) =>
        b.partecipazioni - a.partecipazioni ||
        a.nome.localeCompare(b.nome, "it")
    );

    if (allenatori.length === 0) continue;

    const massimo = allenatori[0].partecipazioni;

    const leaders = allenatori.filter(
      (allenatore) => allenatore.partecipazioni === massimo
    );

    risultato.push({
      codice,
      nome: dati.nome,
      continente: ricavaContinente(dati.paese),
      allenatori,
      leaders,
      totale: allenatori.reduce(
        (somma, allenatore) =>
          somma + allenatore.partecipazioni,
        0
      ),
    });
  }

  return risultato;
}

export default async function SquadrePage() {
  const [admin, squadre, squadreNazionali] = await Promise.all([
    isAdmin(),

    prisma.squadra.findMany({
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        nazione: true,
        stemma: true,
      },
    }),

    prisma.squadra.findMany({
      where: {
        tipo: "Nazionale",
      },
      select: {
        nome: true,
        partecipazioni: {
          select: {
            torneoId: true,
            partecipanteId: true,
            partecipante: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const paesiAtlante = costruisciAtlante(squadreNazionali);
  const nazionali = squadre.filter((squadra) => squadra.tipo.toLowerCase() === "nazionale").length;
  const club = squadre.length - nazionali;
  const nazioniAtlante = paesiAtlante.length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070d19] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[850px] overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_15%,rgba(40,104,170,0.22),transparent_48%),radial-gradient(ellipse_at_15%_45%,rgba(184,143,79,0.12),transparent_45%)]" />
        <div className="squadre-grid absolute inset-0 opacity-40" />
        <div className="squadre-orbit absolute -right-40 top-0 h-[560px] w-[560px] rounded-full border border-[#d6b77d]/20" />
        <div className="squadre-orbit-reverse absolute -right-16 top-24 h-[350px] w-[350px] rounded-full border border-sky-400/20" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#070d19] to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-7 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-400 transition hover:text-white">
            <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
            Torna alla home
          </Link>
          <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#d6b77d]/75">PazziTournament / Squadre</span>
        </nav>

        <header className="relative pb-12 pt-16 sm:pb-16 sm:pt-24">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#e8c58b]" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#e8c58b]">Le protagoniste di ogni sfida</p>
          </div>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-4xl text-[clamp(3.3rem,8vw,7.8rem)] font-black leading-[0.94] tracking-[-0.075em]">
                Archivio<br /><span className="squadre-gradient-text">squadre.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Nazioni, club, rivalità e storie da ricordare. Esplora tutte le squadre che hanno scritto la storia dei nostri tornei.
              </p>
            </div>
            {admin && (
              <Link href="/squadre/nuova" className="inline-flex shrink-0 items-center justify-center gap-3 self-start rounded-2xl border border-[#efd09a]/40 bg-[#e8c58b] px-6 py-4 text-sm font-black text-[#101827] shadow-[0_12px_45px_rgba(232,197,139,0.2)] transition duration-300 hover:-translate-y-1 hover:bg-[#f5dab0] lg:self-end">
                <span className="text-xl">＋</span> Nuova squadra
              </Link>
            )}
          </div>
        </header>

        <section aria-label="Numeri dell'archivio" className="mb-20 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { label: "Squadre in archivio", valore: squadre.length, dettaglio: "Totale registrate" },
            { label: "Nazionali", valore: nazionali, dettaglio: "Rappresentative" },
            { label: "Altre squadre", valore: club, dettaglio: "Club e altre tipologie" },
            { label: "Nazioni nell'atlante", valore: nazioniAtlante, dettaglio: "Con partecipazioni" },
          ].map((statistica) => (
            <div key={statistica.label} className="squadre-stat group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#e8c58b]/35 sm:p-7">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8c58b]/45 to-transparent" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{statistica.label}</p>
              <p className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{statistica.valore}</p>
              <p className="mt-2 text-xs text-slate-500">{statistica.dettaglio}</p>
            </div>
          ))}
        </section>

        <section className="mb-20" aria-labelledby="atlante-heading">
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.27em] text-[#e8c58b]">Il mondo di PazziTournament</p>
              <h2 id="atlante-heading" className="text-3xl font-black tracking-tight sm:text-5xl">Atlante delle nazionali<span className="text-[#e8c58b]">.</span></h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Esplora la mappa e scopri quali allenatori hanno guidato le nazionali nelle diverse edizioni.</p>
            </div>
            <span className="w-fit rounded-full border border-sky-400/20 bg-sky-400/5 px-4 py-2 text-xs font-bold text-sky-200">Esplora il mondo</span>
          </div>
          <div className="squadre-panel relative overflow-hidden rounded-[30px] border border-sky-300/15 bg-[#101b2e] p-2 shadow-[0_25px_90px_rgba(0,0,0,0.3)] sm:p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-400/[0.06] to-transparent" />
            <div className="relative"><AtlanteSquadre paesi={paesiAtlante} /></div>
          </div>
        </section>

        <section aria-labelledby="archivio-heading">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.27em] text-[#e8c58b]">Tutte le protagoniste</p>
              <h2 id="archivio-heading" className="text-3xl font-black tracking-tight sm:text-5xl">Esplora le squadre<span className="text-[#e8c58b]">.</span></h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">Consulta gli stemmi, cerca una squadra e accedi alla sua storia.</p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
              <span className="h-2 w-2 rounded-full bg-[#e8c58b] shadow-[0_0_12px_rgba(232,197,139,.6)]" />
              {squadre.length} squadre
            </div>
          </div>
          <div className="squadre-panel relative rounded-[30px] border border-white/10 bg-[#0e192a]/85 p-3 shadow-[0_25px_90px_rgba(0,0,0,0.24)] sm:p-6">
            <ListaSquadre squadre={squadre} admin={admin} />
          </div>
        </section>

        <footer className="mt-20 border-t border-white/10 pt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#e8c58b]">← Torna alla home</Link>
        </footer>
      </div>

      <style>{`
        .squadre-grid { background-image:linear-gradient(rgba(148,163,184,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.055) 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(to bottom,black,transparent 90%); }
        .squadre-gradient-text { background:linear-gradient(110deg,#ffffff 0%,#f0d3a0 46%,#bc8d53 100%);-webkit-background-clip:text;background-clip:text;color:transparent; }
        .squadre-orbit { animation:squadre-spin 35s linear infinite;transform:rotate(25deg); }
        .squadre-orbit-reverse { animation:squadre-spin 28s linear infinite reverse;transform:rotate(25deg); }
        @keyframes squadre-spin { to { transform:rotate(385deg); } }
        @media (prefers-reduced-motion:reduce) { .squadre-orbit,.squadre-orbit-reverse { animation:none; } }
      `}</style>
    </main>
  );
}
