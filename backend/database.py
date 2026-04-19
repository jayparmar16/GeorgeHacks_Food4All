"""Database connection — supports real MongoDB or mongomock for local dev."""
import os
import logging
from pymongo import GEOSPHERE, ASCENDING, DESCENDING, TEXT

logger = logging.getLogger(__name__)

client = None
db = None

_USE_MOCK = False


async def connect_db():
    global client, db, _USE_MOCK
    from config import settings

    uri = settings.MONGODB_URI

    # Try real MongoDB first
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=3000)
        _db = _client.get_database("resilient_food")
        # Ping to verify connection
        await _db.command("ping")
        client = _client
        db = _db
        _USE_MOCK = False
        logger.info("Connected to MongoDB (real)")
    except Exception as e:
        logger.warning(f"Real MongoDB unavailable ({e}). Falling back to mongomock.")
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client.get_database("resilient_food")
            _USE_MOCK = True
            logger.info("Using mongomock (in-memory) — data will NOT persist between restarts")
        except ImportError:
            logger.error("Neither MongoDB nor mongomock available. Install MongoDB or run: pip install mongomock-motor")
            raise

    if db is not None:
        await ensure_indexes()


async def close_db():
    global client
    if client:
        client.close()


async def get_db():
    return db


async def ensure_indexes():
    global _USE_MOCK
    if _USE_MOCK:
        # mongomock doesn't support all index types — skip geospatial
        try:
            await db["users"].create_index([("email", ASCENDING)], unique=True)
            await db["tickets"].create_index([("ticketCode", ASCENDING)], unique=True)
        except Exception:
            pass
        return

    # Real MongoDB indexes
    geo_collections = ["vendors", "farmers", "places", "markets", "hotspots"]
    for col in geo_collections:
        try:
            await db[col].create_index([("location", GEOSPHERE)])
        except Exception:
            pass

    try:
        await db["ngos"].create_index([("organization", TEXT), ("sectors", TEXT)])
    except Exception:
        pass

    try:
        await db["users"].create_index([("email", ASCENDING)], unique=True)
        await db["donations"].create_index([("txHash", ASCENDING)])
        await db["tickets"].create_index([("ticketCode", ASCENDING)], unique=True)
        await db["activations"].create_index([("firedAt", DESCENDING)])
        await db["market_pulse"].create_index([("region", ASCENDING), ("timestamp", DESCENDING)])
    except Exception:
        pass

    logger.info("MongoDB indexes ensured")
