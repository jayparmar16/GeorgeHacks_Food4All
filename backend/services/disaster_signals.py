"""Disaster signal engine — polls weather, seismic, displacement feeds."""
import httpx
import logging
from datetime import datetime
from config import settings

logger = logging.getLogger(__name__)

HAITI_BBOX = (-74.5, 18.0, -71.6, 20.1)
DRC_BBOX = (12.2, -13.5, 31.3, 5.4)

COUNTRY_BBOXES = {"hti": HAITI_BBOX, "cod": DRC_BBOX}


async def fetch_usgs_earthquakes(min_magnitude: float = 5.0, days: int = 1) -> list:
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            data = resp.json()
        events = []
        for feature in data.get("features", []):
            props = feature["properties"]
            coords = feature["geometry"]["coordinates"]
            if props.get("mag", 0) >= min_magnitude:
                events.append({
                    "type": "earthquake",
                    "magnitude": props["mag"],
                    "place": props.get("place", "Unknown"),
                    "lon": coords[0],
                    "lat": coords[1],
                    "time": datetime.fromtimestamp(props["time"] / 1000).isoformat(),
                    "url": props.get("url", ""),
                })
        return events
    except Exception as e:
        logger.error(f"USGS fetch error: {e}")
        return []


async def fetch_weather_alerts(country_code: str = "hti") -> list:
    bbox = COUNTRY_BBOXES.get(country_code, HAITI_BBOX)
    if not settings.OPENWEATHER_API_KEY:
        return _mock_weather_alerts(country_code)
    # Use a central lat/lon for the country
    lat = (bbox[1] + bbox[3]) / 2
    lon = (bbox[0] + bbox[2]) / 2
    url = f"https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&exclude=current,minutely,hourly,daily&appid={settings.OPENWEATHER_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"Weather API returned {resp.status_code}. Falling back to mock.")
                return _mock_weather_alerts(country_code)
            data = resp.json()
        alerts = []
        for alert in data.get("alerts", []):
            alerts.append({
                "type": "weather",
                "event": alert.get("event", ""),
                "description": alert.get("description", "")[:200],
                "start": datetime.fromtimestamp(alert.get("start", 0)).isoformat(),
                "end": datetime.fromtimestamp(alert.get("end", 0)).isoformat(),
                "sender": alert.get("sender_name", ""),
            })
        return alerts
    except Exception as e:
        logger.error(f"Weather alerts error: {e}")
        return _mock_weather_alerts(country_code)


def _mock_weather_alerts(country_code: str) -> list:
    if country_code == "hti":
        return [{
            "type": "weather",
            "event": "Tropical Storm Watch",
            "description": "Tropical storm conditions possible within 48 hours. Coastal areas should prepare.",
            "start": datetime.utcnow().isoformat(),
            "end": datetime.utcnow().isoformat(),
            "sender": "NHC Mock",
        }]
    return []


async def check_all_signals(country_code: str = "hti") -> dict:
    quakes = await fetch_usgs_earthquakes(min_magnitude=5.0)
    weather = await fetch_weather_alerts(country_code)
    # Filter by country bounding box
    bbox = COUNTRY_BBOXES.get(country_code, HAITI_BBOX)
    quakes_in_area = [
        q for q in quakes
        if bbox[0] <= q["lon"] <= bbox[2] and bbox[1] <= q["lat"] <= bbox[3]
    ]
    alerts = quakes_in_area + weather
    threshold_crossed = len(alerts) > 0
    return {
        "country": country_code,
        "alerts": alerts,
        "threshold_crossed": threshold_crossed,
        "checked_at": datetime.utcnow().isoformat(),
    }
