import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from database import get_db
from services.auth import require_ngo, get_current_user
from config import CULTURAL_DEFAULTS

router = APIRouter(prefix="/tickets", tags=["tickets"])


class TicketCreate(BaseModel):
    beneficiaryName: str
    location: str
    lon: Optional[float] = None
    lat: Optional[float] = None
    rationType: str = "standard"
    validDays: int = 7
    country: str = "hti"
    issuingNgo: str = ""
    notes: str = ""
    householdSize: int = 1


class TicketRedeem(BaseModel):
    ticketCode: str
    vendorId: str
    location: str = ""


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


def _build_ration(country: str, household_size: int) -> list:
    defaults = CULTURAL_DEFAULTS.get(country, CULTURAL_DEFAULTS["hti"])
    ration = []
    for item, kg_per_person in defaults["ration_kg"].items():
        ration.append({
            "item": item.replace("_", " ").title(),
            "kgPerPerson": kg_per_person,
            "totalKg": round(kg_per_person * household_size, 2),
        })
    return ration


@router.post("/")
async def create_ticket(req: TicketCreate, db=Depends(get_db)):
    code = f"RFS-{uuid.uuid4().hex[:8].upper()}"
    ration = _build_ration(req.country, req.householdSize)

    # Mock user for open access
    current_user = {"sub": "mock-ngo", "role": "ngo_volunteer", "name": "Mock NGO"}

    doc = {
        "ticketCode": code,
        "beneficiaryName": req.beneficiaryName,
        "location": req.location,
        "householdSize": req.householdSize,
        "rationType": req.rationType,
        "ration": ration,
        "country": req.country,
        "issuingNgo": req.issuingNgo or current_user.get("name", ""),
        "issuedBy": current_user["sub"],
        "issuedAt": datetime.utcnow(),
        "validUntil": datetime.utcnow() + timedelta(days=req.validDays),
        "status": "issued",  # issued | redeemed | expired
        "notes": req.notes,
    }
    if req.lon and req.lat:
        doc["geoLocation"] = {"type": "Point", "coordinates": [req.lon, req.lat]}

    result = await db["tickets"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.post("/redeem")
async def redeem_ticket(req: TicketRedeem, db=Depends(get_db)):
    ticket = await db["tickets"].find_one({"ticketCode": req.ticketCode})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket["status"] == "redeemed":
        raise HTTPException(status_code=409, detail="Ticket already redeemed")
    if ticket["status"] == "expired" or ticket["validUntil"] < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Ticket expired")

    await db["tickets"].update_one(
        {"_id": ticket["_id"]},
        {"$set": {"status": "redeemed", "redeemedAt": datetime.utcnow(), "redeemedByVendor": req.vendorId, "redemptionLocation": req.location}}
    )
    return {"ok": True, "ticketCode": req.ticketCode, "ration": ticket.get("ration", [])}


@router.get("/")
async def list_tickets(
    country: str = "hti",
    status: str = "",
    skip: int = 0,
    limit: int = 50,
    db=Depends(get_db),
):
    query = {"country": country}
    if status:
        query["status"] = status
    cursor = db["tickets"].find(query).sort("issuedAt", -1).skip(skip).limit(limit)
    tickets = [_ser(t) async for t in cursor]
    total = await db["tickets"].count_documents(query)
    stats = {
        "issued": await db["tickets"].count_documents({**query, "status": "issued"}),
        "redeemed": await db["tickets"].count_documents({**query, "status": "redeemed"}),
        "expired": await db["tickets"].count_documents({**query, "status": "expired"}),
    }
    return {"tickets": tickets, "total": total, "stats": stats}


@router.get("/verify/{code}")
async def verify_ticket(code: str, db=Depends(get_db)):
    ticket = await db["tickets"].find_one({"ticketCode": code})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ser(ticket)
