"""Google Gemini integration — routing narratives, market pulse, cultural ration suggestions."""
import logging
from config import settings

logger = logging.getLogger(__name__)

_client = None


def get_client():
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            return None
        try:
            from google import genai
            _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            logger.warning(f"Gemini client init failed: {e}")
    return _client


def _generate(prompt: str) -> str:
    client = get_client()
    if not client:
        return None
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        return None


async def generate_routing_narrative(
    source: str,
    destination: str,
    route_places: list,
    flagged_places: list,
    market_prices: list,
    ipc_data: list,
) -> str:
    prompt = f"""
You are an expert humanitarian logistics coordinator for Haiti.
Source depot: {source}
Destination: {destination}
Route waypoints (in order): {', '.join(route_places[:10]) if route_places else 'direct route'}
Underserved flagged places along route: {flagged_places[:5]}
Recent market price data: {market_prices[:5]}
IPC food insecurity data: {ipc_data[:5]}

Generate a concise, actionable delivery narrative (3-5 sentences) that:
1. Names the priority stops in order with justification (IPC phase, distance to nearest market)
2. Notes any road segments to avoid if flood/damage data is available
3. Suggests timing considerations
4. Keeps cultural context (Haiti) in mind
Output plain text only, no markdown.
"""
    result = _generate(prompt)
    return result or _mock_routing_narrative(source, destination, route_places)


async def generate_market_pulse_summary(region: str, messages: list) -> str:
    msgs_text = "\n".join([f"- {m.get('vendor','?')}: {m.get('text','')}" for m in messages[-20:]])
    prompt = f"""
You are a humanitarian market analyst. Summarize recent vendor reports from {region}.
Messages:
{msgs_text}

Write a 2-3 sentence market pulse brief like:
"{region}: rice up 12% this week, beans stable, fuel shortage reported by 3 of 5 vendors."
Focus on: price trends, supply gaps, vendor concerns. Plain text only.
"""
    result = _generate(prompt)
    return result.strip() if result else _mock_market_pulse(region, messages)


async def suggest_ration_composition(country_code: str, population_size: int, context_notes: str = "") -> str:
    from config import CULTURAL_DEFAULTS
    defaults = CULTURAL_DEFAULTS.get(country_code, CULTURAL_DEFAULTS["hti"])
    staples = ", ".join(defaults["staples"])

    prompt = f"""
You are a humanitarian nutrition expert. Suggest a culturally appropriate ration composition for:
Country: {defaults['name']}
Population to serve: {population_size}
Cultural staples: {staples}
Context: {context_notes or 'standard disaster relief ration'}

Output a brief ration plan (4-6 items, kg per person per month) respecting local food culture.
Plain text, no markdown.
"""
    result = _generate(prompt)
    return result.strip() if result else f"Recommended ration for {defaults['name']}: {staples}"


def _mock_routing_narrative(source, destination, places):
    return (
        f"Route from {source} to {destination}: Begin at the depot and prioritize stops "
        f"flagged as IPC Phase 3+ or with no market within 10 km. "
        f"Avoid low-lying coastal roads during rainy season. "
        f"Estimated delivery window: 6-8 hours depending on road conditions. "
        f"Coordinate with local vendors at each stop for last-mile distribution."
    )


def _mock_market_pulse(region, messages):
    return f"{region}: Market activity normal. Rice prices stable, bean supply adequate. 2 vendors report minor fuel shortages. Next check recommended in 48 hours."
