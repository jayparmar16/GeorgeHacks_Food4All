"""Disaster activation endpoints — triggers, alerts, SMS blasts."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from services.auth import require_ngo
from services.disaster_signals import check_all_signals
from services.twilio_service import blast_vendors

router = APIRouter(prefix="/activations", tags=["activations"])


class ManualActivation(BaseModel):
    country: str = "hti"
    triggerType: str = "manual"  # manual | earthquake | weather | displacement
    description: str = ""
    severity: str = "warning"  # watch | warning | emergency
    geoPolygon: Optional[dict] = None


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@router.post("/check")
async def check_signals(country: str = "hti", db=Depends(get_db)):
    result = await check_all_signals(country)
    if result["threshold_crossed"]:
        # Store activation
        activation = {
            "triggerType": "auto",
            "country": country,
            "alerts": result["alerts"],
            "firedAt": datetime.utcnow(),
            "notifiedVendors": [],
            "notifiedNgos": [],
        }
        await db["activations"].insert_one(activation)
    return result


@router.post("/trigger")
async def trigger_activation(req: ManualActivation, current_user=Depends(require_ngo), db=Depends(get_db)):
    # Fetch vendors in affected area
    query = {"country": req.country, "crisisActive": {"$ne": True}}
    cursor = db["vendors"].find(query).limit(500)
    vendors = [v async for v in cursor]

    message = (
        f"[ResilientFood ALERT] {req.severity.upper()}: {req.description or 'Disaster alert for your region.'} "
        f"Please confirm your availability and activate crisis mode at resilientfood.org"
    )

    sms_results = await blast_vendors(vendors, message)

    # Activate all vendors
    await db["vendors"].update_many({"country": req.country}, {"$set": {"crisisActive": True}})

    activation = {
        "triggerType": req.triggerType,
        "country": req.country,
        "description": req.description,
        "severity": req.severity,
        "geoPolygon": req.geoPolygon,
        "firedAt": datetime.utcnow(),
        "triggeredBy": current_user["sub"],
        "notifiedVendors": [r.get("vendorId") for r in sms_results],
        "smsResults": sms_results,
        "notifiedNgos": [],
    }
    result = await db["activations"].insert_one(activation)
    activation["id"] = str(result.inserted_id)
    activation.pop("_id", None)
    return activation


@router.get("/active")
async def active_alerts(country: str = "hti", db=Depends(get_db)):
    cursor = db["activations"].find({"country": country}).sort("firedAt", -1).limit(10)
    activations = [_ser(a) async for a in cursor]
    return {"activations": activations, "hasActive": len(activations) > 0}


@router.get("/hotspots")
async def prepositioned_hotspots(country: str = "hti", category: str = "", db=Depends(get_db)):
    query = {"country": country}
    if category:
        query["category"] = category
    cursor = db["hotspots"].find(query).limit(200)
    hotspots = [_ser(h) async for h in cursor]
    if not hotspots:
        hotspots = _mock_hotspots(country)
    return {"hotspots": hotspots}


def _mock_hotspots(country: str) -> list:
    if country == "hti":
        return [
            {"id": "h1", "name": "Port-au-Prince WFP Hub", "category": "food", "lat": 18.543, "lon": -72.338,
             "agency": "WFP", "inventory": "50t rice, 20t beans", "capacity": 500, "note": "Sample data"},
            {"id": "h2", "name": "Les Cayes UNHCR Shelter", "category": "shelter", "lat": 18.198, "lon": -73.754,
             "agency": "UNHCR", "inventory": "Tents x200", "capacity": 1000, "note": "Sample data"},
            {"id": "h3", "name": "Jérémie Medical Post", "category": "medical", "lat": 18.648, "lon": -74.117,
             "agency": "MSF", "inventory": "Emergency supplies", "capacity": 100, "note": "Sample data"},
            {"id": "h4", "name": "Cap-Haïtien Water Point", "category": "water", "lat": 19.757, "lon": -72.200,
             "agency": "UNICEF", "inventory": "Purification units x5", "capacity": 5000, "note": "Sample data"},
        ]
    return [
        {"id": "d1", "name": "Kinshasa WFP Depot", "category": "food", "lat": -4.322, "lon": 15.322,
         "agency": "WFP", "inventory": "30t cassava flour, 15t beans", "capacity": 800, "note": "Sample data"},
        {"id": "d2", "name": "Goma UNHCR Hub", "category": "shelter", "lat": -1.679, "lon": 29.231,
         "agency": "UNHCR", "inventory": "Emergency kits x500", "capacity": 2000, "note": "Sample data"},
    ]
