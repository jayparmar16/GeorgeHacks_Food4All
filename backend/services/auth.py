"""Mock role-based auth — JWT tokens, no external provider."""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from config import settings

bearer_scheme = HTTPBearer(auto_error=False)

ROLES = {"general_public_donor", "un_donor", "ngo_volunteer", "vendor"}
INTERNAL_ROLES = {"ngo_volunteer", "vendor"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    return payload


async def require_internal(user=Depends(get_current_user)):
    if user.get("role") not in INTERNAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Internal access only")
    return user


async def require_ngo(user=Depends(get_current_user)):
    if user.get("role") != "ngo_volunteer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="NGO access only")
    return user


async def require_vendor(user=Depends(get_current_user)):
    if user.get("role") != "vendor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor access only")
    return user


async def optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        return None
    try:
        return decode_token(credentials.credentials)
    except Exception:
        return None
