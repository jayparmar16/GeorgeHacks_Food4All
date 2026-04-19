from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from database import get_db
from services.auth import get_current_user, require_ngo, optional_user

router = APIRouter(prefix="/vendors", tags=["vendors"])


class VendorRegister(BaseModel):
    name: str
    lon: float
    lat: float
    operatingRadius: float = 5.0  # km
    foodTypes: List[str] = []
    dailyCapacityKg: float = 100.0
    phone: str = ""
    contactMethod: str = "sms"  # sms | whatsapp | community_radio
    languages: List[str] = []
    storageCapacityKg: float = 0.0
    hasTransport: bool = False
    culturalNotes: str = ""
    country: str = "hti"


class VouchRequest(BaseModel):
    action: str  # "vouch" | "flag"


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@router.post("/register")
async def register_vendor(req: VendorRegister, db=Depends(get_db)):
    doc = req.dict()
    doc["location"] = {"type": "Point", "coordinates": [req.lon, req.lat]}
    doc["verified"] = False
    doc["vouches"] = 0
    doc["flags"] = 0
    doc["lastVerified"] = datetime.utcnow()
    doc["nextVerification"] = datetime.utcnow() + timedelta(days=90)
    doc["crisisActive"] = False
    doc["createdAt"] = datetime.utcnow()
    result = await db["vendors"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_vendors(
    country: str = "hti",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: float = 50.0,
    db=Depends(get_db),
):
    query = {"country": country}
    if lat is not None and lon is not None:
        query["location"] = {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lon, lat]},
                "$maxDistance": radius_km * 1000,
            }
        }
    cursor = db["vendors"].find(query).limit(200)
    vendors = [_ser(v) async for v in cursor]
    return {"vendors": vendors, "total": len(vendors)}


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, db=Depends(get_db)):
    v = await db["vendors"].find_one({"_id": ObjectId(vendor_id)})
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return _ser(v)


@router.post("/{vendor_id}/vouch")
async def vouch_vendor(vendor_id: str, req: VouchRequest, db=Depends(get_db)):
    field = "vouches" if req.action == "vouch" else "flags"
    await db["vendors"].update_one({"_id": ObjectId(vendor_id)}, {"$inc": {field: 1}})
    return {"ok": True, "action": req.action}


@router.patch("/{vendor_id}/crisis")
async def toggle_crisis(vendor_id: str, payload: dict, _=Depends(require_ngo), db=Depends(get_db)):
    await db["vendors"].update_one(
        {"_id": ObjectId(vendor_id)},
        {"$set": {"crisisActive": payload.get("active", True)}}
    )
    return {"ok": True}
