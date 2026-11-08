import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AtlanteCampioni from "@/components/AtlanteCampioni";
import AtlanteStorico, { type VincitoreStorico } from "@/components/AtlanteStorico";
// @ts-ignore - Il catalogo world-countries non espone tipi completi nel progetto.
import countriesData from "world-countries";

type PaeseCatalogo = {
  cca3: string;
  name: { common: string; official: string };
  translations?: { ita?: { common: string; official: string } };
};
function normalizzaPaese(testo: string) {
  return testo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT").replace(/['’]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
const ALIAS_PAESI: Record<string, string> = {
  "stati uniti": "USA", "usa": "USA", "messico": "MEX", "brasile": "BRA",
  "argentina": "ARG", "uruguay": "URY", "paraguay": "PRY", "colombia": "COL",
  "cile": "CHL", "peru": "PER", "ecuador": "ECU", "bolivia": "BOL",
  "venezuela": "VEN", "sudafrica": "ZAF", "sud africa": "ZAF",
  "costa d avorio": "CIV", "corea del sud": "KOR", "corea del nord": "PRK",
  "repubblica ceca": "CZE", "paesi bassi": "NLD", "olanda": "NLD",
  "russia": "RUS", "turchia": "TUR", "iran": "IRN", "tahiti": "PYF",
  "antille olandesi": "ANT", 
};
const PAESI = countriesData as PaeseCatalogo[];
const ISO_PER_NOME = new Map<string, string>();
const ISO_DISPONIBILI = new Set(["-99", "AFG", "AGO", "ALB", "ARE", "ARG", "ARM", "ATA", "ATF", "AUS", "AUT", "AZE", "BDI", "BEL", "BEN", "BFA", "BGD", "BGR", "BHS", "BIH", "BLR", "BLZ", "BOL", "BRA", "BRN", "BTN", "BWA", "CAF", "CAN", "CHE", "CHL", "CHN", "CIV", "CMR", "COD", "COG", "COL", "CRI", "CUB", "CYP", "CZE", "DEU", "DJI", "DNK", "DOM", "DZA", "ECU", "EGY", "ERI", "ESH", "ESP", "EST", "ETH", "FIN", "FJI", "FLK", "GAB", "GBR", "GEO", "GHA", "GIN", "GMB", "GNB", "GNQ", "GRC", "GRL", "GTM", "GUY", "HND", "HRV", "HTI", "HUN", "IDN", "IND", "IRL", "IRN", "IRQ", "ISL", "ISR", "ITA", "JAM", "JOR", "JPN", "KAZ", "KEN", "KGZ", "KHM", "KOR", "KWT", "LAO", "LBN", "LBR", "LBY", "LKA", "LSO", "LTU", "LUX", "LVA", "MAR", "MDA", "MDG", "MEX", "MKD", "MLI", "MMR", "MNE", "MNG", "MOZ", "MRT", "MWI", "MYS", "NAM", "NCL", "NER", "NGA", "NIC", "NLD", "NPL", "NZL", "OMN", "PAK", "PAN", "PER", "PHL", "PNG", "POL", "PRI", "PRK", "PRT", "PRY", "PSE", "QAT", "ROU", "RUS", "RWA", "SAU", "SDN", "SEN", "SLB", "SLE", "SLV", "SOM", "SRB", "SSD", "SUR", "SVK", "SVN", "SWE", "SWZ", "SYR", "TCD", "TGO", "THA", "TJK", "TKM", "TLS", "TTO", "TUN", "TUR", "TWN", "TZA", "UGA", "UKR", "URY", "USA", "UZB", "VEN", "VNM", "VUT", "YEM", "ZAF", "ZMB", "ZWE"]);
for (const paese of PAESI) {
  if (!paese.cca3) continue;
  for (const nome of [paese.name.common, paese.name.official, paese.translations?.ita?.common, paese.translations?.ita?.official]) {
    if (nome) ISO_PER_NOME.set(normalizzaPaese(nome), paese.cca3);
  }
}
for (const [nome, codice] of Object.entries(ALIAS_PAESI)) ISO_PER_NOME.set(nome, codice);
// Rappresentative regionali senza uno stato univoco non sono attribuite a un paese.
ISO_PER_NOME.delete("paesi baschi");
ISO_PER_NOME.delete("bretagna");


const TIPI_COMPETIZIONE = [
  "Mondiale per Nazioni",
  "Mondiale per Club",
  "Europeo",
  "Copa América",
  "Coppa d'Africa",
  "Coppa d'Asia",
] as const;

type Props = {
  searchParams: Promise<{ competizione?: string | string[] }>;
};

export default async function AlboDOroPage({ searchParams }: Props) {
  const params = await searchParams;
  const richiesta = typeof params.competizione === "string" ? params.competizione : "";
  const filtro = TIPI_COMPETIZIONE.find((tipo) => tipo === richiesta) ?? null;
  const titoloPagina = filtro ? `Albo d'oro — ${filtro}` : "Albo d'oro";

  const trofei = await prisma.trofeo.findMany({
    where: {
      tipo: "VINCITORE_TORNEO",
      squadraVincitriceId: {
        not: null,
      },
      ...(filtro ? { torneo: { tipo: filtro } } : {}),
    },
    include: {
      torneo: true,
      squadraVincitrice: true,
      partecipanteVincitore: { select: { id: true, nome: true } },
    },
    orderBy: [
      {
        torneo: {
          anno: "desc",
        },
      },
      {
        torneo: {
          nome: "asc",
        },
      },
    ],
  });

  // Se il trofeo non indica direttamente l'allenatore, usiamo la
  // partecipazione della squadra vincitrice in QUEL torneo.
  const partecipazioniVincitrici = await prisma.partecipazione.findMany({
    where: {
      OR: trofei.filter(t => t.squadraVincitriceId !== null).map(t => ({
        torneoId: t.torneoId,
        squadraId: t.squadraVincitriceId!,
      })),
    },
    select: {
      torneoId: true,
      squadraId: true,
      partecipante: { select: { id: true, nome: true } },
    },
  });
  const allenatoriPerTorneoSquadra = new Map(
    partecipazioniVincitrici.map(p => [`${p.torneoId}:${p.squadraId}`, p.partecipante] as const)
  );
  const allenatoreTrofeo = (trofeo: (typeof trofei)[number]) => {
    const diretto = trofeo.partecipanteVincitore;
    if (diretto && diretto.nome.trim().toLowerCase() !== "cpu") return diretto;
    const collegato = trofeo.squadraVincitriceId === null
      ? null
      : allenatoriPerTorneoSquadra.get(`${trofeo.torneoId}:${trofeo.squadraVincitriceId}`);
    return collegato && collegato.nome.trim().toLowerCase() !== "cpu" ? collegato : null;
  };
  // L'ultimo titolo di ogni tipo e' il campione in carica, non il vincitore dell'anno solare.
  const campioniPerTipo = new Map<string, (typeof trofei)[number]>();
  for (const trofeo of trofei) {
    const tipo = trofeo.torneo.tipo.trim();
    const attuale = campioniPerTipo.get(tipo);
    if (!attuale || trofeo.torneo.anno > attuale.torneo.anno ||
      (trofeo.torneo.anno === attuale.torneo.anno && trofeo.torneo.id > attuale.torneo.id)) {
      campioniPerTipo.set(tipo, trofeo);
    }
  }
  const campioniAtlante = TIPI_COMPETIZIONE.map(tipo => {
    const trofeo = campioniPerTipo.get(tipo);
    const allenatore = trofeo ? allenatoreTrofeo(trofeo) : null;
    return {
      tipo,
      anno: trofeo?.torneo.anno ?? null,
      squadraId: trofeo?.squadraVincitrice?.id ?? null,
      squadra: trofeo?.squadraVincitrice?.nome ?? null,
      stemma: trofeo?.squadraVincitrice?.stemma ?? null,
      allenatore: allenatore?.nome ?? null,
      allenatoreId: allenatore?.id ?? null,
    };
  });

  /*
  ==========================================================
  RAGGRUPPAMENTO PER COMPETIZIONE
  ==========================================================
  */

  const creaCompetizioni = (
    trofeiDaRaggruppare: typeof trofei
  ) => {
    const competizioni = new Map<
      string,
      {
        nome: string;
        trofei: typeof trofei;
      }
    >();

    for (const trofeo of trofeiDaRaggruppare) {
      const nomeCompetizione = trofeo.torneo.nome;

      if (!competizioni.has(nomeCompetizione)) {
        competizioni.set(nomeCompetizione, {
          nome: nomeCompetizione,
          trofei: [],
        });
      }

      competizioni.get(nomeCompetizione)!.trofei.push(trofeo);
    }

    return Array.from(competizioni.values());
  };
 
  /*
  ==========================================================
  DIVISIONE NAZIONI / CLUB

  VALORI REALI DEL DATABASE:

  Mondiale per Nazioni → NAZIONI
  Europeo               → NAZIONI
  Mondiale per Club     → CLUB
  ==========================================================
  */


  const TIPI_COMPETIZIONI_NAZIONALI = [
    "Mondiale per Nazioni",
    "Europeo",
    "Coppa d'Africa",
    "Copa América",
    "Coppa d'Asia",
  ];

  const trofeiNazioni = trofei.filter((trofeo) =>
    TIPI_COMPETIZIONI_NAZIONALI.includes(
      trofeo.torneo.tipo.trim()
    )
  );

  const trofeiClub = trofei.filter(
    (trofeo) =>
      trofeo.torneo.tipo.trim() === "Mondiale per Club"
  );

  const trofeiAltri = trofei.filter((trofeo) => {
    const tipo = trofeo.torneo.tipo.trim();

    return (
      !TIPI_COMPETIZIONI_NAZIONALI.includes(tipo) &&
      tipo !== "Mondiale per Club"
    );
  });

  const competizioniNazioni = creaCompetizioni(trofeiNazioni);
const competizioniClub = creaCompetizioni(trofeiClub);
const competizioniAltre = creaCompetizioni(trofeiAltri);

  /*
  ==========================================================
  CLASSIFICA VITTORIE
  ==========================================================
  */

  const vittorieSquadre = new Map<
    number,
    {
      squadraId: number;
      nome: string;
      stemma: string | null;
      vittorie: number;
    }
  >();

  for (const trofeo of trofei) {
    if (!trofeo.squadraVincitrice) {
      continue;
    }

    const squadra = trofeo.squadraVincitrice;

    const esistente = vittorieSquadre.get(
      squadra.id
    );

    if (esistente) {
      esistente.vittorie += 1;
    } else {
      vittorieSquadre.set(squadra.id, {
        squadraId: squadra.id,
        nome: squadra.nome,
        stemma: squadra.stemma,
        vittorie: 1,
      });
    }
  }

  const classificaVittorie = Array.from(
    vittorieSquadre.values()
  ).sort((a, b) => {
    if (b.vittorie !== a.vittorie) {
      return b.vittorie - a.vittorie;
    }

    return a.nome.localeCompare(b.nome);
  });


  // Cartina storica: ogni titolo viene attribuito alla squadra vincitrice reale.
  // Per le nazionali usiamo il codice ISO, mai la nazionalità dell'allenatore.
  const vincitoriStorici: VincitoreStorico[] = [];
  if (filtro && TIPI_COMPETIZIONI_NAZIONALI.includes(filtro)) {
    const perSquadra = new Map<number, VincitoreStorico>();
    for (const trofeo of trofei) {
      const squadra = trofeo.squadraVincitrice;
      if (!squadra) continue;
      let voce = perSquadra.get(squadra.id);
      if (!voce) {
        const nomeNormalizzato = normalizzaPaese(squadra.nome);
        // Le nazionali britanniche non sono il Regno Unito intero.
        // Il GeoJSON dell'Inghilterra usa GB-ENG, non GBR.
        const iso = nomeNormalizzato === "inghilterra" || nomeNormalizzato === "england"
          ? "GB-ENG"
          : nomeNormalizzato === "paesi baschi"
            ? "REG-BASQUE"
            : nomeNormalizzato === "bretagna"
              ? "REG-BRETAGNE"
              : (() => {
                  const codice = ISO_PER_NOME.get(nomeNormalizzato) ?? null;
                  return codice && ISO_DISPONIBILI.has(codice) ? codice : null;
                })();
        // La base Natural Earth 1:110m non contiene tutte le isole e gli ex territori.
        voce = { iso, squadraId: squadra.id, nome: squadra.nome, stemma: squadra.stemma, titoli: [] };
        perSquadra.set(squadra.id, voce);
      }
      voce.titoli.push({ anno: trofeo.torneo.anno, torneoId: trofeo.torneo.id, allenatore: allenatoreTrofeo(trofeo)?.nome ?? null });
    }
    vincitoriStorici.push(...Array.from(perSquadra.values()).sort((a, b) => b.titoli.length - a.titoli.length || a.nome.localeCompare(b.nome, "it")));
  }

  const competizioniTotali = [...competizioniNazioni, ...competizioniClub, ...competizioniAltre];
  const ultimoTitolo = trofei[0] ?? null;

  function SalaCompetizioni({
    competizioni,
    etichetta,
  }: {
    competizioni: { nome: string; trofei: typeof trofei }[];
    etichetta: string;
  }) {
    if (!competizioni.length) return null;
    return (
      <section className="mt-20" aria-label={etichetta}>
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#d9b873]">ARCHIVIO STORICO</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{etichetta}</h2>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{competizioni.length} competizioni</span>
        </div>
        <div className="space-y-8">
          {competizioni.map((competizione) => (
            <article key={competizione.nome} className="overflow-hidden rounded-[30px] border border-[#d9b873]/20 bg-[#0d1728] shadow-[0_30px_90px_rgba(0,0,0,.35)]">
              <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(110deg,#182c47,#0b1423_65%,#101c30)] px-6 py-7 sm:px-10">
                <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-20 h-56 w-56 rounded-full border-[35px] border-[#d9b873]/[0.06]" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9b873]">COLLEZIONE DEI CAMPIONI</p>
                    <h3 className="mt-2 text-2xl font-black sm:text-4xl">{competizione.nome}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-[#d9b873]/30 bg-[#d9b873]/10 px-4 py-3">
                      {competizione.trofei[0]?.squadraVincitrice?.stemma && <img src={competizione.trofei[0].squadraVincitrice.stemma} alt="" className="h-12 w-12 object-contain" />}
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#d9b873]">Campione in carica · {competizione.trofei[0]?.torneo.anno}</p><p className="font-black">{competizione.trofei[0]?.squadraVincitrice?.nome ?? "—"}</p><p className="text-xs text-slate-400">{allenatoreTrofeo(competizione.trofei[0])?.nome ?? "Allenatore non attribuito"}</p></div>
                    </div>
                  <span className="rounded-full border border-[#d9b873]/25 bg-[#d9b873]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#ecd39b]">{competizione.trofei.length} {competizione.trofei.length === 1 ? 'edizione' : 'edizioni'}</span></div>
                </div>
              </div>
              <div className="divide-y divide-white/[0.07]">
                {competizione.trofei.map((trofeo) => (
                  <div key={trofeo.id} className="group relative grid gap-5 px-6 py-6 transition-colors hover:bg-[#d9b873]/[0.045] sm:grid-cols-[110px_1fr_auto] sm:items-center sm:px-10">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">EDIZIONE</p>
                      <p className="mt-1 text-4xl font-black tracking-tighter text-[#e8ca89]">{trofeo.torneo.anno}</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-5">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#d9b873]/20 bg-[#d9b873]/[0.07] p-3 shadow-[inset_0_0_30px_rgba(217,184,115,.06)]">
                        {trofeo.squadraVincitrice?.stemma ? <img src={trofeo.squadraVincitrice.stemma} alt={trofeo.squadraVincitrice.nome} className="h-full w-full object-contain drop-shadow-xl" /> : <span className="text-3xl">✦</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d9b873]">CAMPIONE</p>
                        <Link href={`/squadre/${trofeo.squadraVincitriceId}`} className="mt-1 block truncate text-xl font-black transition hover:text-[#e8ca89] sm:text-2xl">{trofeo.squadraVincitrice?.nome}</Link>
                        <p className="mt-1 truncate text-xs text-slate-400">Allenatore: {allenatoreTrofeo(trofeo)?.nome ?? "Non attribuito"}</p><p className="mt-1 truncate text-xs text-slate-500">{trofeo.torneo.nome}</p>
                      </div>
                    </div>
                    <Link href={`/tornei/${trofeo.torneo.id}`} className="inline-flex items-center justify-center gap-3 self-center rounded-full border border-[#d9b873]/30 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#e8ca89] transition hover:bg-[#d9b873] hover:text-[#091321]">Esplora edizione <span aria-hidden="true">↗</span></Link>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#060d18] text-[#f4f2eb]">
      <section className="relative isolate overflow-hidden border-b border-[#d9b873]/20 bg-[#081323]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(190,142,65,.20),transparent_43%),radial-gradient(ellipse_at_12%_90%,rgba(38,82,143,.27),transparent_48%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-10 h-[540px] w-[540px] rounded-full border border-[#d9b873]/20 shadow-[0_0_0_70px_rgba(217,184,115,.025),0_0_0_140px_rgba(217,184,115,.018)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-10 sm:pb-28">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-[#e8ca89]">← Torna alla home</Link>
          <div className="mt-16 grid gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.42em] text-[#d9b873]">PAZZITOURNAMENT / LEGACY</p>
              <div className="mt-6 h-px w-24 bg-[#d9b873]" />
              <h1 className="mt-7 text-6xl font-black uppercase leading-[.91] tracking-[-0.065em] sm:text-7xl xl:text-[100px]">HALL <span className="block text-[#d9b873]">OF FAME</span></h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">{filtro ? `La storia dei campioni di ${filtro}. Ogni edizione, un nome inciso nella leggenda.` : 'Non sono solo vittorie. Sono le squadre, le rivalità e le edizioni che hanno scritto la nostra storia.'}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#palmares" className="rounded-full bg-[#d9b873] px-6 py-3 text-sm font-black text-[#081323] transition hover:bg-[#f3dba4]">Scopri i campioni ↓</a>
                <a href="#archivio" className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold transition hover:border-[#d9b873] hover:text-[#d9b873]">Esplora l'archivio</a>
              </div>
            </div>
            <div className="relative flex min-h-[370px] items-center justify-center overflow-hidden rounded-[38px] border border-[#d9b873]/25 bg-[radial-gradient(circle_at_center,rgba(217,184,115,.18),transparent_65%)]">
              <div className="absolute h-72 w-72 animate-[spin_60s_linear_infinite] rounded-full border border-dashed border-[#d9b873]/30" />
              <div className="absolute h-52 w-52 rounded-full border border-[#d9b873]/30 shadow-[0_0_0_32px_rgba(217,184,115,.025),0_0_0_68px_rgba(217,184,115,.02)]" />
              <div className="relative text-center">
                <p className="text-[11px] font-bold uppercase tracking-[.55em] text-[#d9b873]">ETERNAL GLORY</p>
                <p className="mt-4 text-8xl font-black leading-none text-[#e8ca89] drop-shadow-[0_0_45px_rgba(217,184,115,.25)]">✦</p>
                <p className="mt-4 text-2xl font-black tracking-[.22em]">LEGACY</p>
                <p className="mt-2 text-xs uppercase tracking-[.3em] text-slate-400">Ogni vittoria lascia un segno</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <nav aria-label="Filtra per competizione" className="flex flex-wrap gap-2">
          <Link href="/albo-doro" className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${!filtro ? 'border-[#d9b873] bg-[#d9b873] text-[#081323]' : 'border-white/15 text-slate-400 hover:border-[#d9b873]/60 hover:text-white'}`}>Tutte le competizioni</Link>
          {TIPI_COMPETIZIONE.map((tipo) => <Link key={tipo} href={`/albo-doro?competizione=${encodeURIComponent(tipo)}`} className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${filtro === tipo ? 'border-[#d9b873] bg-[#d9b873] text-[#081323]' : 'border-white/15 text-slate-400 hover:border-[#d9b873]/60 hover:text-white'}`}>{tipo}</Link>)}
        </nav>
        {!filtro && <AtlanteCampioni campioni={campioniAtlante} />}
        {filtro && (() => {
          const campione = campioniAtlante.find(c => c.tipo === filtro);
          return (
            <section className="mt-10 overflow-hidden rounded-[30px] border border-[#d9b873]/30 bg-[linear-gradient(110deg,#20324b,#0b1423)] p-7 sm:p-10">
              <p className="text-[11px] font-black uppercase tracking-[.32em] text-[#d9b873]">Campione in carica · {filtro}</p>
              {campione?.squadra ? <div className="mt-6 flex flex-wrap items-center gap-6">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-[#d9b873]/25 bg-white/[.04] p-4">{campione.stemma ? <img src={campione.stemma} alt={campione.squadra} className="h-full w-full object-contain" /> : <span className="text-5xl">✦</span>}</div>
                <div className="min-w-0 flex-1"><p className="text-5xl font-black text-[#e8ca89]">{campione.anno}</p><h2 className="mt-2 text-3xl font-black">{campione.squadra}</h2><p className="mt-2 text-slate-400">Allenatore: {campione.allenatore ?? "Non attribuito"}</p></div>
              </div> : <p className="mt-5 text-slate-400">Nessun titolo ancora assegnato.</p>}
            </section>
          );
        })()}

        {filtro && (filtro === "Mondiale per Nazioni" || filtro === "Mondiale per Club") && vincitoriStorici.length > 0 && <AtlanteStorico tipo={filtro} vincitori={vincitoriStorici} />}

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Titoli assegnati', valore: trofei.length },
            { label: 'Competizioni storiche', valore: competizioniTotali.length },
            { label: 'Squadre campioni', valore: classificaVittorie.length },
            { label: 'Ultima edizione', valore: ultimoTitolo?.torneo.anno ?? '—' },
          ].map((dato) => <div key={dato.label} className="border-l-2 border-[#d9b873]/60 bg-[#101c2e] px-6 py-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{dato.label}</p><p className="mt-3 text-4xl font-black tracking-tight text-[#e8ca89]">{dato.valore}</p></div>)}
        </div>
        {filtro && !trofei.length && <div className="mt-12 rounded-3xl border border-[#d9b873]/20 bg-[#101c2e] p-10 text-center"><h2 className="text-2xl font-black">Nessun campione ancora registrato</h2><p className="mt-3 text-slate-400">Non risultano titoli assegnati per {filtro}.</p></div>}

        {classificaVittorie.length > 0 && <section id="palmares" className="mt-24 scroll-mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b873]">IL PANTHEON DEI CAMPIONI</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">I nomi nella <span className="text-[#d9b873]">storia.</span></h2>
          <p className="mt-4 max-w-2xl text-slate-400">Le squadre che hanno conquistato più titoli, ordinate per vittorie ufficialmente registrate.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {classificaVittorie.slice(0, 3).map((squadra, index) => <Link key={squadra.squadraId} href={`/squadre/${squadra.squadraId}`} className={`group relative overflow-hidden rounded-[28px] border p-7 transition duration-300 hover:-translate-y-2 ${index === 0 ? 'border-[#d9b873]/60 bg-[linear-gradient(155deg,#2b2a29,#121c2d_70%)] md:-translate-y-3 md:hover:-translate-y-5' : 'border-white/10 bg-[#111d2e]'}`}>
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">{index === 0 ? 'PRIMATO ASSOLUTO' : 'PALMARÈS'}</span><span className="text-5xl font-black text-[#d9b873]/35">0{index + 1}</span></div>
              <div className="mt-4 flex h-36 items-center justify-center">{squadra.stemma ? <img src={squadra.stemma} alt={squadra.nome} className="h-28 w-28 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" /> : <span className="text-6xl text-[#d9b873]">✦</span>}</div>
              <h3 className="mt-6 text-center text-2xl font-black">{squadra.nome}</h3>
              <p className="mt-3 text-center text-sm font-semibold text-[#e8ca89]">{squadra.vittorie} {squadra.vittorie === 1 ? 'titolo' : 'titoli'}</p>
              <div className="mt-7 border-t border-white/10 pt-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-[#d9b873]">Apri bacheca ↗</div>
            </Link>)}
          </div>
          {classificaVittorie.length > 3 && <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0d1728]">{classificaVittorie.slice(3).map((squadra, index) => <Link key={squadra.squadraId} href={`/squadre/${squadra.squadraId}`} className="flex items-center gap-4 border-b border-white/[0.07] px-5 py-4 transition last:border-0 hover:bg-white/[0.04] sm:px-8"><span className="w-9 shrink-0 text-xl font-black text-[#d9b873]/60">{String(index + 4).padStart(2, '0')}</span><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 p-2">{squadra.stemma ? <img src={squadra.stemma} alt={squadra.nome} className="h-full w-full object-contain" /> : '✦'}</div><span className="min-w-0 flex-1 truncate font-bold">{squadra.nome}</span><span className="text-sm font-black text-[#e8ca89]">{squadra.vittorie} {squadra.vittorie === 1 ? 'titolo' : 'titoli'}</span><span className="text-slate-500">↗</span></Link>)}</div>}
        </section>}
        <div id="archivio" className="scroll-mt-10" />
        {(!filtro || competizioniNazioni.length > 0) && <SalaCompetizioni competizioni={competizioniNazioni} etichetta="Le nazionali" />}
        {(!filtro || competizioniClub.length > 0) && <SalaCompetizioni competizioni={competizioniClub} etichetta="I club" />}
        {competizioniAltre.length > 0 && <SalaCompetizioni competizioni={competizioniAltre} etichetta="Altre competizioni" />}
        <div className="mt-20 border-t border-white/10 pt-8 text-center"><Link href="/" className="text-sm font-bold text-slate-400 transition hover:text-[#d9b873]">← Torna alla home</Link></div>
      </div>
    </main>
  );
}
