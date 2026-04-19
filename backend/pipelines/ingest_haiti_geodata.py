#!/usr/bin/env python3
"""
Haiti / DRC Geospatial Data Ingestion Pipeline
================================================
Fetches all HDX datasets (HOT roads, HOT populated places, localities,
FEWS NET food insecurity, markets, WFP prices, real-time prices) via the
CKAN pattern. Builds a routable NetworkX graph from HOT roads shapefiles
using geopandas + momepy. Caches graph as a pickle.

Usage:
    python ingest_haiti_geodata.py --country hti      # Haiti
    python ingest_haiti_geodata.py --country cod      # DRC
    python ingest_haiti_geodata.py --country hti --skip-graph   # skip graph build
"""

import argparse
import io
import os
import pickle
import logging
import sys
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple

import requests
import pandas as pd

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.parent / "data"
SCRIPT_DIR.mkdir(exist_ok=True)

GRAPH_CACHE = {
    "hti": str(SCRIPT_DIR / "haiti_road_graph.pkl"),
    "cod": str(SCRIPT_DIR / "drc_road_graph.pkl"),
}

# ── HDX CKAN slugs ────────────────────────────────────────────────────────
# Each entry: (hdx_package_id_or_slug, description, target_collection)
DATASETS = {
    "hti": [
        ("hotosm_hti_roads", "HOT Roads Haiti", "roads"),
        ("hotosm_hti_populated_places", "HOT Populated Places Haiti", "places"),
        ("hotosm-hti-administrative-boundaries", "Haiti Admin Boundaries", "localities"),
        ("fews-net-food-insecurity", "FEWS NET IPC Haiti", "food_insecurity"),
        ("wfp-food-prices-for-haiti", "WFP Food Prices Haiti", "wfp_prices"),
        ("haiti-markets", "Haiti Markets", "markets"),
    ],
    "cod": [
        ("hotosm_cod_roads", "HOT Roads DRC", "roads"),
        ("hotosm_cod_populated_places", "HOT Populated Places DRC", "places"),
        ("democratic-republic-of-congo-administrative-boundaries", "DRC Admin Boundaries", "localities"),
        ("wfp-food-prices-for-the-democratic-republic-of-congo", "WFP Food Prices DRC", "wfp_prices"),
    ],
}

HDX_API = "https://data.humdata.org/api/3/action"


# ── HDX helpers ──────────────────────────────────────────────────────────
def hdx_get_resources(slug: str) -> list:
    """Return resources list for a package slug."""
    try:
        resp = requests.get(f"{HDX_API}/package_show", params={"id": slug}, timeout=30)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json().get("result", {}).get("resources", [])
    except Exception as exc:
        logger.warning(f"HDX lookup failed for '{slug}': {exc}")
        return []


def find_best_resource(resources: list, preferred_formats=("SHP", "SHAPEFILE", "GEOJSON", "KML", "CSV", "XLSX", "XLS")):
    for fmt in preferred_formats:
        for r in resources:
            if r.get("format", "").upper() == fmt:
                return r.get("url") or r.get("download_url", ""), fmt
    # fallback: first downloadable
    for r in resources:
        url = r.get("url") or r.get("download_url", "")
        if url:
            return url, r.get("format", "UNKNOWN").upper()
    return None, None


def download_bytes(url: str) -> Optional[bytes]:
    try:
        logger.info(f"  ⬇  {url[:90]}…")
        resp = requests.get(url, timeout=120, stream=True)
        resp.raise_for_status()
        return resp.content
    except Exception as exc:
        logger.error(f"Download failed: {exc}")
        return None


# ── Shapefile extraction (from ZIP) ──────────────────────────────────────
def extract_shapefile_to_tmpdir(content: bytes) -> Optional[str]:
    """Unzip SHP bundle to a temp dir; return path to the .shp file."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            tmp = tempfile.mkdtemp()
            z.extractall(tmp)
            for fname in os.listdir(tmp):
                if fname.lower().endswith(".shp"):
                    return os.path.join(tmp, fname)
            # nested dir
            for root, dirs, files in os.walk(tmp):
                for fname in files:
                    if fname.lower().endswith(".shp"):
                        return os.path.join(root, fname)
    except Exception as exc:
        logger.error(f"Shapefile extraction error: {exc}")
    return None


# ── GeoDataFrame loading ─────────────────────────────────────────────────
def load_geodataframe(content: bytes, fmt: str):
    """Load GeoDataFrame from raw bytes. Returns gdf or None."""
    try:
        import geopandas as gpd
    except ImportError:
        logger.error("geopandas not installed. Run: pip install geopandas")
        return None

    try:
        if fmt in ("SHP", "SHAPEFILE") or (fmt == "UNKNOWN" and content[:2] == b"PK"):
            shp_path = extract_shapefile_to_tmpdir(content)
            if shp_path:
                return gpd.read_file(shp_path)
        elif fmt == "GEOJSON":
            return gpd.read_file(io.BytesIO(content))
        elif fmt in ("XLSX", "XLS"):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
            return df  # plain DataFrame
        elif fmt == "CSV":
            df = pd.read_csv(io.BytesIO(content), on_bad_lines="skip")
            return df
    except Exception as exc:
        logger.error(f"GDF load error [{fmt}]: {exc}")
    return None


# ── MongoDB write ─────────────────────────────────────────────────────────
def write_gdf_to_mongo(gdf, collection: str, country: str, mongo_uri: str):
    """Write a GeoDataFrame (or plain DataFrame) to MongoDB as GeoJSON features."""
    try:
        import pymongo
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client["resilient_food"]

        import numpy as np
        records = []

        # Handle GeoDataFrame
        is_geo = hasattr(gdf, "geometry") and hasattr(gdf, "to_crs")
        if is_geo:
            try:
                gdf = gdf.to_crs(epsg=4326)
            except Exception:
                pass

        for _, row in gdf.iterrows():
            record = {}
            for col in gdf.columns:
                if col == "geometry":
                    continue
                val = row[col]
                # Coerce numpy types to Python native
                if hasattr(val, "item"):
                    val = val.item()
                elif isinstance(val, float) and np.isnan(val):
                    val = None
                record[col] = val

            record["country"] = country
            record["updatedAt"] = datetime.utcnow()

            # Add GeoJSON geometry if available
            if is_geo and row.geometry is not None and not row.geometry.is_empty:
                try:
                    from shapely.geometry import mapping
                    geom = mapping(row.geometry)
                    record["geometry"] = geom
                    # For 2dsphere index — use Point for places/markets
                    if collection in ("places", "markets") and geom["type"] == "Point":
                        record["location"] = {
                            "type": "Point",
                            "coordinates": list(geom["coordinates"][:2]),
                        }
                    elif collection in ("places", "markets") and geom["type"] != "Point":
                        # Centroid for polygons/lines
                        centroid = row.geometry.centroid
                        record["location"] = {
                            "type": "Point",
                            "coordinates": [centroid.x, centroid.y],
                        }
                except Exception:
                    pass
            records.append(record)

        if records:
            # Clear old records for this country+collection before re-inserting
            db[collection].delete_many({"country": country})
            db[collection].insert_many(records)
            logger.info(f"  ✓ {len(records)} records → '{collection}' (country={country})")
        client.close()
    except Exception as exc:
        logger.warning(f"MongoDB write to '{collection}' failed: {exc}")


# ── Graph construction (roads → NetworkX) ───────────────────────────────
def build_road_graph(roads_gdf, country: str, cache_path: str) -> Optional[object]:
    """Build a routable NetworkX graph from roads GeoDataFrame using momepy."""
    try:
        import networkx as nx
        import momepy
        import geopandas as gpd
        from shapely.geometry import LineString
    except ImportError as exc:
        logger.error(f"Missing library: {exc}. Install: pip install momepy networkx")
        return None

    logger.info(f"Building road graph for {country} ({len(roads_gdf)} road segments)…")

    # Ensure CRS is WGS84
    try:
        roads_gdf = roads_gdf.to_crs(epsg=4326)
    except Exception:
        pass

    # Drop non-LineString geometries
    roads_gdf = roads_gdf[roads_gdf.geometry.geom_type.isin(["LineString", "MultiLineString"])].copy()
    roads_gdf = roads_gdf.explode(index_parts=False).reset_index(drop=True)

    # Compute length in meters (project to a local UTM then back)
    try:
        roads_proj = roads_gdf.to_crs(epsg=32618 if country == "hti" else 32735)
        roads_gdf["length"] = roads_proj.geometry.length
    except Exception:
        roads_gdf["length"] = roads_gdf.geometry.length  # rough degrees-based fallback

    if len(roads_gdf) == 0:
        logger.warning("No road geometries after filtering")
        return None

    try:
        G = momepy.gdf_to_nx(roads_gdf, approach="primal", length="length", multigraph=False)
        logger.info(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    except Exception as exc:
        logger.error(f"momepy graph build failed: {exc}")
        # Fallback: manual graph from LineStrings
        G = _manual_graph(roads_gdf)

    # Store lon/lat on nodes
    for node in G.nodes():
        if isinstance(node, tuple) and len(node) == 2:
            G.nodes[node]["x"] = node[0]
            G.nodes[node]["y"] = node[1]

    # Cache
    try:
        with open(cache_path, "wb") as f:
            pickle.dump(G, f)
        logger.info(f"  ✓ Graph cached at {cache_path}")
    except Exception as exc:
        logger.warning(f"Graph cache write failed: {exc}")

    return G


def _manual_graph(roads_gdf):
    """Fallback graph builder if momepy fails."""
    import networkx as nx
    G = nx.Graph()
    for _, row in roads_gdf.iterrows():
        coords = list(row.geometry.coords)
        length = row.get("length", 1.0)
        for i in range(len(coords) - 1):
            src = (round(coords[i][0], 6), round(coords[i][1], 6))
            dst = (round(coords[i + 1][0], 6), round(coords[i + 1][1], 6))
            G.add_edge(src, dst, length=length / max(len(coords) - 1, 1))
    for node in G.nodes():
        G.nodes[node]["x"] = node[0]
        G.nodes[node]["y"] = node[1]
    return G


# ── Market coverage analysis ─────────────────────────────────────────────
def flag_underserved_places(places_gdf, markets_gdf, prices_df=None, ipc_df=None,
                             country: str = "hti", mongo_uri: str = None):
    """Flag populated places that are >10 km from nearest market or in IPC 3+."""
    try:
        import geopandas as gpd
        from shapely.ops import nearest_points
        import numpy as np
    except ImportError:
        logger.warning("geopandas/shapely not available for flagging analysis")
        return

    if places_gdf is None or len(places_gdf) == 0:
        logger.warning("No places data for coverage analysis")
        return
    if markets_gdf is None or len(markets_gdf) == 0:
        logger.warning("No markets data for coverage analysis")
        return

    logger.info(f"Analyzing market coverage for {len(places_gdf)} places…")

    try:
        places_proj = places_gdf.to_crs(epsg=32618 if country == "hti" else 32735)
        markets_proj = markets_gdf.to_crs(epsg=32618 if country == "hti" else 32735)
    except Exception:
        places_proj = places_gdf
        markets_proj = markets_gdf

    from shapely.geometry import MultiPoint
    market_union = markets_proj.geometry.unary_union

    flagged_count = 0
    updates = []
    for idx, place_row in places_proj.iterrows():
        try:
            pt = place_row.geometry
            if pt is None or pt.is_empty:
                continue
            nearest_pt, _ = nearest_points(pt, market_union)
            dist_m = pt.distance(nearest_pt)
            dist_km = dist_m / 1000

            flag = dist_km > 10.0
            reason = []
            if dist_km > 10.0:
                reason.append(f"nearest market {dist_km:.1f} km away")

            name = place_row.get("name", place_row.get("NAME", "Unknown"))
            updates.append({
                "name": name,
                "distanceToMarketKm": round(dist_km, 2),
                "flagged": flag,
                "flagReason": "; ".join(reason) if reason else "",
                "country": country,
            })
            if flag:
                flagged_count += 1
        except Exception:
            continue

    logger.info(f"  → {flagged_count} underserved places flagged (>{10} km to market)")

    # Write flags back to MongoDB
    if mongo_uri and updates:
        try:
            import pymongo
            client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            db = client["resilient_food"]
            for u in updates:
                db["places"].update_many(
                    {"name": u["name"], "country": country},
                    {"$set": {"distanceToMarketKm": u["distanceToMarketKm"],
                              "flagged": u["flagged"],
                              "flagReason": u["flagReason"]}},
                )
            client.close()
            logger.info("  ✓ Flagging data written to MongoDB")
        except Exception as exc:
            logger.warning(f"Flagging MongoDB write failed: {exc}")


# ── Main pipeline ─────────────────────────────────────────────────────────
def run_geodata_pipeline(country: str = "hti", skip_graph: bool = False,
                          mongo_uri: str = "mongodb://localhost:27017/resilient_food"):
    logger.info(f"{'='*60}")
    logger.info(f"  Geospatial Ingestion Pipeline — {country.upper()}")
    logger.info(f"{'='*60}")

    datasets = DATASETS.get(country, [])
    if not datasets:
        logger.error(f"No datasets configured for country '{country}'")
        return

    roads_gdf = None
    places_gdf = None
    markets_gdf = None

    for slug, description, collection in datasets:
        logger.info(f"\n[{description}]")
        resources = hdx_get_resources(slug)

        if not resources:
            logger.warning(f"  No resources found for slug '{slug}' — skipping")
            # Seed mock data for critical collections
            if collection in ("places", "markets") and mongo_uri:
                _seed_mock_geo(collection, country, mongo_uri)
            continue

        url, fmt = find_best_resource(resources)
        if not url:
            logger.warning(f"  No downloadable resource for '{slug}'")
            continue

        content = download_bytes(url)
        if not content:
            continue

        gdf = load_geodataframe(content, fmt)
        if gdf is None:
            logger.warning(f"  Could not load GDF for '{slug}'")
            continue

        logger.info(f"  Loaded {len(gdf)} features [{fmt}]")

        # Write to MongoDB
        if mongo_uri:
            write_gdf_to_mongo(gdf, collection, country, mongo_uri)

        # Track key GDFs for downstream processing
        if collection == "roads" and hasattr(gdf, "geometry"):
            roads_gdf = gdf
        elif collection == "places" and hasattr(gdf, "geometry"):
            places_gdf = gdf
        elif collection == "markets":
            markets_gdf = gdf

    # ── Graph build ────────────────────────────────────────────────────
    if not skip_graph:
        cache_path = GRAPH_CACHE.get(country, str(SCRIPT_DIR / f"{country}_road_graph.pkl"))
        if roads_gdf is not None:
            build_road_graph(roads_gdf, country, cache_path)
        else:
            logger.warning("Roads GDF not available — graph build skipped")

    # ── Coverage analysis ─────────────────────────────────────────────
    if places_gdf is not None and markets_gdf is not None:
        flag_underserved_places(places_gdf, markets_gdf, country=country, mongo_uri=mongo_uri)
    else:
        logger.warning("Coverage analysis skipped (missing places or markets data)")

    logger.info(f"\n{'='*60}")
    logger.info(f"  Pipeline complete for {country.upper()}")
    logger.info(f"{'='*60}\n")


def _seed_mock_geo(collection: str, country: str, mongo_uri: str):
    """Insert a small set of mock GeoJSON points when HDX data is unavailable."""
    import pymongo
    MOCK = {
        "hti": {
            "places": [
                {"name": "Port-au-Prince", "population": 987310, "location": {"type": "Point", "coordinates": [-72.338, 18.543]}},
                {"name": "Jérémie", "population": 31952, "location": {"type": "Point", "coordinates": [-74.117, 18.648]}},
                {"name": "Corail", "population": 8200, "location": {"type": "Point", "coordinates": [-73.889, 18.562]}, "flagged": True, "flagReason": "nearest market 18 km away"},
                {"name": "Les Cayes", "population": 82550, "location": {"type": "Point", "coordinates": [-73.754, 18.198]}},
                {"name": "Pestel", "population": 6400, "location": {"type": "Point", "coordinates": [-74.038, 18.580]}, "flagged": True, "flagReason": "nearest market 14 km away"},
                {"name": "Cap-Haïtien", "population": 190900, "location": {"type": "Point", "coordinates": [-72.200, 19.757]}},
                {"name": "Gonaïves", "population": 104825, "location": {"type": "Point", "coordinates": [-72.686, 19.447]}},
            ],
            "markets": [
                {"name": "Marché de Fer", "market": "Marché de Fer", "city": "Port-au-Prince", "location": {"type": "Point", "coordinates": [-72.336, 18.544]}},
                {"name": "Les Cayes Market", "market": "Les Cayes Market", "city": "Les Cayes", "location": {"type": "Point", "coordinates": [-73.750, 18.200]}},
                {"name": "Cap-Haïtien Market", "market": "Cap-Haïtien Market", "city": "Cap-Haïtien", "location": {"type": "Point", "coordinates": [-72.202, 19.755]}},
                {"name": "Gonaïves Market", "market": "Gonaïves Market", "city": "Gonaïves", "location": {"type": "Point", "coordinates": [-72.685, 19.445]}},
            ],
        },
        "cod": {
            "places": [
                {"name": "Kinshasa", "population": 15628085, "location": {"type": "Point", "coordinates": [15.322, -4.322]}},
                {"name": "Goma", "population": 670000, "location": {"type": "Point", "coordinates": [29.231, -1.679]}},
                {"name": "Bukavu", "population": 1014000, "location": {"type": "Point", "coordinates": [28.845, -2.508]}},
            ],
            "markets": [
                {"name": "Grand Marché Kinshasa", "market": "Grand Marché", "location": {"type": "Point", "coordinates": [15.325, -4.320]}},
                {"name": "Goma Market", "market": "Goma Market", "location": {"type": "Point", "coordinates": [29.233, -1.680]}},
            ],
        },
    }
    try:
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client["resilient_food"]
        mock_records = MOCK.get(country, {}).get(collection, [])
        if mock_records:
            for r in mock_records:
                r["country"] = country
                r["isMock"] = True
                r["updatedAt"] = datetime.utcnow()
                db[collection].update_one(
                    {"name": r["name"], "country": country},
                    {"$set": r},
                    upsert=True,
                )
            logger.info(f"  ✓ Seeded {len(mock_records)} mock records into '{collection}'")
        client.close()
    except Exception as exc:
        logger.warning(f"Mock seed failed: {exc}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Haiti/DRC geospatial ingestion pipeline")
    parser.add_argument("--country", default="hti", help="ISO3 country code (hti, cod)")
    parser.add_argument("--skip-graph", action="store_true", help="Skip NetworkX graph build")
    parser.add_argument("--mongo", default="mongodb://localhost:27017/resilient_food", help="MongoDB URI")
    args = parser.parse_args()
    run_geodata_pipeline(args.country, skip_graph=args.skip_graph, mongo_uri=args.mongo)
