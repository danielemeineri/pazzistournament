"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";

// Cartografia mondiale ad alta risoluzione.
// @ts-ignore
import worldData from "world-atlas/countries-50m.json";

// Conversione TopoJSON in GeoJSON.
// @ts-ignore
import { feature } from "topojson-client";

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

type Props = {
  paesi: PaeseAtlante[];
};

type GeoFeature = {
  type: string;
  id?: string | number;
  properties?: {
    name?: string;
    shapeName?: string;
    shapeISO?: string;
  };
  geometry?: unknown;
};

type VistaContinente = {
  lat: number;
  lng: number;
  altitude: number;
};

type Stella = {
  id: number;
  top: number;
  left: number;
  size: number;
  durata: number;
  ritardo: number;
  opacita: number;
};

const VISTE: Record<string, VistaContinente> = {
  Europe: { lat: 54, lng: 15, altitude: 1.25 },
  Asia: { lat: 35, lng: 90, altitude: 1.8 },
  Africa: { lat: 0, lng: 20, altitude: 1.65 },
  "North America": { lat: 43, lng: -100, altitude: 1.65 },
  "South America": { lat: -15, lng: -60, altitude: 1.65 },
  Oceania: { lat: -22, lng: 135, altitude: 1.8 },
  Antarctica: { lat: -82, lng: 0, altitude: 2 },
};

const CONTINENTI = [
  { codice: "Europe", nome: "Europa", simbolo: "🇪🇺" },
  { codice: "Asia", nome: "Asia", simbolo: "🌏" },
  { codice: "Africa", nome: "Africa", simbolo: "🌍" },
  { codice: "North America", nome: "Nord America", simbolo: "🌎" },
  { codice: "South America", nome: "Sud America", simbolo: "🌎" },
  { codice: "Oceania", nome: "Oceania", simbolo: "🌏" },
];

const PALETTE = [
  "#22c55e",
  "#38bdf8",
  "#f59e0b",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
  "#14b8a6",
  "#e879f9",
  "#84cc16",
  "#f97316",
  "#60a5fa",
  "#d946ef",
];

const COLORI_PERSONALIZZATI: Record<string, string> = {
  daniele: "#22c55e",
  luca: "#f97316",
  thomas: "#38bdf8",
  francesco: "#a78bfa",
};

function normalizzaNome(nome: string) {
  return nome
    .trim()
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coloreAllenatore(nome: string) {
  const nomeNormalizzato = normalizzaNome(nome);

  if (COLORI_PERSONALIZZATI[nomeNormalizzato]) {
    return COLORI_PERSONALIZZATI[nomeNormalizzato];
  }

  let hash = 0;

  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) | 0;
  }

  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function codicePaese(elemento: GeoFeature) {
  if (elemento.properties?.shapeISO) {
    return elemento.properties.shapeISO;
  }

  if (elemento.id === undefined || elemento.id === null) {
    return "";
  }

  const codiceNumerico = String(elemento.id).padStart(3, "0");

  // Il Regno Unito torna a essere un unico Paese.
  if (codiceNumerico === "826") {
    return "GBR";
  }

  return codiceNumerico;
}

function escapeHtml(testo: string) {
  return testo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generaStelle(numero: number): Stella[] {
  return Array.from({ length: numero }, (_, id) => ({
    id,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 2 + 1,
    durata: Math.random() * 3 + 2,
    ritardo: Math.random() * 5,
    opacita: Math.random() * 0.6 + 0.2,
  }));
}

export default function Mappamondo3D({ paesi }: Props) {
  const globeRef = useRef<any>(null);
  const contenitoreRef = useRef<HTMLDivElement>(null);

  const [larghezza, setLarghezza] = useState(800);

  const [continenteAttivo, setContinenteAttivo] =
    useState<string | null>(null);

  const [paeseSelezionato, setPaeseSelezionato] =
    useState<string | null>(null);

  const stelle = useMemo(() => generaStelle(110), []);

  // Indicizzazione dei Paesi per codice.
  const paesiPerCodice = useMemo(() => {
    return new Map(
      paesi.map((paese) => [paese.codice, paese])
    );
  }, [paesi]);

  // Indicizzazione dei Paesi per nome normalizzato.
  const paesiPerNome = useMemo(() => {
    const mappa = new Map<string, PaeseAtlante>();

    for (const paese of paesi) {
      mappa.set(normalizzaNome(paese.nome), paese);
    }

    return mappa;
  }, [paesi]);

  // Conversione della cartografia mondiale una sola volta.
  const featuresMondo = useMemo(() => {
    const topo = worldData as {
      objects: {
        countries: unknown;
      };
    };

    const risultato = feature(
      topo as any,
      topo.objects.countries as any
    ) as {
      features: GeoFeature[];
    };

    return risultato.features;
  }, []);

  // Tutti i Paesi provengono dalla cartografia mondiale.
  // Il Regno Unito rimane un'unica geometria.
  const features = featuresMondo;

  // Associa ogni geometria al relativo Paese una sola volta.
  const paesePerFeature = useMemo(() => {
    const mappa = new Map<GeoFeature, PaeseAtlante>();

    for (const elemento of features) {
      const paese = paesiPerCodice.get(
        codicePaese(elemento)
      );

      if (paese) {
        mappa.set(elemento, paese);
      }
    }

    return mappa;
  }, [features, paesiPerCodice]);

  function trovaPaese(elemento: GeoFeature) {
    return paesePerFeature.get(elemento);
  }

  // Dettaglio del Paese selezionato.
  const paeseSelezionatoData = useMemo(() => {
    if (!paeseSelezionato) return null;

    const featureSelezionata = features.find(
      (elemento) =>
        codicePaese(elemento) === paeseSelezionato
    );

    if (!featureSelezionata) return null;

    return paesePerFeature.get(featureSelezionata) ?? null;
  }, [paeseSelezionato, features, paesePerFeature]);

  const allenatoriLegenda = useMemo(() => {
    const allenatori = new Map<number, string>();

    for (const paese of paesi) {
      for (const allenatore of paese.leaders) {
        allenatori.set(allenatore.id, allenatore.nome);
      }
    }

    return Array.from(allenatori.entries())
      .map(([id, nome]) => ({
        id,
        nome,
        colore: coloreAllenatore(nome),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [paesi]);

  // Rilevamento della larghezza del contenitore.
  useEffect(() => {
    const contenitore = contenitoreRef.current;

    if (!contenitore) return;

    const osservatore = new ResizeObserver((entries) => {
      const nuovaLarghezza = entries[0]?.contentRect.width;

      if (nuovaLarghezza) {
        setLarghezza(
          Math.max(300, Math.floor(nuovaLarghezza))
        );
      }
    });

    osservatore.observe(contenitore);

    return () => osservatore.disconnect();
  }, []);

  function selezionaContinente(codice: string) {
    setContinenteAttivo(codice);
    setPaeseSelezionato(null);

    if (globeRef.current) {
      const controlli = globeRef.current.controls();

      if (controlli) {
        controlli.autoRotate = false;
      }

      // L'orientamento automatico del continente rimane attivo.
      globeRef.current.pointOfView(
        VISTE[codice],
        1400
      );
    }
  }

  function tornaAlMondo() {
    setContinenteAttivo(null);
    setPaeseSelezionato(null);

    if (globeRef.current) {
      const controlli = globeRef.current.controls();

      if (controlli) {
        controlli.autoRotate = false;
      }

      globeRef.current.pointOfView(
        {
          lat: 20,
          lng: 0,
          altitude: 2.5,
        },
        1400
      );
    }
  }

  function selezionaPaese(elemento: GeoFeature) {
    const codice = codicePaese(elemento);

    if (!codice) return;

    setPaeseSelezionato(codice);

    if (globeRef.current) {
      const controlli = globeRef.current.controls();

      if (controlli) {
        controlli.autoRotate = false;
      }
    }
  }

  function colorePaese(elemento: GeoFeature) {
    const paese = trovaPaese(elemento);

    if (
      continenteAttivo &&
      paese &&
      paese.continente !== continenteAttivo
    ) {
      return "#1e293b";
    }

    if (!paese || paese.leaders.length === 0) {
      return "#475569";
    }

    if (paese.leaders.length > 1) {
      return "#f59e0b";
    }

    return coloreAllenatore(paese.leaders[0].nome);
  }

  function etichettaPaese(elemento: GeoFeature) {
    const paese = trovaPaese(elemento);

    const nomeGeografico =
      elemento.properties?.name ??
      elemento.properties?.shapeName;

    const nome =
      paese?.nome ??
      nomeGeografico ??
      "Paese";

    if (!paese) {
      return `
        <div style="
          background:#0f172a;
          color:white;
          padding:9px 12px;
          border-radius:9px;
          border:1px solid #475569;
        ">
          <strong>${escapeHtml(nome)}</strong>
          <br/>
          <span style="color:#94a3b8">
            Nessuna partecipazione registrata
          </span>
        </div>
      `;
    }

    const descrizione =
      paese.leaders.length > 1
        ? "Situazione di parità"
        : `Allenatore: ${escapeHtml(paese.leaders[0].nome)}`;

    return `
      <div style="
        background:#0f172a;
        color:white;
        padding:10px 13px;
        border-radius:10px;
        border:1px solid #334155;
        min-width:160px;
      ">
        <strong>${escapeHtml(nome)}</strong>
        <br/>
        <span style="color:#cbd5e1">
          ${descrizione}
        </span>
        <br/>
        <span style="color:#38bdf8">
          ${paese.totale} partecipazioni
        </span>
      </div>
    `;
  }

  return (
    <div className="space-y-5">
      <style jsx>{`
        .spazio-stellato {
          background:
            radial-gradient(
              ellipse at 50% 45%,
              rgba(14, 38, 75, 0.42),
              transparent 55%
            ),
            radial-gradient(
              ellipse at 15% 80%,
              rgba(31, 41, 91, 0.24),
              transparent 45%
            ),
            linear-gradient(
              135deg,
              #020617,
              #080d20 45%,
              #030712
            );
        }

        .stella {
          position: absolute;
          z-index: 1;
          border-radius: 50%;
          background: #ffffff;
          pointer-events: none;
          box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
          animation: scintilla ease-in-out infinite;
        }

        @keyframes scintilla {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.75);
          }

          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .stella {
            animation: none;
          }
        }
      `}</style>

      {/* INTRODUZIONE */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
            Atlante interattivo
          </p>

          <h3 className="mt-1 text-xl font-black sm:text-2xl">
            Esplora le nazionali del mondo
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Seleziona un continente oppure ruota il globo
            trascinandolo con il mouse o con il dito.
          </p>
        </div>

        <button
          type="button"
          onClick={tornaAlMondo}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
        >
          🌐 Vista globale
        </button>
      </div>

      {/* CONTINENTI */}
      <div className="flex flex-wrap gap-2">
        {CONTINENTI.map((continente) => (
          <button
            key={continente.codice}
            type="button"
            onClick={() =>
              selezionaContinente(continente.codice)
            }
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              continenteAttivo === continente.codice
                ? "border-cyan-400 bg-cyan-400/15 text-cyan-300 shadow-lg shadow-cyan-500/10"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/60 hover:bg-slate-800"
            }`}
          >
            <span className="mr-2">{continente.simbolo}</span>
            {continente.nome}
          </button>
        ))}
      </div>

      {/* GLOBO */}
      <div
        ref={contenitoreRef}
        className="spazio-stellato relative overflow-hidden rounded-3xl border border-slate-700"
      >
        {/* STELLE */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {stelle.map((stella) => (
            <span
              key={stella.id}
              className="stella"
              style={{
                top: `${stella.top}%`,
                left: `${stella.left}%`,
                width: `${stella.size}px`,
                height: `${stella.size}px`,
                opacity: stella.opacita,
                animationDuration: `${stella.durata}s`,
                animationDelay: `${stella.ritardo}s`,
              }}
            />
          ))}
        </div>

        {/* ETICHETTA */}
        <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-xs font-bold text-cyan-300 backdrop-blur">
          {continenteAttivo
            ? CONTINENTI.find(
                (c) => c.codice === continenteAttivo
              )?.nome
            : "PIANETA TERRA"}
        </div>

        {/* ISTRUZIONI */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-30 rounded-lg bg-slate-950/75 px-3 py-2 text-xs text-slate-300 backdrop-blur">
          <span className="hidden sm:inline">
            Trascina per ruotare · Scorri per zoomare · Clicca uno Stato
          </span>

          <span className="sm:hidden">
            Trascina per ruotare · Tocca uno Stato
          </span>
        </div>

        {/* GLOBO 3D */}
        <div className="relative z-10">
          <Globe
            ref={globeRef}
            width={larghezza}
            height={480}
            backgroundColor="rgba(0,0,0,0)"
            rendererConfig={{
              alpha: true,
              antialias: true,
            }}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            showAtmosphere
            atmosphereColor="#38bdf8"
            atmosphereAltitude={0.17}
            showGraticules
            polygonsData={features}
            polygonCapColor={(elemento: object) =>
              colorePaese(elemento as GeoFeature)
            }
            polygonSideColor={() => "rgba(15, 23, 42, 0.45)"}
            polygonStrokeColor={() => "rgba(186, 220, 255, 0.75)"}
            polygonAltitude={(elemento: object) => {
              const paeseGeo = elemento as GeoFeature;
              const codice = codicePaese(paeseGeo);

              if (codice === paeseSelezionato) {
                return 0.025;
              }

              return trovaPaese(paeseGeo) ? 0.012 : 0.004;
            }}
            polygonLabel={(elemento: object) =>
              etichettaPaese(elemento as GeoFeature)
            }
            onPolygonClick={(elemento: object) =>
              selezionaPaese(elemento as GeoFeature)
            }
            onGlobeReady={() => {
              if (!globeRef.current) return;

              const controlli = globeRef.current.controls();

              if (controlli) {
                // Rotazione automatica disattivata.
                controlli.autoRotate = false;
                controlli.enableRotate = true;
                controlli.enableZoom = true;
                controlli.enablePan = false;
                controlli.enableDamping = true;
                controlli.dampingFactor = 0.08;
              }

              globeRef.current.pointOfView(
                {
                  lat: 20,
                  lng: 0,
                  altitude: 2.5,
                },
                0
              );
            }}
          />
        </div>
      </div>

      {/* LEGENDA */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-300">
          Legenda allenatori
        </h4>

        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {allenatoriLegenda.length === 0 ? (
            <p className="text-sm text-slate-500">
              Non ci sono ancora partecipazioni umane da rappresentare.
            </p>
          ) : (
            allenatoriLegenda.map((allenatore) => (
              <div
                key={allenatore.id}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{
                    backgroundColor: allenatore.colore,
                  }}
                />

                {allenatore.nome}
              </div>
            ))
          )}

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="h-3.5 w-3.5 rounded-full bg-amber-500" />
            Parità
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="h-3.5 w-3.5 rounded-full bg-slate-600" />
            Nessun dato
          </div>
        </div>
      </div>

      {/* DETTAGLIO PAESE */}
      {paeseSelezionatoData && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Dettaglio nazionale
              </p>

              <h4 className="mt-1 text-2xl font-black">
                {paeseSelezionatoData.nome}
              </h4>

              <p className="mt-1 text-sm text-slate-400">
                {paeseSelezionatoData.totale} partecipazioni
                complessive ai tornei
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPaeseSelezionato(null)}
              className="self-start rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Chiudi dettaglio ×
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {paeseSelezionatoData.allenatori.map(
              (allenatore, indice) => {
                const inParita =
                  paeseSelezionatoData.leaders.length > 1 &&
                  paeseSelezionatoData.leaders.some(
                    (leader) => leader.id === allenatore.id
                  );

                const leader =
                  paeseSelezionatoData.leaders.some(
                    (leader) => leader.id === allenatore.id
                  );

                return (
                  <div
                    key={allenatore.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-black text-slate-300">
                      {indice + 1}
                    </div>

                    <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor: inParita
                          ? "#f59e0b"
                          : coloreAllenatore(allenatore.nome),
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">
                        {allenatore.nome}
                      </p>

                      {leader && (
                        <p className="mt-0.5 text-xs font-bold text-cyan-400">
                          {inParita
                            ? "Allenatore a pari merito"
                            : "Allenatore principale"}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-black tabular-nums text-white">
                        {allenatore.partecipazioni}
                      </p>

                      <p className="text-xs text-slate-500">
                        {allenatore.partecipazioni === 1
                          ? "torneo"
                          : "tornei"}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}