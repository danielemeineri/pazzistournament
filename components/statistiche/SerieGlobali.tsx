
import { getSerieGlobali } from "@/lib/statistiche/serie";
import SerieGlobaliClient from "./SerieGlobaliClient";

export default async function SerieGlobali() {
  const dati = await getSerieGlobali();

  return <SerieGlobaliClient dati={dati} />;
}
