import { prisma } from "@/lib/prisma";
import { getStatisticheGlobali } from "@/lib/statistiche/globali";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const includeNome = (domanda: string, nome: string) => (` ${norm(domanda)} `).includes(` ${norm(nome)} `);
const fmt = (n: number) => n.toLocaleString("it-IT");
const richiesteGol = (s: string) => /\b(gol|goal|reti|marcator|capocannonier|segnat)\b/.test(s) || /capocannonier|marcator|segnat/.test(s);
const richiesteClassifica = (s: string) => /classifica|top |miglior|piu gol|capocannonier|record/.test(s);

/** Restituisce null quando la domanda appartiene al motore preesistente. */
export async function rispondiDomandaEntita(domanda: string, contestoTorneoId?: number | null): Promise<{ risposta: string; torneoId?: number } | null> {
  const testo = norm(domanda);
  const tornei = await prisma.torneo.findMany({ select: { id: true, nome: true, anno: true, tipo: true, videogioco: true, gioco: { select: { nome: true } } } });
  const torneiCitati = tornei.filter(t => includeNome(domanda, `${t.nome} ${t.anno}`) || (includeNome(domanda, t.nome) && (new RegExp(`\\b${t.anno}\\b`).test(testo))));
  const esplicito = torneiCitati.length === 1 ? torneiCitati[0] : null;
  const riferimento = /\b(quel torneo|del torneo|dello stesso torneo|in quel torneo|di quell edizione|e chi|e quale|e quanti)\b/.test(testo);
  const torneo = esplicito ?? (riferimento && contestoTorneoId ? tornei.find(t => t.id === contestoTorneoId) : null);
  const chiedeTorneo = Boolean(torneo) || /\b(torneo|tornei|edizione|edizioni|mondiale|europeo|europei|copa america|coppa)\b/.test(testo);

  if (torneiCitati.length > 1 && chiedeTorneo) return { risposta: "Ho trovato più edizioni corrispondenti. Specifica il nome e l'anno del torneo." };

  if (torneo && chiedeTorneo) {
    const partite = await prisma.partita.findMany({ where: { TorneoId: torneo.id }, select: { Completata: true, GolCasa: true, GolOspite: true, squadraCasa: { select: { nome: true } }, squadraOspite: { select: { nome: true } } } });
    const concluse = partite.filter(p => p.Completata === true && p.GolCasa != null && p.GolOspite != null);
    const finito = partite.length > 0 && partite.every(p => p.Completata === true);
    const titolo = `${torneo.nome} ${torneo.anno}`;
    const golTotali = concluse.reduce((sum, p) => sum + (p.GolCasa ?? 0) + (p.GolOspite ?? 0), 0);
    const scope = { partita: { TorneoId: torneo.id, Completata: true }, tipo: { not: "AUTOGOL" as const } };
    const marcatori = await prisma.gol.findMany({ where: scope, select: { calciatoreTorneo: { select: { calciatore: { select: { nome: true } } } } } });
    const contatori = new Map<string, number>();
    for (const gol of marcatori) { const nome = gol.calciatoreTorneo.calciatore.nome; contatori.set(nome, (contatori.get(nome) ?? 0) + 1); }
    const top = [...contatori].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0], "it"));
    const conContesto = (risposta: string) => ({ risposta, torneoId: torneo.id });
    if (/capocannonier|marcator|chi ha segnato piu/.test(testo)) return conContesto(top.length ? `Marcatori di ${titolo} (eventi gol registrati, autogol esclusi):\n${top.slice(0, 10).map(([n,g],i) => `${i+1}. ${n}: ${g} gol`).join("\n")}` : `Non risultano marcatori registrati per ${titolo}.`);
    if (/vincitor|chi ha vinto|campion|chi si e aggiudicat/.test(testo)) {
      if (!finito) return conContesto(`${titolo} non risulta ancora completamente concluso: non posso indicare un vincitore definitivo.`);
      const trofeo = await prisma.trofeo.findFirst({ where: { torneoId: torneo.id, tipo: "VINCITORE_TORNEO" }, select: { squadraVincitrice: { select: { nome: true } }, partecipanteVincitore: { select: { nome: true } } } });
      if (!trofeo?.squadraVincitrice) return conContesto(`Il torneo ${titolo} è concluso, ma il trofeo del vincitore non risulta assegnato nel database.`);
      return conContesto(`Vincitrice di ${titolo}: ${trofeo.squadraVincitrice.nome}.${trofeo.partecipanteVincitore ? ` Allenatore vincitore: ${trofeo.partecipanteVincitore.nome}.` : ""}`);
    }
    if (/partita con piu gol|partita piu ricca|maggior numero di gol in una partita/.test(testo)) {
      const p = [...concluse].sort((a,b) => (b.GolCasa! + b.GolOspite!) - (a.GolCasa! + a.GolOspite!))[0];
      return conContesto(p ? `La partita con più gol di ${titolo} è ${p.squadraCasa?.nome} ${p.GolCasa}-${p.GolOspite} ${p.squadraOspite?.nome}, con ${(p.GolCasa ?? 0)+(p.GolOspite ?? 0)} reti.` : `Non risultano partite concluse per ${titolo}.`);
    }
    if (/squadre partecipanti|quali squadre|chi partecipa|partecipant/.test(testo)) {
      const iscritti = await prisma.partecipazione.findMany({ where: { torneoId: torneo.id }, select: { squadra: { select: { nome: true } } } });
      const nomi = [...new Set(iscritti.map(p => p.squadra.nome))].sort((a,b) => a.localeCompare(b,"it"));
      return conContesto(nomi.length ? `Squadre partecipanti a ${titolo} (${nomi.length}): ${nomi.join(", ")}.` : `Non risultano squadre iscritte a ${titolo}.`);
    }
    if (/gol|reti|media|statistic|partite|risultat|stato/.test(testo)) return conContesto(`${titolo}: ${concluse.length}/${partite.length} partite concluse, ${fmt(golTotali)} gol dai risultati, media ${concluse.length ? (golTotali/concluse.length).toFixed(2).replace(".",",") : "0"} gol per partita conclusa. Stato: ${finito ? "concluso" : "in corso"}.`);
    return conContesto(`${titolo} (${torneo.gioco?.nome ?? torneo.videogioco ?? "videogioco non indicato"}): ${concluse.length}/${partite.length} partite concluse. Puoi chiedermi il vincitore, i marcatori, le squadre partecipanti e i record.`);
  }

  // Domande sui singoli calciatori: i nomi vengono letti dal database, non inventati.
  const calciatori = await prisma.calciatore.findMany({ select: { id: true, nome: true } });
  const calciatore = calciatori.filter(c => includeNome(domanda,c.nome)).sort((a,b) => b.nome.length - a.nome.length)[0];
  if (calciatore && (richiesteGol(testo) || /calciator|giocator|statistic/.test(testo))) {
    const gol = await prisma.gol.findMany({ where: { tipo: { not: "AUTOGOL" }, partita: { Completata: true }, calciatoreTorneo: { calciatoreId: calciatore.id } }, select: { calciatoreTorneo: { select: { squadra: { select: { nome: true } } } } } });
    const perSquadra = new Map<string,number>();
    for (const g of gol) { const n = g.calciatoreTorneo.squadra.nome; perSquadra.set(n,(perSquadra.get(n)??0)+1); }
    return { risposta: `${calciatore.nome} ha segnato ${gol.length} gol registrati nelle partite concluse (autogol esclusi).${perSquadra.size ? `\nPer squadra: ${[...perSquadra].sort((a,b)=>b[1]-a[1]).map(([n,g])=>`${n}: ${g}`).join(", ")}.` : ""}` };
  }
  if (/capocannonier|classifica marcator|migliori marcator/.test(testo) && !chiedeTorneo) {
    const gol = await prisma.gol.findMany({ where: { tipo: { not: "AUTOGOL" }, partita: { Completata: true } }, select: { calciatoreTorneo: { select: { calciatore: { select: { nome: true } } } } } });
    const map = new Map<string,number>(); for (const g of gol) { const n = g.calciatoreTorneo.calciatore.nome; map.set(n,(map.get(n)??0)+1); }
    const top = [...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"it")).slice(0,10);
    return { risposta: top.length ? `Classifica marcatori assoluta (eventi gol registrati, autogol esclusi):\n${top.map(([n,g],i)=>`${i+1}. ${n}: ${g} gol`).join("\n")}` : "Non risultano gol attribuiti a calciatori nelle partite concluse." };
  }
  const squadre = await prisma.squadra.findMany({ select: { id: true, nome: true } });
  const squadra = squadre.filter(s => includeNome(domanda,s.nome)).sort((a,b)=>b.nome.length-a.nome.length)[0];
  if (squadra && /vittor|sconfitt|paregg|gol|reti|statistic|rendimento|partite|percentuale|differenza/.test(testo)) {
    const dati = await getStatisticheGlobali();
    const s = dati.squadre.find(x => x.squadraId === squadra.id);
    return { risposta: s ? `${s.nome}: ${s.partite} partite concluse, ${s.vittorie} vittorie, ${s.pareggi} pareggi, ${s.sconfitte} sconfitte. Gol fatti: ${s.golFatti}; subiti: ${s.golSubiti}; differenza reti: ${s.differenzaReti > 0 ? "+" : ""}${s.differenzaReti}. Percentuale di vittorie: ${s.percentualeVittorie.toFixed(1).replace(".",",")}%.` : `Non risultano statistiche di partite concluse per ${squadra.nome}.` };
  }
  // La classificazione delle domande generiche rimane affidata al motore globale già esistente.
  if (chiedeTorneo && /quanti tornei|numero di tornei|tornei ci sono/.test(testo)) return { risposta: `Sono registrati ${tornei.length} tornei nel database.` };
  return null;
}
