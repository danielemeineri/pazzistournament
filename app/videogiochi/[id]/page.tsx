
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  aggiungiRating,
  modificaRating,
  rimuoviRating,
} from "./actions";
import { isAdmin } from "@/lib/auth";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

// =========================================================
// CARD RATING
// =========================================================

function RatingCard({
  valutazione,
  videogiocoId,
  admin,
}: {
  valutazione: {
    id: number;
    valutazione: number;
    squadra: {
      id: number;
      nome: string;
      tipo: string;
      nazione: string | null;
      stemma: string | null;
    };
  };
  videogiocoId: number;
  admin: boolean;
}) {
  const squadra = valutazione.squadra;

  return (
    <div className="group relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-br from-[#172943] via-[#101c30] to-[#0a1323] p-5 shadow-[0_18px_50px_rgba(0,0,0,.25)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-[0_25px_70px_rgba(15,33,60,.5)]">
      <div className="flex items-center gap-4">
        {squadra.stemma ? (
          <img
            src={squadra.stemma}
            alt={`Stemma ${squadra.nome}`}
            className="h-16 w-16 rounded-xl object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,.5)] transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-2xl">
            ⚽
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-white">
            {squadra.nome}
          </h3>

          <p className="text-sm text-gray-400">
            {squadra.tipo === "Nazionale"
              ? "Nazionale"
              : squadra.nazione || "Club"}
          </p>
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/25 to-amber-500/5 shadow-[0_0_28px_rgba(251,191,36,.12)]">
          <span className="text-3xl font-black tracking-tight text-amber-200">
            {valutazione.valutazione}
          </span>
        </div>
      </div>

      {admin && (
        <>
          <form
            action={modificaRating.bind(
              null,
              videogiocoId,
              squadra.id
            )}
            className="mt-5"
          >
            <div className="flex gap-3">
              <input
                type="number"
                name="valutazione"
                min="1"
                max="100"
                defaultValue={valutazione.valutazione}
                required
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-amber-300"
              />

              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#f2d6a2] to-[#d7a85b] px-5 py-3 font-black text-[#152034] transition hover:brightness-110"
              >
                Salva
              </button>
            </div>
          </form>

          <form
            action={rimuoviRating.bind(
              null,
              videogiocoId,
              squadra.id
            )}
            className="mt-3"
          >
            <button
              type="submit"
              className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              🗑️ Rimuovi dal videogioco
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// =========================================================
// CARD SQUADRA SENZA RATING
// =========================================================

function SquadraDaValutareCard({
  squadra,
  videogiocoId,
  admin,
}: {
  squadra: {
    id: number;
    nome: string;
    tipo: string;
    nazione: string | null;
    stemma: string | null;
  };
  videogiocoId: number;
  admin: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-br from-[#14263e] to-[#0c1628] p-5 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/35">
      <div className="flex items-center gap-4">
        {squadra.stemma ? (
          <img
            src={squadra.stemma}
            alt={`Stemma ${squadra.nome}`}
            className="h-14 w-14 rounded-xl object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
            ⚽
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">{squadra.nome}</h3>
          <p className="text-sm text-gray-400">
            {squadra.tipo === "Nazionale"
              ? "Nazionale"
              : squadra.nazione || "Club"}
          </p>
        </div>
      </div>

      {admin && (
        <form
          action={aggiungiRating.bind(null, videogiocoId)}
          className="mt-4 flex gap-3"
        >
          <input
            type="hidden"
            name="squadraId"
            value={squadra.id}
          />

          <input
            type="number"
            name="valutazione"
            min="1"
            max="100"
            placeholder="Rating"
            required
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-300"
          />

          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[#f2d6a2] to-[#d7a85b] px-4 py-3 font-black text-[#152034] transition hover:brightness-110"
          >
            Aggiungi
          </button>
        </form>
      )}
    </div>
  );
}

// =========================================================
// CARD AGGIUNTA MANUALE
// =========================================================

function SquadraManualeCard({
  squadra,
  videogiocoId,
}: {
  squadra: {
    id: number;
    nome: string;
    tipo: string;
    nazione: string | null;
    stemma: string | null;
  };
  videogiocoId: number;
}) {
  return (
    <form
      action={aggiungiRating.bind(null, videogiocoId)}
      className="group rounded-[1.5rem] border border-white/10 bg-[#101c30]/95 p-5 transition-all duration-300 hover:border-amber-300/30"
    >
      <input
        type="hidden"
        name="squadraId"
        value={squadra.id}
      />

      <div className="mb-4 flex items-center gap-3">
        {squadra.stemma ? (
          <img
            src={squadra.stemma}
            alt={`Stemma ${squadra.nome}`}
            className="h-12 w-12 object-contain drop-shadow-lg"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            ⚽
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate font-bold">{squadra.nome}</p>
          <p className="text-xs text-gray-500">
            {squadra.tipo === "Nazionale"
              ? "Nazionale"
              : squadra.nazione || "Club"}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="number"
          name="valutazione"
          min="1"
          max="100"
          placeholder="Rating"
          required
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-amber-300"
        />

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-[#f2d6a2] to-[#d7a85b] px-4 py-2 font-black text-[#152034] transition hover:brightness-110"
        >
          Aggiungi
        </button>
      </div>
    </form>
  );
}

// =========================================================
// PAGINA
// =========================================================

export default async function VideogiocoPage({
  params,
}: PageProps) {
  const { id } = await params;
  const videogiocoId = Number(id);

  if (!Number.isInteger(videogiocoId) || videogiocoId <= 0) {
    notFound();
  }

  const [admin, videogioco] = await Promise.all([
    isAdmin(),
    prisma.videogioco.findUnique({
      where: {
        id: videogiocoId,
      },
      include: {
        _count: {
          select: {
            tornei: true,
            valutazioniSquadre: true,
          },
        },
        valutazioniSquadre: {
          include: {
            squadra: true,
          },
          orderBy: {
            squadra: {
              nome: "asc",
            },
          },
        },
      },
    }),
  ]);

  if (!videogioco) {
    notFound();
  }

  // Squadre utilizzate nei tornei collegati al videogioco.
  const partecipazioni = await prisma.partecipazione.findMany({
    where: {
      torneo: {
        videogiocoId,
      },
    },
    include: {
      squadra: true,
    },
  });

  // Deduplicazione delle squadre rilevate.
  const squadreRilevateMap = new Map<
    number,
    (typeof partecipazioni)[number]["squadra"]
  >();

  for (const partecipazione of partecipazioni) {
    squadreRilevateMap.set(
      partecipazione.squadra.id,
      partecipazione.squadra
    );
  }

  const squadreRilevate = Array.from(
    squadreRilevateMap.values()
  );

  // Squadre che hanno già un rating.
  const squadreConRating = new Set(
    videogioco.valutazioniSquadre.map(
      (valutazione) => valutazione.squadra.id
    )
  );

  // Squadre rilevate senza rating.
  const squadreDaValutare = squadreRilevate.filter(
    (squadra) => !squadreConRating.has(squadra.id)
  );

  // Archivio completo: necessario solo per l'aggiunta manuale.
  // Le informazioni pubbliche rimangono disponibili a tutti.
  const tutteLeSquadre = await prisma.squadra.findMany({
    orderBy: [
      { tipo: "asc" },
      { nazione: "asc" },
      { nome: "asc" },
    ],
  });

  const squadreManuali = tutteLeSquadre.filter(
    (squadra) => !squadreConRating.has(squadra.id)
  );

  // Rating nazionali.
  const ratingNazionali = videogioco.valutazioniSquadre
    .filter(
      (valutazione) =>
        valutazione.squadra.tipo === "Nazionale"
    )
    .sort((a, b) =>
      a.squadra.nome.localeCompare(b.squadra.nome, "it")
    );

  // Rating club.
  const ratingClub = videogioco.valutazioniSquadre
    .filter(
      (valutazione) =>
        valutazione.squadra.tipo !== "Nazionale"
    )
    .sort((a, b) => {
      const nazioneA =
        a.squadra.nazione || "Senza nazione";
      const nazioneB =
        b.squadra.nazione || "Senza nazione";

      const confronto = nazioneA.localeCompare(
        nazioneB,
        "it"
      );

      if (confronto !== 0) return confronto;

      return a.squadra.nome.localeCompare(
        b.squadra.nome,
        "it"
      );
    });

  // Raggruppamento dei club con rating per nazione.
  const clubPerNazione = new Map<
    string,
    typeof ratingClub
  >();

  for (const valutazione of ratingClub) {
    const nazione =
      valutazione.squadra.nazione || "Senza nazione";

    if (!clubPerNazione.has(nazione)) {
      clubPerNazione.set(nazione, []);
    }

    clubPerNazione.get(nazione)!.push(valutazione);
  }

  // Nazionali rilevate senza rating.
  const nazionaliDaValutare = squadreDaValutare
    .filter((squadra) => squadra.tipo === "Nazionale")
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "it")
    );

  // Club rilevati senza rating.
  const clubDaValutare = squadreDaValutare
    .filter((squadra) => squadra.tipo !== "Nazionale")
    .sort((a, b) => {
      const nazioneA =
        a.nazione || "Senza nazione";
      const nazioneB =
        b.nazione || "Senza nazione";

      const confronto = nazioneA.localeCompare(
        nazioneB,
        "it"
      );

      if (confronto !== 0) return confronto;

      return a.nome.localeCompare(b.nome, "it");
    });

  const clubDaValutarePerNazione = new Map<
    string,
    typeof clubDaValutare
  >();

  for (const squadra of clubDaValutare) {
    const nazione =
      squadra.nazione || "Senza nazione";

    if (!clubDaValutarePerNazione.has(nazione)) {
      clubDaValutarePerNazione.set(nazione, []);
    }

    clubDaValutarePerNazione.get(nazione)!.push(squadra);
  }

  // Squadre dell'archivio non ancora associate al videogioco.
  const nazionaliManuali = squadreManuali
    .filter((squadra) => squadra.tipo === "Nazionale")
    .sort((a, b) =>
      a.nome.localeCompare(b.nome, "it")
    );

  const clubManuali = squadreManuali
    .filter((squadra) => squadra.tipo !== "Nazionale")
    .sort((a, b) => {
      const nazioneA =
        a.nazione || "Senza nazione";
      const nazioneB =
        b.nazione || "Senza nazione";

      const confronto = nazioneA.localeCompare(
        nazioneB,
        "it"
      );

      if (confronto !== 0) return confronto;

      return a.nome.localeCompare(b.nome, "it");
    });

  const clubManualiPerNazione = new Map<
    string,
    typeof clubManuali
  >();

  for (const squadra of clubManuali) {
    const nazione =
      squadra.nazione || "Senza nazione";

    if (!clubManualiPerNazione.has(nazione)) {
      clubManualiPerNazione.set(nazione, []);
    }

    clubManualiPerNazione.get(nazione)!.push(squadra);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080f1d] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-60 top-32 h-[650px] w-[650px] rounded-full bg-blue-600/[0.07] blur-[130px]" />
        <div className="absolute -right-52 top-[680px] h-[600px] w-[600px] rounded-full bg-amber-400/[0.05] blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <Link href="/videogiochi" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-amber-200/30 hover:text-white">
            ← Archivio videogiochi
          </Link>
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-amber-200/60">PazziTournament / Game Library</span>
        </div>

        <header className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#172d4c] via-[#10203a] to-[#0b1528] shadow-[0_30px_90px_rgba(0,0,0,.35)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-24 -top-44 h-[580px] w-[580px] rotate-[25deg] rounded-[6rem] border border-amber-200/20" />
            <div className="absolute -right-10 -top-20 h-[420px] w-[420px] rotate-[25deg] rounded-[5rem] border border-blue-300/20" />
            <div className="absolute right-[-8%] top-[-35%] h-[560px] w-[560px] rounded-full bg-blue-400/15 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
          </div>
          <div className="relative z-10 flex min-h-[340px] flex-col justify-center px-6 py-12 sm:px-10 lg:min-h-[390px] lg:px-14">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="h-[2px] w-9 bg-amber-200" />
              <span className="text-[11px] font-black uppercase tracking-[.28em] text-amber-200">Scheda videogioco</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">{videogioco.anno || "Anno non specificato"}</span>
            </div>
            <h1 className="max-w-4xl break-words text-[clamp(2.7rem,6vw,5.5rem)] font-black leading-[1.02] tracking-[-.06em] text-white">{videogioco.nome}</h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              {admin
                ? "Esplora le squadre, confronta le valutazioni e gestisci i rating di questa edizione."
                : "Esplora le squadre associate a questa edizione e confronta le loro valutazioni."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#rating-squadre" className="inline-flex items-center gap-2 rounded-xl bg-[#eac991] px-5 py-3 text-sm font-black text-[#0b1528] transition hover:bg-[#ffe0a9]">Esplora i rating <span aria-hidden="true">↓</span></a>
              {admin && <a href="#gestione-rating" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Gestione squadre <span aria-hidden="true">↓</span></a>}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-5 right-7 text-[10px] font-bold uppercase tracking-[.3em] text-amber-200/35">Game Edition</div>
        </header>

        {/* Statistiche */}
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-br from-[#14263e] to-[#0c1628] p-5 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/35">
            <p className="text-sm text-gray-400">Tornei</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-[#f2d6a2]">
              {videogioco._count.tornei}
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-br from-[#14263e] to-[#0c1628] p-5 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/35">
            <p className="text-sm text-gray-400">
              Squadre con rating
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight text-[#f2d6a2]">
              {videogioco._count.valutazioniSquadre}
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-br from-[#14263e] to-[#0c1628] p-5 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/35">
            <p className="text-sm text-gray-400">
              Squadre rilevate nei tornei
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight text-[#f2d6a2]">
              {squadreRilevate.length}
            </p>
          </div>
        </div>

        <div id="rating-squadre" className="scroll-mt-8" />

        {/* Squadre rilevate senza rating */}
        {squadreDaValutare.length > 0 && (
          <section className="mb-16 scroll-mt-8">
            <div className="mb-7 border-l-2 border-[#eac991]/70 pl-5">
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Squadre rilevate dai tuoi tornei
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Queste squadre sono state utilizzate nei tornei
                di {videogioco.nome}, ma non hanno ancora un
                rating.
              </p>
            </div>

            {nazionaliDaValutare.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-5 text-xl font-black text-slate-100">
                  🌍 Nazionali
                </h3>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {nazionaliDaValutare.map((squadra) => (
                    <SquadraDaValutareCard
                      key={squadra.id}
                      squadra={squadra}
                      videogiocoId={videogiocoId}
                      admin={admin}
                    />
                  ))}
                </div>
              </div>
            )}

            {clubDaValutarePerNazione.size > 0 && (
              <div>
                <h3 className="mb-5 text-xl font-black text-slate-100">
                  🏟️ Club
                </h3>

                <div className="space-y-8">
                  {Array.from(
                    clubDaValutarePerNazione.entries()
                  ).map(([nazione, squadre]) => (
                    <div key={nazione}>
                      <h4 className="mb-4 text-lg font-bold text-amber-100/90">
                        {nazione}
                      </h4>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {squadre.map((squadra) => (
                          <SquadraDaValutareCard
                            key={squadra.id}
                            squadra={squadra}
                            videogiocoId={videogiocoId}
                            admin={admin}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Nazionali con rating */}
        {ratingNazionali.length > 0 && (
          <section className="mb-16 scroll-mt-8">
            <div className="mb-7 border-l-2 border-[#eac991]/70 pl-5">
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">🌍 Nazionali</h2>
              <p className="mt-2 text-sm text-gray-400">
                Nazionali associate a {videogioco.nome}.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {ratingNazionali.map((valutazione) => (
                <RatingCard
                  key={valutazione.id}
                  valutazione={valutazione}
                  videogiocoId={videogiocoId}
                  admin={admin}
                />
              ))}
            </div>
          </section>
        )}

        {/* Club con rating */}
        {ratingClub.length > 0 && (
          <section className="mb-16 scroll-mt-8">
            <div className="mb-7 border-l-2 border-[#eac991]/70 pl-5">
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">🏟️ Club</h2>
              <p className="mt-2 text-sm text-gray-400">
                Club associati a {videogioco.nome}, organizzati
                per nazione.
              </p>
            </div>

            <div className="space-y-10">
              {Array.from(clubPerNazione.entries()).map(
                ([nazione, valutazioni]) => (
                  <div key={nazione}>
                    <h3 className="mb-5 text-xl font-bold text-amber-100/90">
                      {nazione}
                    </h3>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {valutazioni.map((valutazione) => (
                        <RatingCard
                          key={valutazione.id}
                          valutazione={valutazione}
                          videogiocoId={videogiocoId}
                          admin={admin}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* Aggiunta manuale: solo amministratore */}
        {admin && (
          <section id="gestione-rating" className="mt-14 scroll-mt-8 rounded-[2rem] border border-amber-200/20 bg-gradient-to-br from-[#172940] to-[#0b1527] p-5 shadow-2xl sm:p-8">
            <details>
              <summary className="cursor-pointer list-none text-xl font-black text-amber-100 transition hover:text-white sm:text-2xl">
                ➕ Aggiungi manualmente un'altra squadra
              </summary>

              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="mb-6 text-sm text-gray-400">
                  Qui puoi aggiungere una squadra dell'archivio
                  generale anche se non è stata ancora rilevata
                  nei tornei di {videogioco.nome}.
                </p>

                {nazionaliManuali.length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-4 text-lg font-bold">
                      🌍 Nazionali
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {nazionaliManuali.map((squadra) => (
                        <SquadraManualeCard
                          key={squadra.id}
                          squadra={squadra}
                          videogiocoId={videogiocoId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {clubManualiPerNazione.size > 0 && (
                  <div>
                    <h3 className="mb-4 text-lg font-bold">
                      🏟️ Club
                    </h3>

                    <div className="space-y-8">
                      {Array.from(
                        clubManualiPerNazione.entries()
                      ).map(([nazione, squadre]) => (
                        <div key={nazione}>
                          <h4 className="mb-4 font-bold text-gray-300">
                            {nazione}
                          </h4>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {squadre.map((squadra) => (
                              <SquadraManualeCard
                                key={squadra.id}
                                squadra={squadra}
                                videogiocoId={videogiocoId}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {squadreManuali.length === 0 && (
                  <p className="text-gray-400">
                    Tutte le squadre dell'archivio hanno già un
                    rating per questo videogioco.
                  </p>
                )}
              </div>
            </details>
          </section>
        )}

        {/* Navigazione */}
        <div className="mt-14 flex flex-wrap gap-3 border-t border-white/10 pt-8">
          <Link
            href="/videogiochi"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
          >
            ← Torna ai videogiochi
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3 font-semibold text-yellow-400 transition hover:bg-yellow-500/20"
          >
            🏠 Home
          </Link>
        </div>
      </div>
    </main>
  );
}
