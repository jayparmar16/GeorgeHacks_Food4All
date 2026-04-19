from fastapi import APIRouter, Query, Depends
from database import get_db
from bson import ObjectId

router = APIRouter(prefix="/ngos", tags=["ngos"])


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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="NGO not found")
    return _ser(ngo)
