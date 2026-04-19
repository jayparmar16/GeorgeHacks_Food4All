from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from datetime import datetime
from bson import ObjectId
from database import get_db
from services.auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # general_public_donor | un_donor | ngo_volunteer | vendor
    name: str
    country: str = "hti"
    phone: str = ""
    walletAddress: str = ""
    unVerified: bool = False  # for UN donors — simplified mock check


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def _safe_user(user: dict) -> dict:
    user = dict(user)
    user.pop("password", None)
    user.pop("passwordHash", None)
    user["id"] = str(user.pop("_id", ""))
    return user


@router.post("/register")
async def register(req: RegisterRequest, db=Depends(get_db)):
    if req.role not in {"general_public_donor", "un_donor", "ngo_volunteer", "vendor"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = await db["users"].find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Mock UN verification: accept any email ending in @un.org or flag unVerified=True
    verified_un = False
    if req.role == "un_donor":
        verified_un = req.email.endswith("@un.org") or req.unVerified

    user_doc = {
        "email": req.email,
        "password": hash_password(req.password),
        "role": req.role,
        "name": req.name,
        "country": req.country,
        "phone": req.phone,
        "walletAddress": req.walletAddress,
        "verifiedUn": verified_un,
        "createdAt": datetime.utcnow(),
    }
    result = await db["users"].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_token({"sub": str(result.inserted_id), "email": req.email, "role": req.role, "name": req.name})
    return {"token": token, "user": _safe_user(user_doc)}


@router.post("/login")
async def login(req: LoginRequest, db=Depends(get_db)):
    user = await db["users"].find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "name": user.get("name", ""),
    })
    return {"token": token, "user": _safe_user(user)}


@router.get("/me")
async def me(current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    user = await db["users"].find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _safe_user(user)


@router.patch("/me/wallet")
async def update_wallet(payload: dict, current_user=Depends(get_current_user), db=Depends(get_db)):
    await db["users"].update_one(
        {"_id": ObjectId(current_user["sub"])},
        {"$set": {"walletAddress": payload.get("walletAddress", "")}}
    )
    return {"ok": True}
