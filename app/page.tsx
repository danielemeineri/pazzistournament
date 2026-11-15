
import Link from "next/link";
import type { CSSProperties } from "react";
import { getSessioneQR } from "@/lib/sessione-qr";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ScrollReveal from "@/components/ScrollReveal";

// =====================================================
// FUNZIONI DI SUPPORTO
// =====================================================

function getOraItalia(): number {
  return Number(
    new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
  );
}

function getMinutiItalia(): number {
  const parti = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const ore = Number(parti.find((p) => p.type === "hour")?.value ?? 0);
  const minuti = Number(parti.find((p) => p.type === "minute")?.value ?? 0);
  return ore * 60 + minuti;
}

function getDataItalia(): Date {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const anno = Number(parti.find((p) => p.type === "year")?.value);
  const mese = Number(parti.find((p) => p.type === "month")?.value);
  const giorno = Number(parti.find((p) => p.type === "day")?.value);

  return new Date(Date.UTC(anno, mese - 1, giorno));
}

function formattaData(data: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

function formattaOra(ora: Date | null): string {
  if (!ora) return "Orario da definire";

  const ore = String(ora.getUTCHours()).padStart(2, "0");
  const minuti = String(ora.getUTCMinutes()).padStart(2, "0");

  return `${ore}:${minuti}`;
}

function getSaluto(): string {
  const ora = getOraItalia();

  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}

// =====================================================
// HOME
// =====================================================

const trofeiHome = [
  { tipo: "Mondiale per Nazioni", nome: "Mondiale per Nazioni", immagine: "/trofei/mondiale-nazioni.png", etichetta: "Il titolo mondiale" },
  { tipo: "Mondiale per Club", nome: "Mondiale per Club", immagine: "/trofei/mondiale-club.png", etichetta: "La gloria dei club" },
  { tipo: "Europeo", nome: "Campionato Europeo", immagine: "/trofei/europeo.png", etichetta: "Il trono d'Europa" },
  { tipo: "Copa América", nome: "Copa América", immagine: "/trofei/copa-america.png", etichetta: "La leggenda americana" },
  { tipo: "Coppa d'Africa", nome: "Coppa d'Africa", immagine: "/trofei/coppa-africa.png", etichetta: "L'orgoglio africano" },
  { tipo: "Coppa d'Asia", nome: "Coppa d'Asia", immagine: "/trofei/coppa-asia.png", etichetta: "La conquista asiatica" },
] as const;


// =====================================================
// PAZZI MEMORIES — RICORDI DA RISULTATI REALI
// =====================================================

type RicordoPazzi = {
  id: string;
  torneoId: number;
  torneo: string;
  data: string;
  anniFa: number;
  squadraCasa: string;
  squadraOspite: string;
  golCasa: number;
  golOspite: number;
  vincitore: string;
  stemmaVincitore: string | null;
  fase: string;
  finale: boolean;
  rigori: string | null;
};

function normalizzaFaseRicordo(fase: string | null): string {
  return (fase ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").trim();
}

async function caricaPazziMemories(): Promise<{
  anniversari: RicordoPazzi[];
  ricordiDelGiorno: RicordoPazzi[];
}> {
  const oggi = getDataItalia();
  const annoCorrente = oggi.getUTCFullYear();
  const meseCorrente = oggi.getUTCMonth();
  const giornoCorrente = oggi.getUTCDate();

  const partite = await prisma.partita.findMany({
    where: {
      Completata: true,
      dataPartita: { lt: new Date(Date.UTC(annoCorrente, 0, 1)) },
    },
    select: {
      id: true,
      TorneoId: true,
      dataPartita: true,
      Fase: true,
      GolCasa: true,
      GolOspite: true,
      AiRigori: true,
      RigoriCasa: true,
      RigoriOspite: true,
      squadraCasa: { select: { nome: true, stemma: true } },
      squadraOspite: { select: { nome: true, stemma: true } },
      torneo: { select: { nome: true } },
    },
    orderBy: [{ dataPartita: "desc" }, { id: "desc" }],
  });

  const ricordi: (RicordoPazzi & { mese: number; giorno: number })[] = [];
  for (const partita of partite) {
    if (!partita.dataPartita || !partita.squadraCasa || !partita.squadraOspite) continue;
    if (partita.GolCasa === null || partita.GolOspite === null) continue;

    const faseNormalizzata = normalizzaFaseRicordo(partita.Fase);
    const finale = faseNormalizzata === "finale" || faseNormalizzata === "final";
    const vittoriaCasa = partita.GolCasa > partita.GolOspite ||
      (partita.GolCasa === partita.GolOspite && partita.AiRigori === true &&
       partita.RigoriCasa !== null && partita.RigoriOspite !== null &&
       partita.RigoriCasa > partita.RigoriOspite);
    const vittoriaOspite = partita.GolOspite > partita.GolCasa ||
      (partita.GolCasa === partita.GolOspite && partita.AiRigori === true &&
       partita.RigoriCasa !== null && partita.RigoriOspite !== null &&
       partita.RigoriOspite > partita.RigoriCasa);
    if (!vittoriaCasa && !vittoriaOspite) continue;

    const data = partita.dataPartita;
    ricordi.push({
      id: String(partita.id),
      torneoId: partita.TorneoId,
      torneo: partita.torneo?.nome ?? "Torneo",
      data: formattaData(data),
      anniFa: annoCorrente - data.getUTCFullYear(),
      mese: data.getUTCMonth(),
      giorno: data.getUTCDate(),
      squadraCasa: partita.squadraCasa.nome,
      squadraOspite: partita.squadraOspite.nome,
      golCasa: partita.GolCasa,
      golOspite: partita.GolOspite,
      vincitore: vittoriaCasa ? partita.squadraCasa.nome : partita.squadraOspite.nome,
      stemmaVincitore: vittoriaCasa ? partita.squadraCasa.stemma : partita.squadraOspite.stemma,
      fase: partita.Fase ?? "Partita",
      finale,
      rigori: partita.AiRigori === true && partita.RigoriCasa !== null &&
        partita.RigoriOspite !== null
        ? `${partita.RigoriCasa}-${partita.RigoriOspite} d.c.r.` : null,
    });
  }

  // Le celebrazioni appaiono SOLO nell'esatto giorno/mese della finale vinta.
  // Se coincidono più finali, vengono mostrate tutte.
  const anniversari = ricordi.filter((r) =>
    r.finale && r.mese === meseCorrente && r.giorno === giornoCorrente
  );

  // Anche le partite non finali devono essere accadute nello stesso
  // giorno e mese di oggi, ma in un anno precedente.
  // Le finali sono gia mostrate nella sezione celebrativa e non si duplicano.
  const ricordiDelGiorno = ricordi.filter((r) =>
    !r.finale && r.mese === meseCorrente && r.giorno === giornoCorrente
  );

  return { anniversari, ricordiDelGiorno };
}

export default async function Home() {
  const { anniversari, ricordiDelGiorno } = await caricaPazziMemories();
  // Se ci sono più anniversari, la hero privilegia quello mondiale.
  // Tutte le altre finali restano comunque visibili nelle card sottostanti.
  const anniversarioHero =
    anniversari.find((r) => /mondiale|world cup|world championship/i.test(r.torneo)) ??
    anniversari[0] ?? null;
  const mondialeHero = anniversarioHero
    ? /mondiale|world cup|world championship/i.test(anniversarioHero.torneo)
    : false;
  const immagineTrofeoHero = anniversarioHero
    ? trofeiHome.find((t) => t.tipo.toLowerCase() === anniversarioHero.torneo.toLowerCase())?.immagine ?? null
    : null;
  const sessioneQR = await getSessioneQR();
  const amministratore = await isAdmin();

  let partecipante: {
    nome: string;
    prossimePartite: {
      id: string;
      torneoId: number;
      squadraPartecipante: string;
      avversario: string;
      torneo: string;
      data: string;
      ora: string;
    }[];
  } | null = null;

  // =====================================================
  // RICONOSCIMENTO PARTECIPANTE TRAMITE QR
  // =====================================================

  if (sessioneQR) {
    const datiPartecipante = await prisma.partecipante.findUnique({
      where: { id: sessioneQR.partecipante.id },
      select: {
        nome: true,
        partecipazioni: {
          select: {
            torneoId: true,
            squadraId: true,
          },
        },
      },
    });

    if (datiPartecipante) {
      partecipante = {
        nome: datiPartecipante.nome,
        prossimePartite: [],
      };

      const partecipazioniUniche = Array.from(
        new Map(
          datiPartecipante.partecipazioni.map((p) => [
            `${p.torneoId}-${p.squadraId}`,
            p,
          ])
        ).values()
      );

      if (partecipazioniUniche.length > 0) {
        const oggi = getDataItalia();
        const minutiAttuali = getMinutiItalia();

        const partite = await prisma.partita.findMany({
          where: {
            AND: [
              {
                OR: [
                  { dataPartita: { gte: oggi } },
                  { dataPartita: null },
                ],
              },
              {
                OR: partecipazioniUniche.map((p) => ({
                  TorneoId: p.torneoId,
                  OR: [
                    { SquadraCasaId: p.squadraId },
                    { SquadraOspiteId: p.squadraId },
                  ],
                })),
              },
              {
                OR: [
                  { Completata: false },
                  { Completata: null },
                ],
              },
            ],
          },
          include: {
            squadraCasa: {
              select: {
                id: true,
                nome: true,
              },
            },
            squadraOspite: {
              select: {
                id: true,
                nome: true,
              },
            },
            torneo: {
              select: {
                nome: true,
              },
            },
          },
          orderBy: [
            { dataPartita: "asc" },
            { OraPartita: "asc" },
          ],
        });

        const partiteFuture = partite.filter((partita) => {
          // Le partite senza data sono da programmare, non da escludere.
          if (!partita.dataPartita) return true;

          const stessaGiornata =
            partita.dataPartita.toISOString().slice(0, 10) ===
            oggi.toISOString().slice(0, 10);

          if (stessaGiornata && partita.OraPartita) {
            const minutiPartita =
              partita.OraPartita.getUTCHours() * 60 +
              partita.OraPartita.getUTCMinutes();

            if (minutiPartita < minutiAttuali) return false;
          }

          return true;
        });

        // Prima le partite programmate, poi quelle ancora senza data.
        // Il limite viene applicato dopo il filtro per non perdere partite valide.
        partiteFuture.sort((a, b) => {
          if (!a.dataPartita && !b.dataPartita) {
            return Number(a.id > b.id) - Number(a.id < b.id);
          }
          if (!a.dataPartita) return 1;
          if (!b.dataPartita) return -1;
          const differenzaData = a.dataPartita.getTime() - b.dataPartita.getTime();
          if (differenzaData !== 0) return differenzaData;
          const minutiA = a.OraPartita
            ? a.OraPartita.getUTCHours() * 60 + a.OraPartita.getUTCMinutes()
            : -1;
          const minutiB = b.OraPartita
            ? b.OraPartita.getUTCHours() * 60 + b.OraPartita.getUTCMinutes()
            : -1;
          return minutiA - minutiB;
        });

        partecipante.prossimePartite = partiteFuture.slice(0, 30).map((partita) => {
          const squadraCasaId = partita.SquadraCasaId;
          const squadraOspiteId = partita.SquadraOspiteId;

          const partecipazione = partecipazioniUniche.find(
            (p) =>
              p.torneoId === partita.TorneoId &&
              (p.squadraId === squadraCasaId ||
                p.squadraId === squadraOspiteId)
          );

          const squadraPartecipante =
            partecipazione?.squadraId === squadraCasaId
              ? partita.squadraCasa?.nome
              : partita.squadraOspite?.nome;

          const avversario =
            partecipazione?.squadraId === squadraCasaId
              ? partita.squadraOspite?.nome
              : partita.squadraCasa?.nome;

          return {
            id: String(partita.id),
            torneoId: partita.TorneoId,
            squadraPartecipante: squadraPartecipante ?? "Squadra",
            avversario: avversario ?? "Avversario da definire",
            torneo: partita.torneo?.nome ?? "Torneo",
            data: partita.dataPartita
              ? formattaData(partita.dataPartita)
              : "Da programmare",
            ora: partita.dataPartita
              ? formattaOra(partita.OraPartita)
              : "Orario da definire",
          };
        });
      }
    }
  }

  // =====================================================
  // CONTENUTO HOME
  // =====================================================

  return (
    <main className={`pt-home min-h-screen overflow-hidden ${anniversarioHero?.stemmaVincitore ? "pt-home-champions" : ""}`}>
      {amministratore && (
        <Link href="/admin" className="fixed right-4 top-4 z-[9999] rounded-full border border-amber-300/60 bg-[#101b35] px-5 py-3 text-sm font-black text-amber-200 shadow-2xl transition hover:bg-[#26395b] sm:right-8 sm:top-6">
          👑 Pannello Admin
        </Link>
      )}

      <style>{`
        .pt-home {
          --navy: #101b35;
          --navy-deep: #091226;
          --navy-light: #1c2c4c;
          --gold: #c6a45b;
          --gold-light: #ead29a;
          --ivory: #f2eddf;
          --muted: #aab2c0;

          color: var(--ivory);
          background:
            radial-gradient(ellipse at 50% 0%, rgba(198,164,91,.12), transparent 38%),
            var(--navy-deep);
        }

        .pt-home a {
          -webkit-tap-highlight-color: transparent;
        }

        .pt-topline {
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--gold),
            var(--gold-light),
            var(--gold),
            transparent
          );
          box-shadow: 0 0 20px rgba(198,164,91,.3);
        }

        /* HERO */

        .pt-hero {
          position: relative;
          isolation: isolate;
          min-height: 720px;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 40%, rgba(49,70,111,.55), transparent 52%),
            linear-gradient(145deg, #172746, #0d1830 58%, #091226);
        }

        .pt-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: .22;
          background:
            radial-gradient(circle at 50% 50%, transparent 0 180px, rgba(198,164,91,.18) 181px, transparent 183px),
            linear-gradient(90deg, transparent 49.9%, rgba(198,164,91,.1) 50%, transparent 50.1%);
        }

        .pt-hero::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 200px;
          pointer-events: none;
          background: linear-gradient(180deg, transparent, var(--navy-deep));
        }

        .pt-hero-orb {
          position: absolute;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          border: 1px solid rgba(234,210,154,.12);
          box-shadow:
            0 0 0 35px rgba(234,210,154,.025),
            0 0 0 75px rgba(234,210,154,.018),
            0 0 100px rgba(198,164,91,.08);
          left: 50%;
          top: 43%;
          transform: translate(-50%,-50%);
          pointer-events: none;
        }

        .pt-hero-glow {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          filter: blur(90px);
          background: rgba(198,164,91,.16);
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .pt-hero-content {
          position: relative;
          z-index: 2;
        }

        .pt-kicker {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(234,210,154,.3);
          border-radius: 999px;
          background: rgba(9,18,38,.5);
          padding: 11px 20px;
          backdrop-filter: blur(12px);
        }

        .pt-kicker-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold-light);
          box-shadow: 0 0 12px var(--gold);
          animation: ptBlink 2s ease-in-out infinite;
        }

        .pt-title {
          font-size: clamp(3.5rem, 10vw, 8.5rem);
          line-height: .9;
          letter-spacing: -.075em;
          font-weight: 950;
          text-transform: uppercase;
        }

        .pt-title-main {
          display: block;
          color: var(--ivory);
          text-shadow: 0 10px 45px rgba(0,0,0,.3);
        }

        .pt-title-accent {
          display: block;
          margin-top: 12px;
          color: transparent;
          background: linear-gradient(
            100deg,
            #b58b43,
            #f3dfad 48%,
            #c6a45b 85%
          );
          background-clip: text;
          -webkit-background-clip: text;
          filter: drop-shadow(0 5px 25px rgba(198,164,91,.16));
        }

        .pt-hero-rule {
          width: 150px;
          height: 2px;
          margin: 30px auto 0;
          background: linear-gradient(90deg, transparent, var(--gold), var(--gold-light), transparent);
        }

        .pt-hero-subtitle {
          color: #d7dbea;
          font-size: clamp(1rem, 2vw, 1.3rem);
        }

        .pt-hero-subtitle strong {
          color: var(--gold-light);
        }

        .pt-hero-cta,
        .pt-hero-secondary {
          display: inline-flex;
          min-height: 58px;
          align-items: center;
          justify-content: center;
          gap: 13px;
          border-radius: 999px;
          padding: 0 28px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
          transition: transform .3s ease, box-shadow .3s ease, background .3s ease;
        }

        .pt-hero-cta {
          color: #172039;
          background: linear-gradient(110deg, #c6a45b, #f0dba7);
          box-shadow: 0 12px 35px rgba(198,164,91,.2);
        }

        .pt-hero-cta:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(198,164,91,.35);
        }

        .pt-hero-secondary {
          border: 1px solid rgba(234,210,154,.4);
          color: var(--ivory);
          background: rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
        }

        .pt-hero-secondary:hover {
          transform: translateY(-4px);
          background: rgba(198,164,91,.12);
        }

        .pt-enter {
          animation: ptEnter .9s cubic-bezier(.2,.8,.2,1) both;
        }

        .pt-delay-1 { animation-delay: .12s; }
        .pt-delay-2 { animation-delay: .24s; }
        .pt-delay-3 { animation-delay: .36s; }

        @keyframes ptEnter {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes ptBlink {
          0%, 100% { opacity: .45; }
          50% { opacity: 1; }
        }

        /* ANIMAZIONI SCROLL */

        .pt-reveal {
          opacity: 0;
          transform: translateY(55px) scale(.985);
          filter: blur(5px);
          transition:
            opacity .85s ease,
            transform .85s cubic-bezier(.2,.75,.25,1),
            filter .85s ease;
          will-change: opacity, transform;
        }

        .pt-reveal-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }

        /* SEZIONI */

        .pt-section {
          position: relative;
          margin-top: 95px;
        }

        .pt-section-heading {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .pt-section-eyebrow {
          color: var(--gold);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .25em;
          text-transform: uppercase;
        }

        .pt-section-title {
          margin-top: 6px;
          color: var(--ivory);
          font-size: clamp(1.5rem, 3vw, 2.2rem);
          font-weight: 900;
          letter-spacing: -.045em;
        }

        .pt-section-line {
          height: 1px;
          flex: 1;
          background: linear-gradient(90deg, rgba(198,164,91,.45), transparent);
        }

        .pt-section-index {
          color: var(--gold);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        /* CARD PRINCIPALI */

        .pt-feature-card {
          position: relative;
          display: flex;
          min-height: 300px;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          border: 1px solid rgba(234,210,154,.16);
          border-radius: 28px;
          padding: 30px;
          background:
            radial-gradient(ellipse at 90% 5%, rgba(198,164,91,.13), transparent 45%),
            linear-gradient(145deg, #1a2b4b, #101b35 75%);
          box-shadow: 0 15px 45px rgba(0,0,0,.14);
          transition: transform .4s ease, border-color .4s ease, box-shadow .4s ease;
        }

        .pt-feature-card:hover {
          transform: translateY(-8px);
          border-color: rgba(234,210,154,.5);
          box-shadow: 0 25px 55px rgba(0,0,0,.28), 0 0 35px rgba(198,164,91,.06);
        }

        .pt-feature-number {
          color: rgba(242,237,223,.4);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .2em;
        }

        .pt-feature-category {
          color: var(--gold-light);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .pt-feature-icon {
          display: flex;
          width: 72px;
          height: 72px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(234,210,154,.3);
          border-radius: 23px;
          background: rgba(198,164,91,.1);
          color: var(--gold-light);
          font-size: 34px;
          box-shadow: 0 10px 30px rgba(0,0,0,.12);
          transition: transform .4s ease;
        }

        .pt-feature-card:hover .pt-feature-icon {
          transform: translateY(-5px) rotate(-5deg);
        }

        .pt-feature-title {
          margin-top: 20px;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -.045em;
        }

        .pt-feature-description {
          margin-top: 8px;
          max-width: 290px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .pt-feature-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 25px;
          border-top: 1px solid rgba(234,210,154,.14);
          padding-top: 17px;
          color: var(--gold-light);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .pt-feature-arrow {
          font-size: 20px;
          transition: transform .3s ease;
        }

        .pt-feature-card:hover .pt-feature-arrow {
          transform: translateX(6px);
        }

        /* CARD SECONDARIE */

        .pt-small-card {
          display: flex;
          min-height: 145px;
          align-items: center;
          gap: 18px;
          border: 1px solid rgba(234,210,154,.14);
          border-radius: 23px;
          padding: 22px;
          background: linear-gradient(120deg, #192947, #101b35);
          transition: transform .3s ease, border-color .3s ease, background .3s ease;
        }

        .pt-small-card:hover {
          transform: translateY(-5px);
          border-color: rgba(234,210,154,.45);
          background: linear-gradient(120deg, #223656, #14213d);
        }

        .pt-small-icon {
          display: flex;
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(234,210,154,.2);
          border-radius: 19px;
          background: rgba(198,164,91,.09);
          font-size: 26px;
        }

        .pt-small-eyebrow {
          color: var(--gold);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .pt-small-title {
          margin-top: 5px;
          color: var(--ivory);
          font-size: 18px;
          font-weight: 900;
        }

        .pt-small-description {
          margin-top: 5px;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .pt-small-arrow {
          margin-left: auto;
          color: var(--gold-light);
          font-size: 20px;
          transition: transform .25s ease;
        }

        .pt-small-card:hover .pt-small-arrow {
          transform: translateX(5px);
        }

        /* QR */

        .pt-qr-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(234,210,154,.25);
          border-radius: 28px;
          background:
            radial-gradient(ellipse at 100% 0%, rgba(198,164,91,.13), transparent 45%),
            linear-gradient(125deg, #1b2d4c, #101b35 60%, #0c172d);
          box-shadow: 0 25px 70px rgba(0,0,0,.2);
        }

        .pt-qr-panel .pt-qr-match {
          display: block !important;
          pointer-events: auto !important;
          cursor: pointer !important;
          position: relative;
          z-index: 101;
        }

        .pt-qr-match {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(234,210,154,.15);
          border-radius: 18px;
          background: rgba(5,12,27,.35);
          transition: border-color .25s ease, transform .25s ease;
        }

        .pt-qr-match:hover {
          transform: translateY(-3px);
          border-color: rgba(234,210,154,.45);
        }

        /* TROFEI */

        .pt-honours {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(234,210,154,.35);
          border-radius: 36px;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(198,164,91,.2), transparent 60%),
            linear-gradient(135deg, #1c2a43, #111b30 55%, #0b1427);
          box-shadow: 0 30px 80px rgba(0,0,0,.3);
        }

        .pt-honours-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 430px;
          height: 430px;
          transform: translate(-50%,-50%);
          border: 1px solid rgba(234,210,154,.14);
          border-radius: 50%;
          box-shadow:
            0 0 0 35px rgba(234,210,154,.025),
            0 0 0 75px rgba(234,210,154,.018);
          pointer-events: none;
        }

        .pt-honours-title {
          color: var(--gold-light);
          text-shadow: 0 5px 35px rgba(220,177,87,.18);
          font-size: clamp(2.5rem, 6vw, 4.8rem);
          font-weight: 950;
          letter-spacing: -.07em;
          line-height: 1;
        }

        .pt-trophy-symbol {
          display: flex;
          width: 112px;
          height: 112px;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 1px solid rgba(234,210,154,.35);
          border-radius: 36px;
          background: linear-gradient(145deg, rgba(234,210,154,.17), rgba(198,164,91,.04));
          box-shadow: 0 15px 45px rgba(0,0,0,.2), inset 0 0 30px rgba(234,210,154,.06);
          font-size: 58px;
          animation: ptFloat 5s ease-in-out infinite;
        }

        @keyframes ptFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .pt-footer-quote {
          color: #d8d1bf;
          font-family: Georgia, serif;
          font-style: italic;
        }


        /* SALA DEI TROFEI — ESPOSIZIONE CINEMATOGRAFICA */
        .pt-trophy-gallery {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
          margin-top: 48px;
          perspective: 1400px;
        }
        .pt-trophy-case {
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(234,210,154,.25);
          border-radius: 27px;
          padding: 22px 12px 26px;
          color: inherit;
          background:
            linear-gradient(90deg, rgba(255,255,255,.055), transparent 15%, transparent 85%, rgba(255,255,255,.035)),
            radial-gradient(ellipse at 50% 28%, rgba(220,180,104,.18), transparent 58%),
            linear-gradient(160deg, #263a59 0%, #14233e 48%, #080f21 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.12), inset 0 -25px 50px rgba(0,0,0,.22), 0 22px 50px rgba(0,0,0,.25);
          text-decoration: none;
          transition: transform .55s cubic-bezier(.2,.75,.2,1), border-color .4s ease, box-shadow .4s ease;
        }
        .pt-trophy-case::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: .55;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 28%, rgba(255,255,255,.07) 40%, transparent 53%);
          transform: translateX(-130%);
          transition: transform .85s ease;
        }
        .pt-trophy-case::after {
          content: "";
          position: absolute;
          inset: auto 10% 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #f0dba7, transparent);
          opacity: .5;
        }
        .pt-trophy-case:hover {
          transform: translateY(-12px) rotateX(2deg) scale(1.015);
          border-color: rgba(240,219,167,.75);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.15), 0 32px 70px rgba(0,0,0,.38), 0 0 44px rgba(198,164,91,.16);
        }
        .pt-trophy-case:hover::before { transform: translateX(130%); }
        .pt-trophy-light {
          position: absolute;
          z-index: 0;
          top: -105px;
          left: 50%;
          width: 290px;
          height: 380px;
          transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(255,226,160,.28), rgba(198,164,91,.07) 40%, transparent 72%);
          pointer-events: none;
          transition: opacity .4s ease;
        }
        .pt-trophy-case:hover .pt-trophy-light { opacity: 1; filter: brightness(1.4); }
        .pt-trophy-picture {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 240px;
          margin: 10px auto 0;
        }
        .pt-trophy-picture img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          filter: drop-shadow(0 19px 17px rgba(0,0,0,.58));
          animation: ptTrophyFloat 6s ease-in-out infinite;
          transition: filter .4s ease, scale .5s ease;
        }
        .pt-trophy-case:nth-child(even) .pt-trophy-picture img { animation-delay: -2.5s; }
        .pt-trophy-case:hover .pt-trophy-picture img {
          scale: 1.075;
          filter: drop-shadow(0 23px 25px rgba(234,210,154,.3));
        }
        .pt-trophy-plinth {
          position: relative;
          z-index: 1;
          width: 82%;
          height: 18px;
          margin: 0 auto 22px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,232,172,.48), rgba(198,164,91,.16) 55%, transparent 76%);
          box-shadow: 0 0 25px rgba(198,164,91,.17);
        }
        .pt-trophy-case-label { position: relative; z-index: 1; margin-top: auto; }
        .pt-trophy-view {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
          color: #f0dba7;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
          transition: gap .3s ease;
        }
        .pt-trophy-case:hover .pt-trophy-view { gap: 15px; }
        @keyframes ptTrophyFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        @media (min-width: 640px) {
          .pt-trophy-gallery { gap: 22px; }
          .pt-trophy-picture { height: 325px; }
          .pt-trophy-case { padding: 28px 20px 32px; }
        }
        @media (min-width: 1024px) {
          .pt-trophy-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
          .pt-trophy-picture { height: 350px; }
        }

        @media (max-width: 640px) {
          .pt-hero {
            min-height: 640px;
          }

          .pt-hero-orb {
            width: 300px;
            height: 300px;
          }

          .pt-section {
            margin-top: 68px;
          }

          .pt-feature-card {
            min-height: 255px;
          }

          .pt-honours-ring {
            width: 290px;
            height: 290px;
          }

          .pt-section-index {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pt-home *,
          .pt-home *::before,
          .pt-home *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }

          .pt-reveal {
            opacity: 1;
            transform: none;
            filter: none;
          }
        }

        /* =====================================================
           CINEMATIC EXTREME — VISUAL LAYER ONLY
           Nessuna modifica a query, QR, statistiche o navigazione.
        ===================================================== */
        .pt-home { position:relative; background:#060d1c; }
        .pt-home::before { content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.22;
          background-image:radial-gradient(rgba(239,204,133,.34) .65px,transparent .65px);
          background-size:33px 33px;mask-image:linear-gradient(to bottom,black,transparent 75%); }
        .pt-hero { min-height:min(940px,100svh); min-height:max(740px,92svh);
          background:radial-gradient(ellipse at 50% 67%,rgba(28,80,114,.33),transparent 48%),
          linear-gradient(180deg,#071021 0%,#101f37 49%,#050b18 100%); }
        .pt-hero::before { opacity:.7; background:
          linear-gradient(116deg,transparent 0 25%,rgba(237,208,139,.07) 31%,transparent 39%),
          linear-gradient(244deg,transparent 0 25%,rgba(237,208,139,.07) 31%,transparent 39%),
          radial-gradient(ellipse at 50% 110%,rgba(35,117,118,.2),transparent 60%); }
        .pt-stadium { position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0; }
        .pt-stadium-light { position:absolute;top:-25%;width:26%;height:115%;filter:blur(14px);
          background:linear-gradient(to bottom,rgba(255,229,167,.18),rgba(255,226,166,.025) 70%,transparent);
          clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);transform-origin:top center;
          animation:ptSpotlight 12s ease-in-out infinite alternate;mix-blend-mode:screen; }
        .pt-stadium-light:nth-child(1){left:4%;transform:rotate(-21deg)}
        .pt-stadium-light:nth-child(2){right:4%;transform:rotate(21deg);animation-delay:-5s}
        .pt-stadium-light:nth-child(3){left:37%;opacity:.42;animation-delay:-8s}
        .pt-stadium-horizon {position:absolute;bottom:10%;left:-10%;width:120%;height:27%;border-radius:50% 50% 0 0;
          border-top:2px solid rgba(218,189,122,.15);background:radial-gradient(ellipse at 50% 100%,rgba(19,72,80,.3),transparent 66%);
          box-shadow:0 -30px 100px rgba(219,178,98,.04);}
        .pt-stadium-horizon::after{content:"";position:absolute;inset:24% 0 0;opacity:.2;
          background:repeating-linear-gradient(90deg,transparent 0 55px,rgba(233,214,169,.12) 56px,transparent 57px);}
        .pt-hero-orb{width:min(58vw,650px);height:min(58vw,650px);border-color:rgba(234,210,154,.2);
          animation:ptOrbPulse 8s ease-in-out infinite; }
        .pt-hero-glow{width:520px;height:520px;filter:blur(105px);opacity:.85;animation:ptGlow 7s ease-in-out infinite alternate;}
        .pt-title {position:relative;filter:drop-shadow(0 22px 35px rgba(0,0,0,.38));}
        .pt-title-main{letter-spacing:-.085em;text-shadow:0 4px 0 rgba(255,255,255,.035),0 25px 65px rgba(0,0,0,.55);}
        .pt-title-accent{background-size:220% 100%;animation:ptGoldFlow 7s ease-in-out infinite alternate;
          text-shadow:none;filter:drop-shadow(0 0 25px rgba(217,180,99,.17));}
        .pt-kicker {box-shadow:0 0 35px rgba(209,170,89,.12),inset 0 1px 0 rgba(255,255,255,.07);}
        .pt-hero-cta{position:relative;overflow:hidden;box-shadow:0 0 40px rgba(198,164,91,.23),0 15px 45px rgba(0,0,0,.25);}
        .pt-hero-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.6) 48%,transparent 65%);
          transform:translateX(-150%);transition:transform .85s ease;}
        .pt-hero-cta:hover::after{transform:translateX(150%);}
        .pt-cinematic-caption{display:flex;align-items:center;justify-content:center;gap:16px;color:rgba(242,237,223,.42);
          font-size:9px;letter-spacing:.34em;font-weight:900;text-transform:uppercase;}
        .pt-cinematic-caption::before,.pt-cinematic-caption::after{content:"";width:42px;height:1px;
          background:linear-gradient(90deg,transparent,rgba(225,190,118,.6));}
        .pt-cinematic-caption::after{transform:rotate(180deg);}
        .pt-film-strip{position:relative;z-index:2;overflow:hidden;border-top:1px solid rgba(232,196,124,.18);
          border-bottom:1px solid rgba(232,196,124,.18);background:linear-gradient(90deg,#081120,#17263e,#081120);
          box-shadow:0 18px 45px rgba(0,0,0,.2);}
        .pt-film-track{display:flex;width:max-content;align-items:center;gap:42px;padding:15px 0;
          animation:ptMarquee 38s linear infinite;}
        .pt-film-item{white-space:nowrap;font-size:10px;letter-spacing:.25em;font-weight:900;color:rgba(236,217,177,.65);text-transform:uppercase;}
        .pt-film-star{font-size:13px;color:#d9bd7b;}
        .pt-section-heading{position:relative;}
        .pt-section-title{font-size:clamp(1.7rem,3.5vw,2.8rem);text-shadow:0 12px 28px rgba(0,0,0,.25);}
        .pt-feature-card{min-height:330px;transform-style:preserve-3d;
          background:radial-gradient(ellipse at 75% 5%,rgba(224,184,102,.14),transparent 48%),
          linear-gradient(145deg,#233756,#101b35 75%);}
        .pt-feature-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
          background:linear-gradient(125deg,rgba(255,255,255,.08),transparent 35%,transparent 70%,rgba(224,184,102,.04));}
        .pt-feature-card:hover{transform:translateY(-12px) perspective(900px) rotateX(2deg);}
        .pt-feature-icon{box-shadow:0 15px 45px rgba(0,0,0,.23),0 0 30px rgba(224,184,102,.07);}
        .pt-small-card{box-shadow:0 12px 35px rgba(0,0,0,.13);}
        .pt-small-card:hover{box-shadow:0 20px 50px rgba(0,0,0,.28),0 0 28px rgba(198,164,91,.09);}
        .pt-honours{background:radial-gradient(ellipse at 50% 0%,rgba(236,197,115,.2),transparent 58%),
          radial-gradient(ellipse at 50% 110%,rgba(44,91,102,.22),transparent 58%),
          linear-gradient(135deg,#202e49,#111b30 55%,#070d1a);}
        .pt-honours::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.27;
          background:repeating-linear-gradient(90deg,transparent 0 110px,rgba(245,218,157,.08) 111px,transparent 112px);}
        .pt-honours-title{background:linear-gradient(110deg,#c6a45b,#fff0c7 45%,#c6a45b 80%);
          -webkit-background-clip:text;background-clip:text;color:transparent;background-size:200% 100%;animation:ptGoldFlow 9s ease infinite alternate;}
        .pt-trophy-case{transform-style:preserve-3d;}
        .pt-trophy-case:hover{transform:translateY(-16px) perspective(1000px) rotateX(3deg) scale(1.018);}
        .pt-trophy-picture img{will-change:transform;}
        .pt-qr-panel{box-shadow:0 25px 80px rgba(0,0,0,.36),0 0 40px rgba(198,164,91,.06);}
        @keyframes ptSpotlight{0%{rotate:-6deg;opacity:.5}100%{rotate:7deg;opacity:1}}
        @keyframes ptOrbPulse{0%,100%{opacity:.62;scale:1}50%{opacity:1;scale:1.055}}
        @keyframes ptGlow{from{opacity:.5;scale:.9}to{opacity:1;scale:1.15}}
        @keyframes ptGoldFlow{from{background-position:0% 50%}to{background-position:100% 50%}}
        @keyframes ptMarquee{to{transform:translateX(-50%)}}
        @media(max-width:640px){.pt-hero{min-height:690px}.pt-hero-orb{width:330px;height:330px}
          .pt-stadium-light{width:55%}.pt-film-track{gap:26px}.pt-film-item{font-size:8px}
          .pt-feature-card{min-height:270px}.pt-cinematic-caption{font-size:7px;letter-spacing:.18em}}
        @media(prefers-reduced-motion:reduce){.pt-film-track{animation:none}.pt-hero-orb,.pt-hero-glow,.pt-title-accent,
          .pt-honours-title,.pt-stadium-light{animation:none}}

        /* COLORI DINAMICI: lo sfondo usa ESCLUSIVAMENTE i pixel dello stemma originale.
           Nessuna palette inventata o stella aggiunta. La stessa immagine, molto
           ingrandita e sfocata, crea le luci ambientali della squadra campione. */
        .pt-home-champions { background:#060b14; }
        .pt-home-champions .pt-hero { isolation:isolate; }
        .pt-champions-color-field { position:absolute;inset:-12%;z-index:0;overflow:hidden;pointer-events:none; }
        .pt-champions-color-source { position:absolute;inset:-18%;width:136%;height:136%;object-fit:cover;
          opacity:.68;filter:blur(105px) saturate(1.9) brightness(.68);
          transform:scale(1.2);animation:ptChampionColors 16s ease-in-out infinite alternate; }
        .pt-champions-color-field::after { content:"";position:absolute;inset:0;
          background:linear-gradient(180deg,rgba(3,8,19,.86) 0%,rgba(3,8,19,.36) 38%,rgba(3,8,19,.57) 72%,#060b14 100%),
          radial-gradient(ellipse at 50% 45%,transparent 4%,rgba(3,8,19,.52) 75%); }
        .pt-home-champions .pt-film-strip { background:linear-gradient(90deg,#060b14,rgba(26,35,53,.96),#060b14); }
        .pt-home-champions .pt-topline { box-shadow:0 0 28px rgba(255,224,154,.2); }
        .pt-home-champions .pt-hero-orb { opacity:.26; }
        .pt-home-champions .pt-hero-glow { opacity:.18; }
        .pt-home-champions .pt-stadium-light { opacity:.1; }
        @keyframes ptChampionColors { from{transform:scale(1.18) translate(-2%,1%) rotate(-4deg)}to{transform:scale(1.38) translate(2%,-2%) rotate(4deg)} }
        @media(max-width:640px){.pt-champions-color-source{filter:blur(65px) saturate(1.9) brightness(.68)}}
        @media(prefers-reduced-motion:reduce){.pt-champions-color-source{animation:none}}

        /* HALL OF CHAMPIONS — CERIMONIA CINEMATOGRAFICA */
        .pt-champions { overflow:hidden; }
        .pt-champions-stage { position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;isolation:isolate; }
        .pt-champions-stage::before {content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 65%,transparent 5%,rgba(2,5,13,.55) 74%,#040711 100%);z-index:5;}
        .pt-champions-stage::after {content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0px,transparent 3px,rgba(255,255,255,.012) 4px);z-index:7;opacity:.55;}
        .pt-champions-stage-floor {position:absolute;left:-20%;right:-20%;bottom:-18%;height:49%;border-radius:50%;transform:perspective(650px) rotateX(67deg);background:radial-gradient(ellipse,rgba(234,190,99,.28) 0%,rgba(180,126,45,.12) 28%,transparent 70%);border-top:1px solid rgba(247,214,146,.26);box-shadow:0 -12px 110px rgba(216,164,75,.14);z-index:2;animation:ptStageRise 2s both;}
        .pt-champions-beam {position:absolute;top:-38%;left:50%;width:24%;height:125%;transform-origin:50% 0%;background:linear-gradient(180deg,rgba(255,235,172,.32),rgba(245,203,111,.08) 55%,transparent);clip-path:polygon(48% 0,52% 0,100% 100%,0 100%);filter:blur(17px);mix-blend-mode:screen;opacity:.6;z-index:3;animation:ptBeamSweep 11s ease-in-out infinite alternate;}
        .pt-champions-beam:nth-child(2){left:16%;animation-delay:-5s;animation-duration:13s;opacity:.42;}
        .pt-champions-beam:nth-child(3){left:73%;animation-delay:-8s;animation-duration:15s;opacity:.42;}
        .pt-champions-spot {position:absolute;top:7%;width:13px;height:13px;border-radius:50%;background:#fff6d4;box-shadow:0 0 24px 9px rgba(255,225,153,.75),0 0 100px 25px rgba(233,174,73,.45);z-index:4;animation:ptSpotPulse 4s ease-in-out infinite alternate;}
        .pt-champions-spot.a{left:16%}.pt-champions-spot.b{right:16%;animation-delay:-2s}
        .pt-champions-particles {position:absolute;inset:0;z-index:6;overflow:hidden;}
        .pt-champions-particle {position:absolute;top:-12%;left:var(--particle-x);width:var(--particle-w);height:var(--particle-h);background:linear-gradient(135deg,#fff0bb,#c18d3e);opacity:0;transform:rotate(var(--particle-rot));animation:ptGoldFall var(--particle-duration) linear var(--particle-delay) infinite;box-shadow:0 0 8px rgba(255,214,136,.2);}
        .pt-champions .pt-champions-crest {opacity:.53;width:min(86vw,790px);height:min(86vw,790px);filter:drop-shadow(20px 26px 10px rgba(0,0,0,.6)) drop-shadow(0 0 34px rgba(255,219,137,.4));animation:ptCrestReveal 2.4s cubic-bezier(.16,1,.3,1) both,ptChampionCrest 11s ease-in-out 2.4s infinite alternate;}
        .pt-champions .pt-champions-crest-halo{animation:ptChampionHalo 6s ease-in-out infinite alternate;}
        .pt-champions .pt-champions-crest-wrap{z-index:1;}
        .pt-champions .pt-champions-color-field{opacity:.72;}
        .pt-champions .pt-champions-trophy{z-index:4;opacity:.94;right:8%;bottom:12%;width:clamp(105px,18vw,240px);height:clamp(145px,26vw,320px);animation:ptTrophyReveal 2.1s 1s both,ptTrophyFloat 6s 3.1s ease-in-out infinite;filter:drop-shadow(0 22px 20px rgba(0,0,0,.65)) drop-shadow(0 0 26px rgba(255,203,107,.5));}
        .pt-champions .pt-hero-content{position:relative;z-index:10;}
        .pt-champions .pt-stadium{opacity:.34;}
        .pt-champions .pt-hero-orb{opacity:.12;}
        .pt-champions .pt-hero-glow{opacity:.25;}
        .pt-champions .pt-title{text-shadow:0 5px 35px rgba(0,0,0,.9),0 0 70px rgba(230,180,75,.2);}
        .pt-champions-kicker{animation:ptChampionLabel 1.1s .6s both;}
        .pt-champions-result{transition:transform .3s,box-shadow .3s;}
        .pt-champions-result:hover{transform:translateY(-4px);box-shadow:0 15px 55px rgba(225,181,91,.22);}
        @keyframes ptBeamSweep{from{transform:translateX(-50%) rotate(-24deg)}to{transform:translateX(-50%) rotate(24deg)}}
        @keyframes ptSpotPulse{from{opacity:.6;transform:scale(.7)}to{opacity:1;transform:scale(1.2)}}
        @keyframes ptGoldFall{0%{transform:translate3d(0,-30px,0) rotate(var(--particle-rot));opacity:0}12%{opacity:.85}85%{opacity:.65}100%{transform:translate3d(var(--particle-drift),110vh,0) rotate(680deg);opacity:0}}
        @keyframes ptCrestReveal{from{opacity:0;transform:perspective(1100px) translateY(90px) scale(.6) rotateY(-32deg);filter:blur(24px)}to{opacity:.53;transform:perspective(1100px) translateY(0) scale(1) rotateY(-9deg);filter:blur(0)}}
        @keyframes ptTrophyReveal{from{opacity:0;transform:translateY(80px) scale(.7);filter:blur(15px)}to{opacity:.94;transform:translateY(0) scale(1);filter:blur(0)}}
        @keyframes ptChampionLabel{from{opacity:0;transform:translateY(18px);letter-spacing:.35em}to{opacity:1;transform:translateY(0);letter-spacing:.16em}}
        @keyframes ptStageRise{from{opacity:0;transform:perspective(650px) rotateX(67deg) scale(.6)}to{opacity:1;transform:perspective(650px) rotateX(67deg) scale(1)}}
        @media(max-width:640px){.pt-champions .pt-champions-crest{width:115vw;height:115vw;opacity:.38}.pt-champions .pt-champions-trophy{right:-3%;bottom:13%;opacity:.65;width:115px;height:155px}.pt-champions-beam{width:40%;filter:blur(22px)}.pt-champions-stage-floor{bottom:-12%}.pt-champions .pt-hero-content{padding-top:115px;padding-bottom:105px}}
        @media(prefers-reduced-motion:reduce){.pt-champions-beam,.pt-champions-spot,.pt-champions-particle,.pt-champions-stage-floor,.pt-champions .pt-champions-crest,.pt-champions .pt-champions-trophy,.pt-champions-kicker{animation:none!important}.pt-champions-particle{display:none}}

        /* HALL OF CHAMPIONS — solo durante gli anniversari delle finali */
        .pt-hero.pt-champions { background:radial-gradient(ellipse at 50% 50%,rgba(163,116,41,.09),transparent 57%),linear-gradient(180deg,#060b17,#111a2c 52%,#060b14); }
        .pt-champions .pt-stadium-light { opacity:.22; }
        .pt-champions-crest-wrap { position:absolute;inset:0;z-index:0;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:none; }
        .pt-champions-crest-halo { position:absolute;width:min(92vw,850px);height:min(92vw,850px);border-radius:50%;background:radial-gradient(circle,rgba(230,191,105,.23),rgba(180,132,57,.07) 40%,transparent 68%);filter:blur(25px);animation:ptChampionHalo 7s ease-in-out infinite alternate; }
        .pt-champions-crest { width:min(77vw,700px);height:min(77vw,700px);object-fit:contain;opacity:.26;filter:drop-shadow(18px 25px 6px rgba(0,0,0,.42)) drop-shadow(-9px -8px 18px rgba(238,196,105,.26));transform:perspective(1100px) rotateY(-9deg) rotateX(3deg);animation:ptChampionCrest 10s ease-in-out infinite alternate;mask-image:radial-gradient(ellipse,black 49%,rgba(0,0,0,.8) 66%,transparent 89%); }
        .pt-champions-crest-glint { position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,231,168,.07) 49%,transparent 61%);animation:ptChampionShine 9s ease-in-out infinite; }
        .pt-champions .pt-hero-content { text-shadow:0 4px 28px rgba(0,0,0,.6); }
        .pt-champions-kicker { display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:10px 19px;border:1px solid rgba(245,211,142,.55);border-radius:999px;background:rgba(8,12,25,.75);box-shadow:0 0 38px rgba(230,187,95,.19);color:#ffe6a7;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase; }
        .pt-champions-result { display:inline-block;max-width:100%;border:1px solid rgba(234,210,154,.38);border-radius:22px;background:rgba(4,9,20,.72);padding:15px 24px;box-shadow:0 12px 40px rgba(0,0,0,.3);backdrop-filter:blur(14px); }
        .pt-champions-trophy { position:absolute;right:max(2%,calc((100vw - 1400px)/2));bottom:14%;width:clamp(90px,15vw,190px);height:clamp(125px,22vw,270px);object-fit:contain;opacity:.76;filter:drop-shadow(0 12px 25px rgba(215,170,75,.24));pointer-events:none;animation:ptTrophyFloat 6s ease-in-out infinite; }
        @keyframes ptChampionCrest { from{transform:perspective(1100px) rotateY(-11deg) rotateX(3deg) translateY(14px) scale(.97)}to{transform:perspective(1100px) rotateY(9deg) rotateX(-2deg) translateY(-12px) scale(1.04)} }
        @keyframes ptChampionHalo {from{opacity:.55;transform:scale(.94)}to{opacity:1;transform:scale(1.08)}}
        @keyframes ptChampionShine {0%,30%{transform:translateX(-130%)}65%,100%{transform:translateX(130%)}}
        @media(max-width:640px){.pt-champions-crest{width:112vw;height:112vw;opacity:.23}.pt-champions-trophy{right:1%;bottom:8%;opacity:.35}.pt-champions-kicker{font-size:8px;letter-spacing:.09em}}
        @media(prefers-reduced-motion:reduce){.pt-champions-crest,.pt-champions-crest-halo,.pt-champions-crest-glint,.pt-champions-trophy{animation:none}}
      `}</style>

      <div className="pt-topline" />

      {/* =================================================
          HERO
      ================================================= */}

      <section className={`pt-hero flex items-center ${anniversarioHero ? "pt-champions" : ""}`}>
        {anniversarioHero && (
          <div className="pt-champions-stage" aria-hidden="true">
            <div className="pt-champions-beam" />
            <div className="pt-champions-beam" />
            <div className="pt-champions-beam" />
            <div className="pt-champions-spot a" />
            <div className="pt-champions-spot b" />
            <div className="pt-champions-stage-floor" />
            <div className="pt-champions-particles">
              {Array.from({ length: 32 }, (_, i) => (
                <span
                  key={i}
                  className="pt-champions-particle"
                  style={{
                    "--particle-x": `${(i * 37 + 11) % 100}%`,
                    "--particle-w": `${3 + (i % 3) * 2}px`,
                    "--particle-h": `${6 + (i % 4) * 3}px`,
                    "--particle-rot": `${(i * 41) % 180}deg`,
                    "--particle-duration": `${7 + (i % 5) * 1.3}s`,
                    "--particle-delay": `${(i * 0.73) % 9}s`,
                    "--particle-drift": `${(i % 2 === 0 ? 1 : -1) * (30 + (i * 17) % 110)}px`,
                  } as CSSProperties}
                />
              ))}
            </div>
          </div>
        )}
        {anniversarioHero?.stemmaVincitore && (
          <div className="pt-champions-color-field" aria-hidden="true">
            <img className="pt-champions-color-source" src={anniversarioHero.stemmaVincitore} alt="" />
          </div>
        )}
        {anniversarioHero?.stemmaVincitore && (
          <div className="pt-champions-crest-wrap" aria-hidden="true">
            <div className="pt-champions-crest-halo" />
            {/* Lo stemma è quello originale del database: nessuna stella aggiunta. */}
            <img className="pt-champions-crest" src={anniversarioHero.stemmaVincitore} alt="" />
            <div className="pt-champions-crest-glint" />
          </div>
        )}
        {anniversarioHero && immagineTrofeoHero && (
          <img className="pt-champions-trophy" src={immagineTrofeoHero} alt="" aria-hidden="true" />
        )}
        <div className="pt-stadium" aria-hidden="true">
          <div className="pt-stadium-light" />
          <div className="pt-stadium-light" />
          <div className="pt-stadium-light" />
          <div className="pt-stadium-horizon" />
        </div>
        <div className="pt-hero-glow" />
        <div className="pt-hero-orb" />

        <div className="pt-hero-content mx-auto w-full max-w-[1450px] px-5 pb-24 pt-24 text-center sm:px-8 md:pb-32 md:pt-32">

          {anniversarioHero && (
            <div className="pt-enter mb-8">
              <span className="pt-champions-kicker">
                ✦ PAZZI MEMORIES · {mondialeHero ? "CAMPIONI DEL MONDO" : "HALL OF CHAMPIONS"} ✦
              </span>
            </div>
          )}
          <div className="pt-enter">
            <div className="pt-kicker mx-auto mb-9">
              <span className="pt-kicker-dot" />
              <span className="text-[9px] font-black uppercase tracking-[.25em] text-[#f2eddf]">
                The football experience
              </span>
              <span className="text-[9px] font-bold tracking-widest text-[#d9bd7b]">
                EST. PAZZI
              </span>
            </div>
          </div>

          <div className="pt-enter pt-delay-1">
            <h1 className="pt-title">
              <span className="pt-title-main">PAZZI</span>
              <span className="pt-title-accent">TOURNAMENT</span>
            </h1>
          </div>

          {anniversarioHero && (
            <div className="pt-enter pt-delay-2 mt-8">
              <p className="text-xs font-black uppercase tracking-[.25em] text-[#ffe6a7]">
                {anniversarioHero.anniFa} {anniversarioHero.anniFa === 1 ? "anno fa" : "anni fa"} · {anniversarioHero.torneo}
              </p>
              <h2 className="mt-3 text-2xl font-black text-[#fff0c7] md:text-4xl">{anniversarioHero.vincitore}</h2>
              <Link href={`/tornei/${anniversarioHero.torneoId}/partite/${anniversarioHero.id}`} className="pt-champions-result mt-5 text-sm font-black text-white transition hover:border-[#fff0c7] md:text-lg">
                {anniversarioHero.squadraCasa} {anniversarioHero.golCasa} – {anniversarioHero.golOspite} {anniversarioHero.squadraOspite}
                {anniversarioHero.rigori && <span className="mt-1 block text-xs text-[#ead29a]">Rigori: {anniversarioHero.rigori}</span>}
                <span className="mt-2 block text-[10px] uppercase tracking-[.18em] text-[#ead29a]">Rivivi la finale ↗</span>
              </Link>
            </div>
          )}
          <div className="pt-hero-rule pt-enter pt-delay-2" />

          <div className="pt-enter pt-delay-2 mt-8">
            <p className="pt-hero-subtitle">
              Il videogioco gestisce il calcio.
            </p>
            <p className="pt-hero-subtitle mt-2">
              <strong>PazziTournament</strong> gestisce la storia.
            </p>
          </div>

          <div className="pt-enter pt-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/tornei" className="pt-hero-cta">
              Entra nelle competizioni
              <span className="text-xl">↗</span>
            </Link>

            <Link href="/albo-doro" className="pt-hero-secondary">
              Hall of fame
            </Link>
          </div>

          <div className="pt-enter pt-delay-3 mt-10 pt-cinematic-caption">
            Ogni partita scrive la storia
          </div>

          <div className="pt-enter pt-delay-3 mt-10 flex flex-wrap justify-center gap-x-9 gap-y-3 text-[9px] font-black uppercase tracking-[.22em] text-white/50">
            <span>01 / Competizione</span>
            <span className="text-[#d9bd7b]">02 / Leggende</span>
            <span>03 / Statistiche</span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[3] flex justify-center pb-5">
          <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-[.3em] text-white/40">
            <span className="h-px w-8 bg-white/20" />
            Scopri il tuo universo calcistico
            <span className="h-px w-8 bg-white/20" />
          </div>
        </div>
      </section>

      <div className="pt-film-strip" aria-label="Il mondo PazziTournament">
        <div className="pt-film-track" aria-hidden="true">
          {Array.from({ length: 2 }, (_, giro) => (
            <div key={giro} className="flex shrink-0 items-center gap-[42px]">
              {[
                "PAZZITOURNAMENT", "LA STORIA SIAMO NOI", "OGNI GOL CONTA",
                "LE GRANDI RIVALITÀ", "I CAMPIONI RESTANO", "THE FOOTBALL EXPERIENCE",
              ].map((testo) => (
                <span key={`${giro}-${testo}`} className="flex items-center gap-[42px]">
                  <span className="pt-film-star">✦</span>
                  <span className="pt-film-item">{testo}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* =================================================
          CONTENUTO
      ================================================= */}

      <div className="relative z-[5] mx-auto max-w-[1380px] px-5 pb-10 sm:px-8">

        {/* =================================================
            SALUTO QR
        ================================================= */}

        {partecipante && (
          <div className="relative isolate z-[100] -mt-5 md:-mt-8">
            <section className="pt-qr-panel relative isolate z-[100] p-6 md:p-10">
              <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border border-[#d9bd7b]/10" />
              <div className="pointer-events-none absolute -right-10 -top-14 h-60 w-60 rounded-full border border-[#d9bd7b]/10" />

              <div className="relative">
                <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-[2px] w-8 bg-[#c6a45b]" />
                      <p className="text-[9px] font-black uppercase tracking-[.25em] text-[#e4ca8c]">
                        Player recognized
                      </p>
                    </div>

                    <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                      {getSaluto()}, {partecipante.nome}.
                    </h2>

                    <p className="mt-3 text-sm text-slate-300">
                      Bentornato nel mondo PazziTournament.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Il tuo prossimo appuntamento in campo ti aspetta.
                    </p>

                    <form action="/api/qr/logout" method="post" className="mt-5">
                      <button
                        type="submit"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d9bd7b]/35 bg-[#d9bd7b]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-[#ead29a] transition hover:border-[#ead29a]/70 hover:bg-[#d9bd7b]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ead29a]"
                        aria-label={`Esci dal profilo di ${partecipante.nome}`}
                      >
                        <span aria-hidden="true">↪</span>
                        Esci dal profilo
                      </button>
                    </form>
                  </div>

                  <div className="flex items-center gap-4 border-t border-[#d9bd7b]/15 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                    <div className="text-4xl text-[#e4ca8c]">⚽</div>
                    <div>
                      <p className="text-3xl font-black text-[#e4ca8c]">
                        {partecipante.prossimePartite.length}
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">
                        Partite in programma
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-9 border-t border-white/10 pt-7">
                  <div className="mb-5 flex items-center gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.25em] text-[#d9bd7b]">
                        Your schedule
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        Le tue prossime partite
                      </h3>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#c6a45b]/30 to-transparent" />
                  </div>

                  {partecipante.prossimePartite.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-7 text-center">
                      <div className="mb-3 text-3xl">📅</div>
                      <p className="font-bold text-slate-200">
                        Nessuna partita in programma
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Quando verranno programmate nuove partite, le troverai qui.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {partecipante.prossimePartite.map((partita) => (
                        <form key={partita.id} action={`/tornei/${partita.torneoId}/partite/${partita.id}`} method="get" className="relative z-[101]">
                          <button type="submit" className="pt-qr-match relative block w-full cursor-pointer p-5 text-left md:p-6 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" aria-label={`Apri la partita ${partita.squadraPartecipante} contro ${partita.avversario}`}>
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#e4ca8c]">
                                {partita.torneo}
                              </p>
                              <p className="mt-3 break-words text-lg font-black md:text-2xl">
                                {partita.squadraPartecipante}
                                <span className="mx-3 text-[#d9bd7b]">VS</span>
                                {partita.avversario}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-slate-300">
                                📅 {partita.data}
                              </span>
                              <span className="rounded-full border border-[#d9bd7b]/25 bg-[#d9bd7b]/[.07] px-3 py-2 font-bold text-[#e4ca8c]">
                                🕒 {partita.ora}
                              </span>
                            </div>
                          </div>
                          <span className="mt-3 inline-block text-xs font-bold text-[#e4ca8c]">Apri partita ↗</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}


        {/* =================================================
            PAZZI MEMORIES — ANNIVERSARI E RICORDI
        ================================================= */}
        {anniversari.length > 0 && (
          <section className="relative isolate -mt-5 mb-12 overflow-hidden rounded-[30px] border border-[#ead29a]/50 bg-gradient-to-br from-[#3c301b] via-[#16243d] to-[#080f20] p-7 shadow-[0_25px_90px_rgba(0,0,0,.45)] md:p-12" aria-label="Pazzi Memories: anniversari storici">
            <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[#d9bd7b]/15 blur-[80px]" />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[.32em] text-[#ead29a]">✦ Pazzi Memories · Oggi nella storia</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-[#fff1cb] md:text-6xl">La leggenda ritorna.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">In questo giorno, negli anni passati, si scriveva una pagina della nostra storia.</p>
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                {anniversari.map((ricordo) => (
                  <Link key={ricordo.id} href={`/tornei/${ricordo.torneoId}/partite/${ricordo.id}`} className="group relative block rounded-2xl border border-[#ead29a]/25 bg-black/25 p-6 transition hover:-translate-y-1 hover:border-[#ead29a]/70 hover:bg-black/35">
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ead29a]">🏆 {ricordo.anniFa} {ricordo.anniFa === 1 ? "anno fa" : "anni fa"} · Finale vinta</p>
                    <h3 className="mt-3 text-2xl font-black text-white">{ricordo.vincitore}</h3>
                    <p className="mt-1 text-sm text-slate-300">{ricordo.torneo} · {ricordo.data}</p>
                    <p className="mt-5 text-lg font-bold text-[#fff1cb]">{ricordo.squadraCasa} {ricordo.golCasa} – {ricordo.golOspite} {ricordo.squadraOspite}</p>
                    {ricordo.rigori && <p className="mt-1 text-xs text-slate-300">Rigori: {ricordo.rigori}</p>}
                    <span className="mt-5 inline-block text-[10px] font-black uppercase tracking-[.16em] text-[#ead29a]">Rivivi la finale ↗</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {ricordiDelGiorno.length > 0 && (
          <section className="mb-12 mt-8 overflow-hidden rounded-[26px] border border-[#d9bd7b]/25 bg-gradient-to-r from-[#1d2d49] to-[#0c1629] p-6 md:p-9" aria-label="Pazzi Memories: accadde oggi">
            <p className="text-[9px] font-black uppercase tracking-[.28em] text-[#ead29a]">✦ Pazzi Memories · Accadde oggi</p>
            <h2 className="mt-3 text-2xl font-black md:text-3xl">In questo giorno, nella nostra storia.</h2>
            <p className="mt-2 text-sm text-slate-300">Partite disputate proprio oggi, negli anni passati.</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {ricordiDelGiorno.map((ricordo) => (
                <div key={ricordo.id} className="rounded-2xl border border-[#ead29a]/20 bg-black/20 p-5 md:p-6">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ead29a]">
                    {ricordo.anniFa} {ricordo.anniFa === 1 ? "anno fa" : "anni fa"} · {ricordo.fase}
                  </p>
                  <h3 className="mt-3 text-xl font-black text-white">{ricordo.squadraCasa} {ricordo.golCasa} – {ricordo.golOspite} {ricordo.squadraOspite}</h3>
                  <p className="mt-2 text-sm text-slate-300">{ricordo.torneo} · {ricordo.data}</p>
                  {ricordo.rigori && <p className="mt-1 text-xs text-slate-300">Rigori: {ricordo.rigori}</p>}
                  <Link href={`/tornei/${ricordo.torneoId}/partite/${ricordo.id}`} className="mt-5 inline-flex items-center rounded-full border border-[#ead29a]/45 px-5 py-3 text-[10px] font-black uppercase tracking-[.15em] text-[#ead29a] transition hover:bg-[#ead29a]/10">Rivivi la partita ↗</Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =================================================
            GRANDI COMPETIZIONI
        ================================================= */}

        <ScrollReveal>
          <section className="pt-section">
            <div className="pt-section-heading">
              <div>
                <p className="pt-section-eyebrow">Explore the universe</p>
                <h2 className="pt-section-title">Il mondo PazziTournament</h2>
              </div>
              <div className="pt-section-line" />
              <span className="pt-section-index">01 — 03</span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/tornei" className="pt-feature-card">
                <div className="flex items-center justify-between">
                  <span className="pt-feature-number">PT / 001</span>
                  <span className="pt-feature-category">Competitions</span>
                </div>

                <div>
                  <div className="pt-feature-icon">🏆</div>
                  <h3 className="pt-feature-title">Tornei</h3>
                  <p className="pt-feature-description">
                    Ogni competizione ha una storia. Ogni partita può diventare leggenda.
                  </p>
                </div>

                <div className="pt-feature-link">
                  <span>Entra nelle competizioni</span>
                  <span className="pt-feature-arrow">↗</span>
                </div>
              </Link>

              <Link href="/squadre" className="pt-feature-card">
                <div className="flex items-center justify-between">
                  <span className="pt-feature-number">PT / 002</span>
                  <span className="pt-feature-category">Teams</span>
                </div>

                <div>
                  <div className="pt-feature-icon">⚽</div>
                  <h3 className="pt-feature-title">Squadre</h3>
                  <p className="pt-feature-description">
                    Club e nazionali. Identità, rivalità e protagonisti del nostro calcio.
                  </p>
                </div>

                <div className="pt-feature-link">
                  <span>Esplora le squadre</span>
                  <span className="pt-feature-arrow">↗</span>
                </div>
              </Link>

              <Link href="/partecipanti" className="pt-feature-card">
                <div className="flex items-center justify-between">
                  <span className="pt-feature-number">PT / 003</span>
                  <span className="pt-feature-category">Players</span>
                </div>

                <div>
                  <div className="pt-feature-icon">👤</div>
                  <h3 className="pt-feature-title">Partecipanti</h3>
                  <p className="pt-feature-description">
                    Gli allenatori, i loro percorsi e le sfide che hanno segnato la storia.
                  </p>
                </div>

                <div className="pt-feature-link">
                  <span>Scopri i protagonisti</span>
                  <span className="pt-feature-arrow">↗</span>
                </div>
              </Link>
            </div>
          </section>
        </ScrollReveal>

        {/* =================================================
            ARCHIVIO E STATISTICHE
        ================================================= */}

        <ScrollReveal>
          <section className="pt-section">
            <div className="pt-section-heading">
              <div>
                <p className="pt-section-eyebrow">Football heritage</p>
                <h2 className="pt-section-title">L'archivio del calcio</h2>
              </div>
              <div className="pt-section-line" />
              <span className="pt-section-index">04 — 06</span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Link href="/calciatori" className="pt-small-card">
                <div className="pt-small-icon">👤</div>
                <div className="min-w-0">
                  <p className="pt-small-eyebrow">Players history</p>
                  <h3 className="pt-small-title">Calciatori</h3>
                  <p className="pt-small-description">
                    Giocatori, presenze e statistiche.
                  </p>
                </div>
                <span className="pt-small-arrow">↗</span>
              </Link>

              <Link href="/videogiochi" className="pt-small-card">
                <div className="pt-small-icon">🎮</div>
                <div className="min-w-0">
                  <p className="pt-small-eyebrow">Game archive</p>
                  <h3 className="pt-small-title">Videogiochi</h3>
                  <p className="pt-small-description">
                    Le edizioni che hanno ospitato le nostre sfide.
                  </p>
                </div>
                <span className="pt-small-arrow">↗</span>
              </Link>

              <Link href="/statistiche" className="pt-small-card">
                <div className="pt-small-icon">📊</div>
                <div className="min-w-0">
                  <p className="pt-small-eyebrow">Performance</p>
                  <h3 className="pt-small-title">Statistiche</h3>
                  <p className="pt-small-description">
                    Record, classifiche e numeri della nostra storia.
                  </p>
                </div>
                <span className="pt-small-arrow">↗</span>
              </Link>
            </div>
          </section>
        </ScrollReveal>

        {/* =================================================
            SALA DEI TROFEI - COPPE REALI
        ================================================= */}

        <ScrollReveal>
          <section className="pt-section" id="sala-trofei">
            <div className="pt-honours px-5 py-12 text-center sm:px-8 md:px-12 md:py-16">
              <div className="pt-honours-ring" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[.35em] text-[#e4ca8c]">
                  La nostra storia, i nostri trofei
                </p>
                <h2 className="pt-honours-title mt-5">SALA DEI TROFEI</h2>
                <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#e7dfcd]/80 md:text-base">
                  Sei competizioni. Sei simboli di gloria. Ogni coppa custodisce
                  le vittorie delle squadre e degli allenatori di PazziTournament.
                </p>

                <div className="pt-trophy-gallery">
                  {trofeiHome.map((trofeo, index) => (
                    <Link
                      key={trofeo.immagine}
                      href={`/albo-doro?competizione=${encodeURIComponent(trofeo.tipo)}`}
                      className="pt-trophy-case group"
                      aria-label={`Esplora l'Albo d'Oro: ${trofeo.nome}`}
                    >
                      <div className="pt-trophy-light" aria-hidden="true" />
                      <p className="relative z-10 text-[9px] font-black tracking-[.24em] text-[#f0dba7]/75">
                        {String(index + 1).padStart(2, "0")} / 06
                      </p>
                      <div className="pt-trophy-picture">
                        <img
                          src={trofeo.immagine}
                          alt={`Trofeo ${trofeo.nome}`}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="pt-trophy-plinth" aria-hidden="true" />
                      <div className="pt-trophy-case-label">
                        <h3 className="text-base font-black text-[#f2eddf] sm:text-xl">
                          {trofeo.nome}
                        </h3>
                        <p className="mt-2 text-[10px] uppercase tracking-[.13em] text-[#d9bd7b]">
                          {trofeo.etichetta}
                        </p>
                        <span className="pt-trophy-view">
                          Scopri i campioni <span aria-hidden="true">↗</span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/albo-doro"
                  className="mt-11 inline-flex min-h-14 items-center gap-4 rounded-full border border-[#d9bd7b]/50 bg-[#d9bd7b]/[.12] px-8 py-4 text-[10px] font-black uppercase tracking-[.16em] text-[#f0dba7] transition-all duration-300 hover:-translate-y-1 hover:bg-[#d9bd7b]/[.22]"
                >
                  Esplora l'Albo d'Oro <span aria-hidden="true" className="text-lg">↗</span>
                </Link>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* =================================================
            FOOTER
        ================================================= */}

        <ScrollReveal>
          <footer className="mb-5 mt-24 text-center">
            <div className="mx-auto mb-10 h-px max-w-2xl bg-gradient-to-r from-transparent via-[#c6a45b]/40 to-transparent" />

            <p className="pt-footer-quote text-base md:text-xl">
              "Vincere non è importante, è l'unica cosa che conta."
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <span className="h-px w-9 bg-[#c6a45b]/40" />
              <p className="text-[9px] font-black uppercase tracking-[.35em] text-slate-400">
                PazziTournament
              </p>
              <span className="h-px w-9 bg-[#c6a45b]/40" />
            </div>

            <p className="mt-3 text-[8px] font-bold uppercase tracking-[.25em] text-slate-600">
              The football experience
            </p>
          </footer>
        </ScrollReveal>

      </div>
    </main>
  );
}
