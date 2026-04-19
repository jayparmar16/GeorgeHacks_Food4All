"""Supply routing endpoints — NetworkX shortest path + Gemini narrative."""
import pickle
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from services.gemini import generate_routing_narrative
from services.auth import require_ngo

router = APIRouter(prefix="/routing", tags=["routing"])
logger = logging.getLogger(__name__)

GRAPH_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
GRAPH_CACHE_PATHS = {
    "hti": os.path.join(GRAPH_DIR, "haiti_road_graph.pkl"),
    "cod": os.path.join(GRAPH_DIR, "drc_road_graph.pkl"),
}

_graph_cache = {}


def load_graph(country: str = "hti"):
    if country in _graph_cache:
        return _graph_cache[country]
    path = GRAPH_CACHE_PATHS.get(country, os.path.join(GRAPH_DIR, f"{country}_road_graph.pkl"))
    if os.path.exists(path):
        try:
            with open(path, "rb") as f:
                G = pickle.load(f)
            _graph_cache[country] = G
            return G
        except Exception as e:
            logger.error(f"Graph load error: {e}")
    return None


class RouteRequest(BaseModel):
    sourceLon: float
    sourceLat: float
    destLon: float
    destLat: float
    sourceLabel: str = "Source"
    destLabel: str = "Destination"
    country: str = "hti"


def _snap_to_graph(G, lon: float, lat: float):
    """Find closest graph node to given coordinates."""
    import networkx as nx
    min_dist = float("inf")
    closest = None
    for node, data in G.nodes(data=True):
        n_lon = data.get("x", data.get("lon", 0))
        n_lat = data.get("y", data.get("lat", 0))
        dist = (n_lon - lon) ** 2 + (n_lat - lat) ** 2
        if dist < min_dist:
            min_dist = dist
            closest = node
    return closest


@router.post("/route")
async def compute_route(req: RouteRequest, db=Depends(get_db)):
    import networkx as nx
    G = load_graph(req.country)

    if G is None:
        # Return a straight-line fallback
        geojson = {
            "type": "LineString",
            "coordinates": [[req.sourceLon, req.sourceLat], [req.destLon, req.destLat]],
        }
        narrative = await generate_routing_narrative(
            req.sourceLabel, req.destLabel, [], [], [], []
        )
        return {
            "geojson": geojson,
            "narrative": narrative,
            "distanceKm": None,
            "fallback": True,
            "message": "Road graph not yet built. Run ingest_haiti_geodata.py first.",
        }

    src_node = _snap_to_graph(G, req.sourceLon, req.sourceLat)
    dst_node = _snap_to_graph(G, req.destLon, req.destLat)

    try:
        path_nodes = nx.shortest_path(G, src_node, dst_node, weight="length")
        coords = []
        for node in path_nodes:
            data = G.nodes[node]
            coords.append([data.get("x", data.get("lon", 0)), data.get("y", data.get("lat", 0))])

        total_length = nx.shortest_path_length(G, src_node, dst_node, weight="length")
        dist_km = round(total_length / 1000, 2)

        geojson = {"type": "LineString", "coordinates": coords}

        # Fetch context for Gemini
        flagged_cursor = db["places"].find({"country": req.country, "flagged": True}).limit(5)
        flagged = [p async for p in flagged_cursor]
        prices_cursor = db["prices"].find({"country": req.country}).limit(5)
        prices = [p async for p in prices_cursor]
        ipc_cursor = db["food_insecurity"].find({"country": req.country}).limit(5)
        ipc = [p async for p in ipc_cursor]

        route_labels = [f"Node-{n}" for n in path_nodes[::max(1, len(path_nodes) // 5)]]

        narrative = await generate_routing_narrative(
            req.sourceLabel, req.destLabel, route_labels,
            [f.get("name", "") for f in flagged],
            [{"market": p.get("market", ""), "item": p.get("commodity", ""), "price": p.get("price", 0)} for p in prices],
            [{"place": i.get("admin", ""), "ipc": i.get("ipcPhase", 0)} for i in ipc],
        )

        return {
            "geojson": geojson,
            "narrative": narrative,
            "distanceKm": dist_km,
            "nodeCount": len(path_nodes),
            "fallback": False,
        }
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No path found between source and destination")
    except Exception as e:
        logger.error(f"Routing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flagged-places")
async def flagged_places(country: str = "hti", db=Depends(get_db)):
    cursor = db["places"].find({"country": country, "flagged": True}).limit(100)
    places = [{
        "id": str(p.get("_id", "")),
        "name": p.get("name", ""),
        "lon": p.get("location", {}).get("coordinates", [0, 0])[0],
        "lat": p.get("location", {}).get("coordinates", [0, 0])[1],
        "distanceToMarket": p.get("distanceToMarketKm"),
        "ipcPhase": p.get("ipcPhase"),
        "reason": p.get("flagReason", ""),
    } async for p in cursor]
    return {"places": places, "count": len(places)}


@router.get("/markets")
async def list_markets(country: str = "hti", db=Depends(get_db)):
    cursor = db["markets"].find({"country": country}).limit(100)
    markets = [{
        "id": str(m.get("_id", "")),
        "name": m.get("name", m.get("market", "")),
        "lon": m.get("location", {}).get("coordinates", [0, 0])[0],
        "lat": m.get("location", {}).get("coordinates", [0, 0])[1],
        "priceVolatility": m.get("priceVolatility", 0),
    } async for m in cursor]
    return {"markets": markets}
