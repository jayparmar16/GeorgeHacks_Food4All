from fastapi import APIRouter, Query, Depends, HTTPException
from database import get_db
from bson import ObjectId
import logging
import httpx
import xml.etree.ElementTree as ET
import html
import re
from datetime import datetime

router = APIRouter(prefix="/ngos", tags=["ngos"])
logger = logging.getLogger(__name__)


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@router.get("/")
async def list_ngos(
    country: str = Query("hti", description="ISO3 country code"),
    search: str = Query("", description="Search by org name or sector"),
    skip: int = 0,
    limit: int = 50,
    db=Depends(get_db),
):
    query = {"country": country}
    if search:
        query["$or"] = [
            {"organization": {"$regex": search, "$options": "i"}},
            {"sectors": {"$regex": search, "$options": "i"}},
        ]
    cursor = db["ngos"].find(query).skip(skip).limit(limit)
    ngos = [_ser(n) async for n in cursor]
    total = await db["ngos"].count_documents(query)
    return {"ngos": ngos, "total": total, "country": country}


@router.get("/{ngo_id}")
async def get_ngo(ngo_id: str, db=Depends(get_db)):
    ngo = await db["ngos"].find_one({"_id": ObjectId(ngo_id)})
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found")
    return _ser(ngo)


@router.get("/{ngo_id}/profile")
async def get_ngo_profile(ngo_id: str, db=Depends(get_db)):
    """Return cached Gemini profile or generate one on-demand."""
    ngo = await db["ngos"].find_one({"_id": ObjectId(ngo_id)})
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found")

    ngo_data = _ser(ngo)

    # Return cached profile if available (pre-generated at seed time)
    if ngo.get("cached_profile"):
        return {
            "ngo": ngo_data,
            "profile": ngo["cached_profile"],
            "source": ngo.get("profile_source", "cached"),
        }

    org_name = ngo_data.get("organization", "Unknown")
    sectors = ngo_data.get("sectors", "")
    region = ngo_data.get("region", "")
    country = ngo_data.get("country", "hti")

    from config import CULTURAL_DEFAULTS
    country_name = CULTURAL_DEFAULTS.get(country, {}).get("name", country.upper())

    # Try Gemini for a rich profile
    profile = None
    try:
        from services.gemini import _generate
        prompt = f"""You are a humanitarian aid researcher. Generate a concise organizational profile for the NGO "{org_name}" operating in {country_name}.

Known information:
- Sectors: {sectors}
- Operating region: {region}
- Country: {country_name}

Provide a JSON response with these fields (use plain text, no markdown):
{{
  "description": "2-3 sentence overview of what this organization does and its mission",
  "focus_areas": ["list", "of", "3-4", "key focus areas"],
  "impact_highlights": ["1-2 sentence about notable achievements or impact"],
  "established": "year founded if known, otherwise 'N/A'",
  "headquarters": "city/country of headquarters if known",
  "website": "official website URL if known, otherwise null",
  "donation_use": "Brief description of how donations are typically used by this organization"
}}

Be factual. If you don't know specific details about this organization, provide reasonable information based on the sector and region. Output valid JSON only."""

        result = _generate(prompt)
        if result:
            import json
            # Try to extract JSON from the response
            try:
                # Remove markdown code fences if present
                cleaned = re.sub(r'^```json?\s*', '', result.strip(), flags=re.MULTILINE)
                cleaned = re.sub(r'\s*```$', '', cleaned.strip(), flags=re.MULTILINE)
                profile = json.loads(cleaned)
            except Exception:
                # Try to find JSON object in the text
                match = re.search(r'\{.*\}', result, re.DOTALL)
                if match:
                    try:
                        profile = json.loads(match.group())
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"Gemini profile generation failed: {e}")

    # Fallback profile
    if not profile:
        profile = {
            "description": f"{org_name} is a humanitarian organization operating in {country_name}, focused on {sectors.lower() if sectors else 'food security and disaster relief'}. They work primarily in the {region or 'national'} region to support vulnerable communities.",
            "focus_areas": [s.strip() for s in sectors.split(";")][:4] if sectors else ["Food Security", "Disaster Relief"],
            "impact_highlights": [f"Active in {region or country_name}, providing direct assistance to communities affected by food insecurity and natural disasters."],
            "established": "N/A",
            "headquarters": "N/A",
            "website": None,
            "donation_use": f"Donations support food distribution, emergency relief supplies, and community resilience programs in {country_name}.",
        }

    source = "fallback"
    if profile and "humanitarian organization operating" not in profile.get("description", ""):
        source = "gemini"
        # Cache for future requests
        try:
            await db["ngos"].update_one(
                {"_id": ObjectId(ngo_id)},
                {"$set": {"cached_profile": profile, "profile_source": "gemini"}}
            )
        except Exception:
            pass

    return {
        "ngo": ngo_data,
        "profile": profile,
        "source": source,
    }


@router.get("/{ngo_id}/news")
async def get_ngo_news(ngo_id: str, limit: int = 5, db=Depends(get_db)):
    """Fetch recent news articles about an NGO from Google News RSS."""
    ngo = await db["ngos"].find_one({"_id": ObjectId(ngo_id)})
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found")

    org_name = ngo.get("organization", "")
    country = ngo.get("country", "hti")
    from config import CULTURAL_DEFAULTS
    country_name = CULTURAL_DEFAULTS.get(country, {}).get("name", country.upper())

    articles = []
    try:
        # Google News RSS search
        search_query = f"{org_name} {country_name} humanitarian"
        encoded_query = search_query.replace(" ", "+")
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en&gl=US&ceid=US:en"

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(rss_url)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = root.findall(".//item")[:limit]
                for item in items:
                    title = item.findtext("title", "")
                    link = item.findtext("link", "")
                    pub_date = item.findtext("pubDate", "")
                    source = item.findtext("source", "")
                    description = item.findtext("description", "")
                    # Clean HTML from description
                    description = re.sub(r'<[^>]+>', '', html.unescape(description))[:200]

                    articles.append({
                        "title": title,
                        "url": link,
                        "source": source,
                        "publishedAt": pub_date,
                        "snippet": description,
                    })
    except Exception as e:
        logger.warning(f"News fetch failed for {org_name}: {e}")

    # If no articles found, try a broader search
    if not articles:
        try:
            broader_query = f"food security {country_name} NGO aid"
            encoded_broad = broader_query.replace(" ", "+")
            rss_url = f"https://news.google.com/rss/search?q={encoded_broad}&hl=en&gl=US&ceid=US:en"

            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(rss_url)
                if resp.status_code == 200:
                    root = ET.fromstring(resp.content)
                    items = root.findall(".//item")[:limit]
                    for item in items:
                        title = item.findtext("title", "")
                        link = item.findtext("link", "")
                        pub_date = item.findtext("pubDate", "")
                        source = item.findtext("source", "")
                        description = item.findtext("description", "")
                        description = re.sub(r'<[^>]+>', '', html.unescape(description))[:200]
                        articles.append({
                            "title": title,
                            "url": link,
                            "source": source,
                            "publishedAt": pub_date,
                            "snippet": description,
                        })
        except Exception as e:
            logger.warning(f"Broader news fetch failed: {e}")

    return {
        "organization": org_name,
        "articles": articles,
        "total": len(articles),
    }

