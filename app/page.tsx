
import Link from "next/link";
import { cookies } from "next/headers";
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

export default async function Home() {
  const cookieStore = await cookies();
  const qrToken = cookieStore.get("pazzi_qr_token")?.value;

  let partecipante: {
    nome: string;
    prossimePartite: {
      id: string;
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

  if (qrToken && /^[a-f0-9]{64}$/i.test(qrToken)) {
    const datiPartecipante = await prisma.partecipante.findUnique({
      where: { qrToken },
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
        const oraAttuale = getOraItalia();
        const minutiAttuali =
          oraAttuale * 60 + new Date().getMinutes();

        const partite = await prisma.partita.findMany({
          where: {
            AND: [
              {
                dataPartita: {
                  gte: oggi,
                },
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
          take: 30,
        });

        const partiteFuture = partite.filter((partita) => {
          if (!partita.dataPartita) return false;

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

        partecipante.prossimePartite = partiteFuture.map((partita) => {
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
            squadraPartecipante: squadraPartecipante ?? "Squadra",
            avversario: avversario ?? "Avversario da definire",
            torneo: partita.torneo?.nome ?? "Torneo",
            data: formattaData(partita.dataPartita!),
            ora: formattaOra(partita.OraPartita),
          };
        });
      }
    }
  }

  // =====================================================
  // CONTENUTO HOME
  // =====================================================

  return (
    <main className="pt-home min-h-screen overflow-hidden">

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
      `}</style>

      <div className="pt-topline" />

      {/* =================================================
          HERO
      ================================================= */}

      <section className="pt-hero flex items-center">
        <div className="pt-stadium" aria-hidden="true">
          <div className="pt-stadium-light" />
          <div className="pt-stadium-light" />
          <div className="pt-stadium-light" />
          <div className="pt-stadium-horizon" />
        </div>
        <div className="pt-hero-glow" />
        <div className="pt-hero-orb" />

        <div className="pt-hero-content mx-auto w-full max-w-[1450px] px-5 pb-24 pt-24 text-center sm:px-8 md:pb-32 md:pt-32">

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

      <div className="relative mx-auto max-w-[1380px] px-5 pb-10 sm:px-8">

        {/* =================================================
            SALUTO QR
        ================================================= */}

        {partecipante && (
          <ScrollReveal className="-mt-5 md:-mt-8">
            <section className="pt-qr-panel p-6 md:p-10">
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
                        <div key={partita.id} className="pt-qr-match p-5 md:p-6">
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </ScrollReveal>
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
