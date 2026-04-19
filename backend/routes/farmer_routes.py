from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from database import get_db
from services.auth import require_ngo, optional_user

router = APIRouter(prefix="/farmers", tags=["farmers"])


class FarmerEnroll(BaseModel):
    name: str
    lon: float
    lat: float
    cropType: str
    expectedYieldKg: float
    plantingSeason: str
    pledgedPercent: float = 17.5  # 15-20%
    phone: str = ""
    country: str = "hti"
    grainStoreGPS: Optional[dict] = None  # {lon, lat}


class PledgeUpdate(BaseModel):
    status: str  # pledged | activated | reconciled


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@router.post("/enroll")
async def enroll_farmer(req: FarmerEnroll, db=Depends(get_db)):
    pledged_kg = req.expectedYieldKg * (req.pledgedPercent / 100)
    doc = req.dict()
    doc["location"] = {"type": "Point", "coordinates": [req.lon, req.lat]}
    doc["pledgedKg"] = pledged_kg
    doc["pledgeStatus"] = "pledged"
    doc["paymentStages"] = [
        {"stage": "planting_advance", "paid": False, "amount": 0},
        {"stage": "activation_payment", "paid": False, "amount": 0},
    ]
    doc["insuranceActive"] = True
    doc["reserveTag"] = f"RT-{datetime.utcnow().strftime('%Y%m%d')}-{req.cropType[:3].upper()}"
    doc["createdAt"] = datetime.utcnow()
    result = await db["farmers"].insert_one(doc)

    pledge_doc = {
        "farmerId": str(result.inserted_id),
        "crop": req.cropType,
        "pledgedKg": pledged_kg,
        "season": req.plantingSeason,
        "status": "pledged",
        "country": req.country,
        "paymentStages": doc["paymentStages"],
        "createdAt": datetime.utcnow(),
    }
    await db["reservePledges"].insert_one(pledge_doc)

    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_farmers(country: str = "hti", db=Depends(get_db)):
    cursor = db["farmers"].find({"country": country}).limit(200)
    farmers = [_ser(f) async for f in cursor]
    return {"farmers": farmers, "total": len(farmers)}


@router.get("/pledges")
async def list_pledges(country: str = "hti", db=Depends(get_db)):
    cursor = db["reservePledges"].find({"country": country})
    pledges = [_ser(p) async for p in cursor]
    # Aggregate by crop
    summary = {}
    for p in pledges:
        crop = p.get("cropType") or p.get("crop", "unknown")
        if crop not in summary:
            summary[crop] = {"pledged": 0, "activated": 0, "reconciled": 0}
        summary[crop][p.get("status", "pledged")] = summary[crop].get(p.get("status", "pledged"), 0) + p.get("pledgedKg", 0)
    return {"pledges": pledges, "summary": summary}


@router.patch("/{farmer_id}/pledge-status")
async def update_pledge(farmer_id: str, req: PledgeUpdate, _=Depends(require_ngo), db=Depends(get_db)):
    await db["farmers"].update_one({"_id": ObjectId(farmer_id)}, {"$set": {"pledgeStatus": req.status}})
    await db["reservePledges"].update_one({"farmerId": farmer_id}, {"$set": {"status": req.status}})
    return {"ok": True}
