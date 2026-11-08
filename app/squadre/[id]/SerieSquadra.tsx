
import { getSerieGlobali, type EventoSerie } from "@/lib/statistiche/serie";

type Props = {
  squadraId: number;
};

const colori = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#c026d3",
  "#4f46e5",
  "#65a30d",
  "#be123c",
];

function dataItaliana(data: Date | null) {
  return data ? data.toLocaleDateString("it-IT") : "Data non indicata";
}

function etichettaEsito(esito: EventoSerie["esito"]) {
  if (esito === "V") return "Vittoria";
  if (esito === "N") return "Pareggio";
  return "Sconfitta";
}

export default async function SerieSquadra({ squadraId }: Props) {
  const dati = await getSerieGlobali();
  const squadra = dati.squadre.find((r) => r.id === squadraId);

  if (!squadra) {
    return (
      <section style={{ margin: "24px 0" }}>
        <h2>Serie storiche e attuali</h2>
        <p>Nessuna partita conclusa disponibile per questa squadra.</p>
      </section>
    );
  }

  const serieRecord = squadra.serie.migliorImbattibilita;
  const allenatori = new Map<
    string,
    { nome: string; colore: string; partite: number }
  >();

  for (const evento of serieRecord) {
    const chiave =
      evento.allenatoreId === null
        ? "sconosciuto"
        : String(evento.allenatoreId);

    const esistente = allenatori.get(chiave);

    if (esistente) {
      esistente.partite += 1;
    } else {
      const indice = allenatori.size % colori.length;
      allenatori.set(chiave, {
        nome: evento.allenatoreNome ?? "Allenatore non attribuito",
        colore: evento.allenatoreId === null ? "#737373" : colori[indice],
        partite: 1,
      });
    }
  }

  const colorePerAllenatore = new Map<string, string>();
  let indiceColore = 0;

  for (const [id, allenatore] of allenatori) {
    colorePerAllenatore.set(id, allenatore.colore);
    indiceColore += 1;
  }

  const descrizionePartita = (evento: EventoSerie) =>
    `${dataItaliana(evento.partita.dataPartita)} · ${evento.partita.torneoNome} ${evento.partita.torneoAnno} · ${evento.squadra.squadraNome} ${evento.golFatti}-${evento.golSubiti} ${evento.avversaria.squadraNome} · ${etichettaEsito(evento.esito)} · ${evento.allenatoreNome ?? "Allenatore non attribuito"}`;

  return (
    <section style={{ margin: "28px 0" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>
        Serie storiche e attuali
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ border: "1px solid #343a46", borderRadius: 12, padding: 16 }}>
          <p style={{ opacity: 0.75, margin: 0 }}>Record vittorie consecutive</p>
          <p style={{ fontSize: 30, fontWeight: 800, margin: "6px 0" }}>
            {squadra.serie.recordVittorie}
          </p>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Serie attuale: {squadra.serie.vittorieAttuali}
          </p>
        </div>

        <div style={{ border: "1px solid #343a46", borderRadius: 12, padding: 16 }}>
          <p style={{ opacity: 0.75, margin: 0 }}>Record imbattibilità</p>
          <p style={{ fontSize: 30, fontWeight: 800, margin: "6px 0" }}>
            {squadra.serie.recordImbattibilita}
          </p>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Serie attuale: {squadra.serie.imbattibilitaAttuale}
          </p>
        </div>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        Cronologia del record di imbattibilità
      </h3>

      {serieRecord.length === 0 ? (
        <p>Il record verrà mostrato quando sarà disponibile una serie positiva.</p>
      ) : (
        <>
          <p style={{ opacity: 0.8, marginBottom: 10 }}>
            {dataItaliana(serieRecord[0].partita.dataPartita)} –{" "}
            {dataItaliana(serieRecord[serieRecord.length - 1].partita.dataPartita)}
            {" · "}
            {serieRecord.length} partite senza sconfitte
          </p>

          <div
            aria-label="Partite consecutive del record di imbattibilità"
            style={{
              display: "flex",
              gap: 3,
              alignItems: "stretch",
              width: "100%",
              marginBottom: 14,
            }}
          >
            {serieRecord.map((evento, indice) => {
              const chiave =
                evento.allenatoreId === null
                  ? "sconosciuto"
                  : String(evento.allenatoreId);

              return (
                <div
                  key={`${evento.partita.id}-${indice}`}
                  title={descrizionePartita(evento)}
                  style={{
                    flex: 1,
                    minWidth: 5,
                    height: 28,
                    borderRadius: 4,
                    backgroundColor:
                      colorePerAllenatore.get(chiave) ?? "#737373",
                  }}
                />
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[...allenatori.entries()].map(([id, allenatore]) => (
              <div
                key={id}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: allenatore.colore,
                    display: "inline-block",
                  }}
                />
                <span>
                  {allenatore.nome} · {allenatore.partite}{" "}
                  {allenatore.partite === 1 ? "partita" : "partite"}
                </span>
              </div>
            ))}
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Vedi tutte le partite del record ({serieRecord.length})
            </summary>
            <ol style={{ paddingLeft: 24, marginTop: 12 }}>
              {serieRecord.map((evento, indice) => (
                <li key={`${evento.partita.id}-${indice}`} style={{ marginBottom: 10 }}>
                  <strong>
                    {evento.squadra.squadraNome} {evento.golFatti}-
                    {evento.golSubiti} {evento.avversaria.squadraNome}
                  </strong>
                  <div style={{ opacity: 0.8 }}>
                    {dataItaliana(evento.partita.dataPartita)} ·{" "}
                    {evento.partita.torneoNome} {evento.partita.torneoAnno} ·{" "}
                    {etichettaEsito(evento.esito)}
                  </div>
                  <div style={{ opacity: 0.8 }}>
                    Allenatore attribuito:{" "}
                    {evento.allenatoreNome ?? "non disponibile"}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </section>
  );
}
