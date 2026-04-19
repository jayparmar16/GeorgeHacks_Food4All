from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from database import get_db
from services.auth import get_current_user
from services.solana_service import verify_transaction

router = APIRouter(prefix="/donations", tags=["donations"])


class DonationCreate(BaseModel):
    ngoId: str
    amount: float
    currency: str = "SOL"  # SOL | USDC
    txHash: str
    walletAddress: str


def _ser(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@router.post("/")
async def create_donation(req: DonationCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    # Verify on-chain
    verification = await verify_transaction(req.txHash)

    ngo = await db["ngos"].find_one({"_id": ObjectId(req.ngoId)})
    ngo_name = ngo.get("organization", "Unknown NGO") if ngo else "Unknown NGO"

    doc = {
        "donorId": current_user["sub"],
        "donorEmail": current_user["email"],
        "donorName": current_user.get("name", ""),
        "donorRole": current_user.get("role", ""),
        "ngoId": req.ngoId,
        "ngoName": ngo_name,
        "amount": req.amount,
        "currency": req.currency,
        "txHash": req.txHash,
        "walletAddress": req.walletAddress,
        "verified": verification.get("valid", False),
        "verificationData": verification,
        "timestamp": datetime.utcnow(),
        "network": "devnet",
    }
    result = await db["donations"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_my_donations(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db["donations"].find({"donorId": current_user["sub"]}).sort("timestamp", -1).limit(50)
    donations = [_ser(d) async for d in cursor]
    return {"donations": donations}


@router.get("/ngo/{ngo_id}")
async def ngo_donations(ngo_id: str, db=Depends(get_db)):
    cursor = db["donations"].find({"ngoId": ngo_id}).sort("timestamp", -1).limit(100)
    donations = [_ser(d) async for d in cursor]
    total = sum(d.get("amount", 0) for d in donations)
    return {"donations": donations, "total": total}
