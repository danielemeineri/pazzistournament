"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EntitaSerie, EventoSerie } from "@/lib/statistiche/serie";

type TipoSerie = "vittorie" | "imbattibilita";
type NomeColonna = "Squadra" | "Allenatore";
type DatiSerieGlobali = { squadre: EntitaSerie[]; partecipanti: EntitaSerie[] };
const ELEMENTI_PER_PAGINA = 10;

function coloreAllenatore(id: number | null): string {
  if (id === null) return "#94A3B8";
  const hue = ((Math.abs(id) * 137.508) % 360 + 360) % 360;
  return `hsl(${hue.toFixed(1)}, 68%, 52%)`;
}

function formattaData(data: Date | string | null): string {
  if (!data) return "Data non disponibile";
  const convertita = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(convertita.getTime())) return "Data non disponibile";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(convertita);
}

function ottieniSerie(entita: EntitaSerie, tipo: TipoSerie) {
  if (tipo === "vittorie") {
    return {
      record: entita.serie.recordVittorie,
      attuale: entita.serie.vittorieAttuali,
      migliorSerie: entita.serie.migliorVittorie,
      serieAttuale: entita.serie.vittorieInCorso,
    };
  }
  return {
    record: entita.serie.recordImbattibilita,
    attuale: entita.serie.imbattibilitaAttuale,
    migliorSerie: entita.serie.migliorImbattibilita,
    serieAttuale: entita.serie.imbattibilitaInCorso,
  };
}

function valoreVisualizzato(entita: EntitaSerie, tipo: TipoSerie) {
  const serie = ottieniSerie(entita, tipo);
  const inSuperamento = serie.serieAttuale.length > serie.record;
  return {
    ...serie,
    inSuperamento,
    valore: inSuperamento ? serie.attuale : serie.record,
    eventi: inSuperamento ? serie.serieAttuale : serie.migliorSerie,
  };
}

function raccogliEventi(dati: DatiSerieGlobali): EventoSerie[] {
  const eventi: EventoSerie[] = [];
  for (const entita of [...dati.squadre, ...dati.partecipanti]) {
    for (const tipo of ["vittorie", "imbattibilita"] as const) {
      const serie = ottieniSerie(entita, tipo);
      eventi.push(...serie.migliorSerie, ...serie.serieAttuale);
    }
  }
  return eventi;
}

function LegendaAllenatori({ eventi }: { eventi: EventoSerie[] }) {
  const allenatori = useMemo(() => {
    const mappa = new Map<string, { nome: string; id: number | null }>();
    for (const evento of eventi) {
      const id = evento.allenatoreId;
      const chiave = id === null ? "sconosciuto" : String(id);
      if (!mappa.has(chiave)) {
        mappa.set(chiave, { id, nome: evento.allenatoreNome ?? "Allenatore non registrato" });
      }
    }
    return [...mappa.entries()]
      .map(([chiave, allenatore]) => ({ chiave, ...allenatore, colore: coloreAllenatore(allenatore.id) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "it") || a.chiave.localeCompare(b.chiave));
  }, [eventi]);

  if (!allenatori.length) return null;
  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6" aria-label="Legenda dei colori degli allenatori">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-xl" aria-hidden="true">🎨</span>
        <h3 className="text-lg font-black">Legenda allenatori</h3>
        <span className="ml-auto rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-400">{allenatori.length}</span>
      </div>
      <p className="mb-4 text-sm leading-6 text-slate-400">Ogni colore identifica un allenatore e mantiene la stessa associazione in tutte le classifiche e nelle barre delle serie.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allenatori.map((allenatore) => (
          <div key={allenatore.chiave} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <span aria-hidden="true" className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: allenatore.colore }} />
            <span className="break-words text-sm font-bold text-slate-200">{allenatore.nome}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Le barre colorate rappresentano l’allenatore associato a ciascuna partita.</p>
    </section>
  );
}

function Stemma({ src, nome, dimensione = "h-8 w-8" }: { src?: string | null; nome: string; dimensione?: string }) {
  return src ? (
    <img src={src} alt={`Stemma ${nome}`} className={`${dimensione} shrink-0 object-contain`} />
  ) : (
    <span className={`${dimensione} flex shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm`} aria-label={`Stemma non disponibile per ${nome}`}>⚽</span>
  );
}



function DettagliPartita({ evento }: { evento: EventoSerie }) {
  return (
    <details className="group mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <Stemma
              src={evento.squadra.squadraStemma}
              nome={evento.squadra.squadraNome}
              dimensione="h-7 w-7"
            />

            <span className="max-w-[35%] break-words text-sm font-bold">
              {evento.squadra.squadraNome}
            </span>

            <span className="shrink-0 rounded-lg bg-slate-800 px-3 py-1 text-base font-black tabular-nums text-white">
              {evento.golFatti}–{evento.golSubiti}
            </span>

            <span className="max-w-[35%] break-words text-sm font-bold">
              {evento.avversaria.squadraNome}
            </span>

            <Stemma
              src={evento.avversaria.squadraStemma}
              nome={evento.avversaria.squadraNome}
              dimensione="h-7 w-7"
            />

            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-extrabold text-blue-300">
              {evento.partita.torneoNome}
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <span className="text-xs text-slate-500">
              {formattaData(evento.partita.dataPartita)}
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Allenatore: {evento.allenatoreNome ?? "Non registrato"}{" "}
          <span aria-hidden="true">·</span>{" "}
          <span className="text-blue-300 group-open:hidden">
            Dettagli +
          </span>
          <span className="hidden text-blue-300 group-open:inline">
            Nascondi −
          </span>
        </p>
      </summary>

      <div className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-sm">
        <p>
          <span className="text-slate-500">Competizione:</span>{" "}
          {evento.partita.torneoNome}
        </p>

        <p>
          <span className="text-slate-500">Esito:</span>{" "}
          {evento.esito === "V"
            ? "Vittoria"
            : evento.esito === "N"
              ? "Pareggio"
              : "Sconfitta"}
        </p>

        <Link
          href={`/tornei/${evento.partita.torneoId}/partite/${evento.partita.id}`}
          className="inline-flex font-bold text-blue-400 transition hover:text-blue-300"
        >
          Apri partita →
        </Link>
      </div>
    </details>
  );
}

function RigaSerie({ entita, tipo, nomeColonna, indice, scalaMassima }: { entita: EntitaSerie; tipo: TipoSerie; nomeColonna: NomeColonna; indice: number; scalaMassima: number }) {
  const serie = valoreVisualizzato(entita, tipo);
  const valore = serie.valore;
  const eventi = serie.eventi;
  const larghezza = Math.min(100, Math.max(0, (valore / scalaMassima) * 100));

  return (
    <details className="group border-b border-slate-800 last:border-b-0">
      <summary className="cursor-pointer list-none p-4 transition hover:bg-slate-800/50 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-5">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-800 px-2 text-xs font-black text-slate-400">{indice}</span>
              {nomeColonna === "Squadra" && <Stemma src={entita.stemma} nome={entita.nome} />}
              <span className="break-words font-black text-white">{entita.nome}</span>
              {serie.inSuperamento && <span className="rounded-full border border-green-500/30 bg-green-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-300">🔥 In corso · nuovo record</span>}
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800" role="img" aria-label={`${valore} partite consecutive`}>
              <div className="flex h-full overflow-hidden rounded-full transition-all" style={{ width: `${larghezza}%`, minWidth: valore > 0 ? 4 : 0 }}>
                {eventi.map((evento, i) => <span key={`${evento.partita.id}-${i}`} title={`${evento.allenatoreNome ?? "Allenatore non registrato"} · partita ${i + 1}`} className="h-full min-w-0 flex-1 border-r border-slate-950/60 last:border-r-0" style={{ backgroundColor: coloreAllenatore(evento.allenatoreId) }} />)}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{serie.inSuperamento ? "Serie attuale oltre il record precedente" : "Record storico concluso"} <span className="px-1">·</span> Espandi per vedere le partite</p>
          </div>
          <div className="min-w-[58px] text-right">
            <div className={`text-2xl font-black tabular-nums sm:text-3xl ${serie.inSuperamento ? "text-green-300" : "text-blue-300"}`}>{valore}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{valore === 1 ? "partita" : "partite"}</div>
          </div>
        </div>
      </summary>
      <div className="border-t border-slate-800 bg-slate-950/40 px-4 py-4 sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">{serie.inSuperamento ? <>Nuovo record in corso: <strong className="text-green-300">{serie.attuale} {serie.attuale === 1 ? "partita" : "partite"}</strong> consecutive (record precedente: {serie.record}).</> : <>Record storico: <strong className="text-blue-300">{serie.record} {serie.record === 1 ? "partita" : "partite"}</strong> consecutive.</>}</p>
          {nomeColonna === "Squadra" && <Link href={`/squadre/${entita.id}`} className="text-sm font-bold text-blue-400 hover:text-blue-300">Apri scheda squadra →</Link>}
        </div>
        {eventi.length === 0 ? <p className="text-sm text-slate-500">Nessun dettaglio disponibile.</p> : (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Partite in ordine cronologico · dalla più vecchia alla più recente</p>
            {eventi.map((evento, i) => (
              <div key={`${evento.partita.id}-${evento.squadra.squadraId}-${i}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-400">{i + 1}</span>
                <div className="min-w-0 border-l-2 pl-3" style={{ borderColor: coloreAllenatore(evento.allenatoreId) }}>
                  <DettagliPartita evento={evento} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function ClassificaSerie({ entita, tipo, nomeColonna }: { entita: EntitaSerie[]; tipo: TipoSerie; nomeColonna: NomeColonna }) {
  const [pagina, setPagina] = useState(0);
  const ordinata = useMemo(() => [...entita].filter((elemento) => valoreVisualizzato(elemento, tipo).valore > 0).sort((a, b) => {
    const sa = valoreVisualizzato(a, tipo);
    const sb = valoreVisualizzato(b, tipo);
    return sb.valore - sa.valore || sb.record - sa.record || a.nome.localeCompare(b.nome, "it");
  }), [entita, tipo]);

  const totalePagine = Math.ceil(ordinata.length / ELEMENTI_PER_PAGINA);
  const paginaCorrente = Math.min(pagina, Math.max(0, totalePagine - 1));
  const elementiVisibili = ordinata.slice(paginaCorrente * ELEMENTI_PER_PAGINA, (paginaCorrente + 1) * ELEMENTI_PER_PAGINA);
  const scalaMassima = Math.max(1, ...ordinata.map((elemento) => valoreVisualizzato(elemento, tipo).valore));
  const titolo = tipo === "vittorie" ? "Vittorie consecutive" : "Imbattibilità consecutiva";
  const nomeSingolare = nomeColonna === "Squadra" ? "squadra" : "allenatore";
  const nomePlurale = nomeColonna === "Squadra" ? "squadre" : "allenatori";

  return (
    <section className="mb-7 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="border-b border-slate-800 p-5 sm:p-6">
        <h4 className="text-xl font-black">{titolo}</h4>
        <p className="mt-1 text-sm text-slate-400">{ordinata.length} {ordinata.length === 1 ? nomeSingolare : nomePlurale} · record storico in primo piano</p>
      </div>
      {ordinata.length === 0 ? <p className="p-6 text-sm text-slate-500">Nessuna serie registrata.</p> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/40 px-4 py-3 sm:px-5">
          <label className="flex items-center gap-2 text-sm text-slate-400">Mostra {nomePlurale}:
            <select value={paginaCorrente} onChange={(e) => setPagina(Number(e.target.value))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
              {Array.from({ length: totalePagine }, (_, i) => <option key={i} value={i}>{i * ELEMENTI_PER_PAGINA + 1}–{Math.min((i + 1) * ELEMENTI_PER_PAGINA, ordinata.length)}</option>)}
            </select>
          </label>
          <span className="text-xs text-slate-500">{paginaCorrente * ELEMENTI_PER_PAGINA + 1}–{Math.min((paginaCorrente + 1) * ELEMENTI_PER_PAGINA, ordinata.length)} di {ordinata.length}</span>
        </div>
        <div>{elementiVisibili.map((elemento, i) => <RigaSerie key={elemento.id} entita={elemento} tipo={tipo} nomeColonna={nomeColonna} indice={paginaCorrente * ELEMENTI_PER_PAGINA + i + 1} scalaMassima={scalaMassima} />)}</div>
        {totalePagine > 1 && <div className="flex items-center justify-between gap-3 border-t border-slate-800 p-4">
          <button type="button" disabled={paginaCorrente === 0} onClick={() => setPagina((p) => Math.max(0, p - 1))} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">← Precedenti 10</button>
          <span className="text-xs text-slate-500">Pagina {paginaCorrente + 1} di {totalePagine}</span>
          <button type="button" disabled={paginaCorrente >= totalePagine - 1} onClick={() => setPagina((p) => Math.min(totalePagine - 1, p + 1))} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Successivi 10 →</button>
        </div>}
      </>}
    </section>
  );
}


export default function SerieGlobaliClient({ dati }: { dati: DatiSerieGlobali }) {
  const partecipantiSenzaCPU = useMemo(
    () =>
      dati.partecipanti.filter(
        (partecipante) =>
          partecipante.nome.trim().toLocaleLowerCase("it") !== "cpu"
      ),
    [dati.partecipanti]
  );

  const datiSenzaCPU = useMemo(
    () => ({
      squadre: dati.squadre,
      partecipanti: partecipantiSenzaCPU,
    }),
    [dati.squadre, partecipantiSenzaCPU]
  );

  const eventiLegenda = useMemo(
    () => raccogliEventi(datiSenzaCPU),
    [datiSenzaCPU]
  );

  return (
    <section className="my-12">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-green-400">
          Record e continuità
        </p>
        <h2 className="mt-2 text-3xl font-black">
          🔥 Serie storiche e attuali
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Le classifiche mostrano i record conclusi. Quando una serie attuale
          supera il precedente primato, viene evidenziata come nuovo record in
          corso. Espandi una riga per consultare i risultati, gli stemmi e i
          dettagli delle partite.
        </p>
      </div>

      <LegendaAllenatori eventi={eventiLegenda} />

      <div className="mb-10">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-xl">
            🏟️
          </span>
          <div>
            <h3 className="text-2xl font-black">Squadre</h3>
            <p className="text-sm text-slate-400">
              Serie consecutive per ciascuna squadra
            </p>
          </div>
        </div>

        <ClassificaSerie
          entita={dati.squadre}
          tipo="vittorie"
          nomeColonna="Squadra"
        />
        <ClassificaSerie
          entita={dati.squadre}
          tipo="imbattibilita"
          nomeColonna="Squadra"
        />
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-xl">
            👤
          </span>
          <div>
            <h3 className="text-2xl font-black">
              Allenatori
            </h3>
            <p className="text-sm text-slate-400">
              Serie consecutive attribuite ai partecipanti delle partite
            </p>
          </div>
        </div>

        <ClassificaSerie
          entita={partecipantiSenzaCPU}
          tipo="vittorie"
          nomeColonna="Allenatore"
        />
        <ClassificaSerie
          entita={partecipantiSenzaCPU}
          tipo="imbattibilita"
          nomeColonna="Allenatore"
        />
      </div>
    </section>
  );
}
