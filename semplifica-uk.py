import json
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform

origine = Path("public/data/uk-countries-ons.geojson")
destinazione = Path("public/data/uk-countries-ons-light.geojson")

if not origine.exists():
    raise FileNotFoundError(f"File non trovato: {origine}")

with origine.open("r", encoding="utf-8") as f:
    dati = json.load(f)

trasformatore = Transformer.from_crs(
    "EPSG:27700",
    "EPSG:4326",
    always_xy=True
)

def conta_punti(geometria):
    if geometria.geom_type == "Polygon":
        return sum(len(anello.coords) for anello in geometria.interiors) + len(geometria.exterior.coords)
    if geometria.geom_type == "MultiPolygon":
        return sum(conta_punti(p) for p in geometria.geoms)
    return 0

nuove_feature = []
totale_prima = 0
totale_dopo = 0

for feature in dati["features"]:
    geometria = shape(feature["geometry"])

    punti_prima = conta_punti(geometria)

    # Semplifica in metri, mantenendo la topologia.
    semplificata = geometria.simplify(
        tolerance=100,
        preserve_topology=True
    )

    punti_dopo = conta_punti(semplificata)

    # Solo dopo la semplificazione converte le coordinate in WGS84.
    wgs84 = transform(trasformatore.transform, semplificata)

    nuova_feature = {
        "type": "Feature",
        "properties": feature.get("properties", {}),
        "geometry": mapping(wgs84)
    }

    nuove_feature.append(nuova_feature)

    nome = feature.get("properties", {}).get("CTRY25NM", "Territorio")
    totale_prima += punti_prima
    totale_dopo += punti_dopo

    print(
        f"{nome}: {punti_prima:,} punti -> "
        f"{punti_dopo:,} punti "
        f"({100 - punti_dopo / punti_prima * 100:.1f}% in meno)"
    )

risultato = {
    "type": "FeatureCollection",
    "features": nuove_feature
}

with destinazione.open("w", encoding="utf-8") as f:
    json.dump(risultato, f, ensure_ascii=False, separators=(",", ":"))

print("\nOPERAZIONE COMPLETATA")
print(f"Punti iniziali: {totale_prima:,}")
print(f"Punti finali: {totale_dopo:,}")
print(f"Riduzione complessiva: {100 - totale_dopo / totale_prima * 100:.1f}%")
print(f"Nuovo file: {destinazione}")
print(f"Dimensione: {destinazione.stat().st_size / 1024 / 1024:.2f} MB")
