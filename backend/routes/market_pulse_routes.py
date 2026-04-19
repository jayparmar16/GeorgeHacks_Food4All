from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId
from database import get_db
from services.auth import get_current_user, require_ngo
from services.gemini import generate_market_pulse_summary

router = APIRouter(prefix="/market-pulse", tags=["market_pulse"])


class MessagePost(BaseModel):
    region: str
    text: str
    vendor: str = ""
    country: str = "hti"
    messageType: str = "update"  # update | price | shortage | broadcast


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@router.post("/message")
async def post_message(req: MessagePost, db=Depends(get_db)):
    doc = {
        "region": req.region,
        "text": req.text,
        "vendor": req.vendor,
        "country": req.country,
        "messageType": req.messageType,
        "timestamp": datetime.utcnow(),
    }
    result = await db["market_pulse"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/messages/{region}")
async def get_messages(region: str, country: str = "hti", limit: int = 50, db=Depends(get_db)):
    cursor = db["market_pulse"].find({"region": region, "country": country}).sort("timestamp", -1).limit(limit)
    messages = [_ser(m) async for m in cursor]
    messages.reverse()
    return {"messages": messages, "region": region}


@router.post("/summarize/{region}")
async def summarize_region(region: str, country: str = "hti", _=Depends(require_ngo), db=Depends(get_db)):
    cursor = db["market_pulse"].find({"region": region, "country": country}).sort("timestamp", -1).limit(30)
    messages = [m async for m in cursor]

    summary = await generate_market_pulse_summary(region, messages)

    summary_doc = {
        "region": region,
        "country": country,
        "summary": summary,
        "generatedAt": datetime.utcnow(),
        "messageCount": len(messages),
    }
    await db["market_pulse_summaries"].insert_one(summary_doc)
    return {"summary": summary, "region": region, "messageCount": len(messages)}


@router.get("/summary/{region}")
async def get_latest_summary(region: str, country: str = "hti", db=Depends(get_db)):
    doc = await db["market_pulse_summaries"].find_one(
        {"region": region, "country": country},
        sort=[("generatedAt", -1)]
    )
    if doc:
        return _ser(doc)
    return {"summary": None, "region": region}


@router.get("/regions")
async def list_regions(country: str = "hti", db=Depends(get_db)):
    regions = await db["market_pulse"].distinct("region", {"country": country})
    return {"regions": regions}
