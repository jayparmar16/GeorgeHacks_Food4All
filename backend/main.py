"""Resilient Food Systems — FastAPI backend."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import connect_db, close_db
from config import settings

# Routes
from routes.auth_routes import router as auth_router
from routes.ngo_routes import router as ngo_router
from routes.vendor_routes import router as vendor_router
from routes.farmer_routes import router as farmer_router
from routes.donation_routes import router as donation_router
from routes.ticket_routes import router as ticket_router
from routes.market_pulse_routes import router as pulse_router
from routes.routing_routes import router as routing_router
from routes.activation_routes import router as activation_router
from services.auth import mock_auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def scheduled_ngo_ingest():
    """Nightly NGO data refresh from HDX."""
    try:
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "pipelines"))
        from ingest_hdx_ngos import run_pipeline
        for country in ["hti", "cod"]:
            run_pipeline(country, write_mongo=True)
    except Exception as e:
        logger.error(f"Scheduled NGO ingest failed: {e}")


async def scheduled_signal_check():
    """Every 15 minutes — check disaster signals."""
    from services.disaster_signals import check_all_signals
    from database import get_db
    from datetime import datetime
    for country in ["hti", "cod"]:
        result = await check_all_signals(country)
        if result["threshold_crossed"]:
            db = await get_db()
            if db is not None:
                await db["activations"].insert_one({
                    "triggerType": "auto_signal",
                    "country": country,
                    "alerts": result["alerts"],
                    "firedAt": datetime.utcnow(),
                    "notifiedVendors": [],
                    "notifiedNgos": [],
                })
                logger.warning(f"Auto activation fired for {country}: {len(result['alerts'])} alerts")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    scheduler.add_job(scheduled_signal_check, "interval", minutes=15, id="signal_check")
    scheduler.add_job(scheduled_ngo_ingest, "cron", hour=2, minute=0, id="ngo_ingest")
    scheduler.start()
    logger.info("Scheduler started")
    yield
    scheduler.shutdown()
    await close_db()


app = FastAPI(
    title="Resilient Food Systems API",
    description="Coordinates food aid before, during, and after disasters through local food economies.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(ngo_router, prefix="/api")
app.include_router(vendor_router, prefix="/api")
app.include_router(farmer_router, prefix="/api")
app.include_router(donation_router, prefix="/api")
app.include_router(ticket_router, prefix="/api")
app.include_router(pulse_router, prefix="/api")
app.include_router(routing_router, prefix="/api")
app.include_router(activation_router, prefix="/api")
app.include_router(mock_auth_router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "app": "Resilient Food Systems", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/cultural-defaults")
async def cultural_defaults():
    from config import CULTURAL_DEFAULTS
    return CULTURAL_DEFAULTS


@app.post("/api/admin/ingest-ngos")
async def trigger_ngo_ingest(country: str = "hti"):
    """Manually trigger HDX NGO ingest."""
    await scheduled_ngo_ingest()
    return {"triggered": True, "country": country}


@app.post("/api/admin/seed-demo")
async def seed_demo_data():
    """Seed demo data for local development."""
    from database import get_db
    from datetime import datetime
    from services.auth import hash_password
    db = await get_db()

    # Seed demo users (idempotent)
    DEMO_USERS = [
        {"email": "donor@demo.com", "name": "Demo Donor", "role": "general_public_donor", "country": "hti"},
        {"email": "un@demo.com", "name": "UN Demo User", "role": "un_donor", "country": "hti", "verifiedUn": True},
        {"email": "ngo@demo.com", "name": "NGO Volunteer", "role": "ngo_volunteer", "country": "hti"},
        {"email": "vendor@demo.com", "name": "Demo Vendor", "role": "vendor", "country": "hti"},
    ]
    pw_hash = hash_password("demo1234")
    for u in DEMO_USERS:
        await db["users"].update_one(
            {"email": u["email"]},
            {"$set": {**u, "password": pw_hash, "updatedAt": datetime.utcnow()}},
            upsert=True,
        )

    # Seed sample NGOs if collection is empty
    count = await db["ngos"].count_documents({})
    if count == 0:
        sample_ngos = [
            {"organization": "World Food Programme Haiti", "sectors": "Food Security", "country": "hti",
             "region": "Ouest", "email": "wfp.haiti@wfp.org", "phone": "+509-2812-0000",
             "operationalRegion": "National", "source": "demo"},
            {"organization": "CARE International Haiti", "sectors": "Food Security; Disaster Relief", "country": "hti",
             "region": "Sud", "email": "info@care-haiti.org", "operationalRegion": "Sud, Sud-Est", "source": "demo"},
            {"organization": "Mercy Corps Haiti", "sectors": "Disaster Relief; Food Security", "country": "hti",
             "region": "Artibonite", "email": "haiti@mercycorps.org", "operationalRegion": "Artibonite, Centre", "source": "demo"},
            {"organization": "Oxfam Haiti", "sectors": "Food Security", "country": "hti",
             "region": "Grand'Anse", "email": "haiti@oxfam.org", "operationalRegion": "Grand'Anse, Nippes", "source": "demo"},
            {"organization": "Action Against Hunger Haiti", "sectors": "Food Security; Nutrition", "country": "hti",
             "region": "Nord", "email": "info@acf-haiti.org", "operationalRegion": "Nord, Nord-Est", "source": "demo"},
            {"organization": "Save the Children Haiti", "sectors": "Food Security; Education", "country": "hti",
             "region": "Centre", "email": "haiti@savethechildren.org", "operationalRegion": "Centre, Artibonite", "source": "demo"},
            {"organization": "CONCERN Worldwide DRC", "sectors": "Food Security", "country": "cod",
             "region": "Kivu", "email": "info@concern-drc.org", "operationalRegion": "North Kivu, South Kivu", "source": "demo"},
            {"organization": "WFP DRC", "sectors": "Food Security; Disaster Relief", "country": "cod",
             "region": "Kinshasa", "email": "wfp.drc@wfp.org", "operationalRegion": "National", "source": "demo"},
            {"organization": "IRC Congo", "sectors": "Disaster Relief; Food Security", "country": "cod",
             "region": "Ituri", "email": "drc@rescue.org", "operationalRegion": "Ituri, Tanganyika", "source": "demo"},
        ]
        for ngo in sample_ngos:
            ngo["updatedAt"] = datetime.utcnow()
            await db["ngos"].update_one(
                {"organization": ngo["organization"], "country": ngo["country"]},
                {"$set": ngo}, upsert=True
            )

    # Seed market pulse messages
    pulse_count = await db["market_pulse"].count_documents({})
    if pulse_count == 0:
        sample_msgs = [
            {"region": "Port-au-Prince", "country": "hti", "vendor": "Marché de Fer", "text": "Rice supply good. Price stable at 250 HTG/kg.", "messageType": "update", "timestamp": datetime.utcnow()},
            {"region": "Port-au-Prince", "country": "hti", "vendor": "Marché Croix-des-Bossales", "text": "Bean prices up 15% this week. Drought affecting supply from Artibonite.", "messageType": "price", "timestamp": datetime.utcnow()},
            {"region": "Les Cayes", "country": "hti", "vendor": "Marché Central", "text": "Fuel shortage. Only 2 of 5 vendors have kerosene stock.", "messageType": "shortage", "timestamp": datetime.utcnow()},
            {"region": "Kinshasa", "country": "cod", "vendor": "Grand Marché", "text": "Cassava flour supply adequate. Palm oil price +8% due to transport issues.", "messageType": "price", "timestamp": datetime.utcnow()},
        ]
        await db["market_pulse"].insert_many(sample_msgs)

    # Seed hotspots
    hotspot_count = await db["hotspots"].count_documents({})
    if hotspot_count == 0:
        hotspots = [
            {"name": "Port-au-Prince WFP Hub", "category": "food", "country": "hti",
             "lat": 18.543, "lon": -72.338, "agency": "WFP", "inventory": "50t rice, 20t beans", "capacity": 500, "isMock": True,
             "location": {"type": "Point", "coordinates": [-72.338, 18.543]}},
            {"name": "Les Cayes UNHCR Shelter", "category": "shelter", "country": "hti",
             "lat": 18.198, "lon": -73.754, "agency": "UNHCR", "inventory": "Tents x200", "capacity": 1000, "isMock": True,
             "location": {"type": "Point", "coordinates": [-73.754, 18.198]}},
            {"name": "Jérémie Medical Post", "category": "medical", "country": "hti",
             "lat": 18.648, "lon": -74.117, "agency": "MSF", "inventory": "Emergency supplies", "capacity": 100, "isMock": True,
             "location": {"type": "Point", "coordinates": [-74.117, 18.648]}},
            {"name": "Cap-Haïtien Water Point", "category": "water", "country": "hti",
             "lat": 19.757, "lon": -72.200, "agency": "UNICEF", "inventory": "Purification units x5", "capacity": 5000, "isMock": True,
             "location": {"type": "Point", "coordinates": [-72.200, 19.757]}},
            {"name": "Kinshasa WFP Depot", "category": "food", "country": "cod",
             "lat": -4.322, "lon": 15.322, "agency": "WFP", "inventory": "30t cassava flour", "capacity": 800, "isMock": True,
             "location": {"type": "Point", "coordinates": [15.322, -4.322]}},
        ]
        await db["hotspots"].insert_many(hotspots)

    # Seed geodata (inline mock — works with both real MongoDB and mongomock)
    MOCK_GEO = {
        "hti": {
            "places": [
                {"name": "Port-au-Prince", "population": 987310, "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-72.338, 18.543]}},
                {"name": "Jérémie", "population": 31952, "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-74.117, 18.648]}},
                {"name": "Corail", "population": 8200, "country": "hti", "isMock": True, "flagged": True, "distanceToMarketKm": 18.0, "flagReason": "nearest market 18 km away", "location": {"type": "Point", "coordinates": [-73.889, 18.562]}},
                {"name": "Les Cayes", "population": 82550, "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-73.754, 18.198]}},
                {"name": "Pestel", "population": 6400, "country": "hti", "isMock": True, "flagged": True, "distanceToMarketKm": 14.0, "flagReason": "nearest market 14 km away", "location": {"type": "Point", "coordinates": [-74.038, 18.580]}},
                {"name": "Cap-Haïtien", "population": 190900, "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-72.200, 19.757]}},
                {"name": "Gonaïves", "population": 104825, "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-72.686, 19.447]}},
            ],
            "markets": [
                {"name": "Marché de Fer", "market": "Marché de Fer", "city": "Port-au-Prince", "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-72.336, 18.544]}},
                {"name": "Les Cayes Market", "market": "Les Cayes Market", "city": "Les Cayes", "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-73.750, 18.200]}},
                {"name": "Cap-Haïtien Market", "market": "Cap-Haïtien Market", "city": "Cap-Haïtien", "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-72.202, 19.755]}},
                {"name": "Gonaïves Market", "market": "Gonaïves Market", "city": "Gonaïves", "country": "hti", "isMock": True, "location": {"type": "Point", "coordinates": [-72.685, 19.445]}},
            ],
        },
        "cod": {
            "places": [
                {"name": "Kinshasa", "population": 15628085, "country": "cod", "isMock": True, "location": {"type": "Point", "coordinates": [15.322, -4.322]}},
                {"name": "Goma", "population": 670000, "country": "cod", "isMock": True, "location": {"type": "Point", "coordinates": [29.231, -1.679]}},
            ],
            "markets": [
                {"name": "Grand Marché Kinshasa", "market": "Grand Marché", "country": "cod", "isMock": True, "location": {"type": "Point", "coordinates": [15.325, -4.320]}},
                {"name": "Goma Market", "market": "Goma Market", "country": "cod", "isMock": True, "location": {"type": "Point", "coordinates": [29.233, -1.680]}},
            ],
        },
    }
    for country_code, collections in MOCK_GEO.items():
        for col_name, records in collections.items():
            existing = await db[col_name].count_documents({"country": country_code})
            if existing == 0:
                for r in records:
                    r["updatedAt"] = datetime.utcnow()
                await db[col_name].insert_many(records)

    # Seed demo vendors
    vendor_count = await db["vendors"].count_documents({})
    if vendor_count == 0:
        sample_vendors = [
            {"name": "Marché de Fer", "country": "hti", "lon": -72.336, "lat": 18.544,
             "location": {"type": "Point", "coordinates": [-72.336, 18.544]},
             "foodTypes": ["rice", "beans", "oil"], "dailyCapacityKg": 500,
             "phone": "+509-3700-0001", "contactMethod": "sms", "languages": ["Haitian Creole"],
             "operatingRadius": 5.0, "storageCapacityKg": 2000, "hasTransport": True,
             "verified": True, "vouches": 12, "flags": 0, "crisisActive": False,
             "createdAt": datetime.utcnow()},
            {"name": "Croix-des-Bossales Depot", "country": "hti", "lon": -72.343, "lat": 18.550,
             "location": {"type": "Point", "coordinates": [-72.343, 18.550]},
             "foodTypes": ["cornmeal", "salt", "dried fish"], "dailyCapacityKg": 300,
             "phone": "+509-3700-0002", "contactMethod": "whatsapp", "languages": ["Haitian Creole", "French"],
             "operatingRadius": 3.0, "storageCapacityKg": 800, "hasTransport": False,
             "verified": True, "vouches": 8, "flags": 0, "crisisActive": False,
             "createdAt": datetime.utcnow()},
            {"name": "Les Cayes Food Hub", "country": "hti", "lon": -73.750, "lat": 18.200,
             "location": {"type": "Point", "coordinates": [-73.750, 18.200]},
             "foodTypes": ["rice", "plantains", "cassava"], "dailyCapacityKg": 200,
             "phone": "+509-3700-0003", "contactMethod": "sms", "languages": ["Haitian Creole"],
             "operatingRadius": 10.0, "storageCapacityKg": 500, "hasTransport": True,
             "verified": True, "vouches": 5, "flags": 0, "crisisActive": True,
             "createdAt": datetime.utcnow()},
            {"name": "Cap-Haïtien Vendor Collective", "country": "hti", "lon": -72.202, "lat": 19.755,
             "location": {"type": "Point", "coordinates": [-72.202, 19.755]},
             "foodTypes": ["rice", "beans", "oil", "salt"], "dailyCapacityKg": 400,
             "phone": "+509-3700-0004", "contactMethod": "community_radio", "languages": ["Haitian Creole"],
             "operatingRadius": 8.0, "storageCapacityKg": 1200, "hasTransport": True,
             "verified": False, "vouches": 3, "flags": 1, "crisisActive": False,
             "createdAt": datetime.utcnow()},
            {"name": "Kinshasa Food Depot", "country": "cod", "lon": 15.325, "lat": -4.320,
             "location": {"type": "Point", "coordinates": [15.325, -4.320]},
             "foodTypes": ["cassava flour", "maize flour", "palm oil"], "dailyCapacityKg": 600,
             "phone": "+243-800-0001", "contactMethod": "whatsapp", "languages": ["Lingala", "French"],
             "operatingRadius": 15.0, "storageCapacityKg": 3000, "hasTransport": True,
             "verified": True, "vouches": 9, "flags": 0, "crisisActive": False,
             "createdAt": datetime.utcnow()},
            {"name": "Goma Market Collective", "country": "cod", "lon": 29.233, "lat": -1.680,
             "location": {"type": "Point", "coordinates": [29.233, -1.680]},
             "foodTypes": ["beans", "dried fish", "cooking oil"], "dailyCapacityKg": 250,
             "phone": "+243-800-0002", "contactMethod": "sms", "languages": ["Swahili", "French"],
             "operatingRadius": 6.0, "storageCapacityKg": 700, "hasTransport": False,
             "verified": True, "vouches": 6, "flags": 0, "crisisActive": False,
             "createdAt": datetime.utcnow()},
        ]
        await db["vendors"].insert_many(sample_vendors)

    # Seed demo farmers
    farmer_count = await db["farmers"].count_documents({})
    if farmer_count == 0:
        sample_farmers = [
            {"name": "Jean-Baptiste Pierre", "country": "hti", "lon": -72.500, "lat": 19.100,
             "location": {"type": "Point", "coordinates": [-72.500, 19.100]},
             "cropType": "rice", "pledgedKg": 500, "plantingSeason": "Spring 2026",
             "reserveTag": "HAI-R-001", "pledgeStatus": "active",
             "phone": "+509-3800-0001", "region": "Artibonite", "createdAt": datetime.utcnow()},
            {"name": "Marie Desrosiers", "country": "hti", "lon": -72.800, "lat": 18.800,
             "location": {"type": "Point", "coordinates": [-72.800, 18.800]},
             "cropType": "beans", "pledgedKg": 300, "plantingSeason": "Spring 2026",
             "reserveTag": "HAI-B-002", "pledgeStatus": "active",
             "phone": "+509-3800-0002", "region": "Centre", "createdAt": datetime.utcnow()},
            {"name": "Claudette Joseph", "country": "hti", "lon": -73.200, "lat": 18.600,
             "location": {"type": "Point", "coordinates": [-73.200, 18.600]},
             "cropType": "cornmeal", "pledgedKg": 400, "plantingSeason": "Spring 2026",
             "reserveTag": "HAI-C-003", "pledgeStatus": "pending",
             "phone": "+509-3800-0003", "region": "Nippes", "createdAt": datetime.utcnow()},
            {"name": "Pierre-Louis Duval", "country": "hti", "lon": -72.100, "lat": 19.500,
             "location": {"type": "Point", "coordinates": [-72.100, 19.500]},
             "cropType": "plantains", "pledgedKg": 200, "plantingSeason": "Summer 2026",
             "reserveTag": "HAI-P-004", "pledgeStatus": "active",
             "phone": "+509-3800-0004", "region": "Nord", "createdAt": datetime.utcnow()},
            {"name": "Amani Kabila", "country": "cod", "lon": 28.900, "lat": -2.200,
             "location": {"type": "Point", "coordinates": [28.900, -2.200]},
             "cropType": "cassava", "pledgedKg": 800, "plantingSeason": "Spring 2026",
             "reserveTag": "COD-C-001", "pledgeStatus": "active",
             "phone": "+243-810-0001", "region": "South Kivu", "createdAt": datetime.utcnow()},
            {"name": "Fatima Ngozi", "country": "cod", "lon": 29.100, "lat": -1.900,
             "location": {"type": "Point", "coordinates": [29.100, -1.900]},
             "cropType": "maize", "pledgedKg": 600, "plantingSeason": "Spring 2026",
             "reserveTag": "COD-M-002", "pledgeStatus": "active",
             "phone": "+243-810-0002", "region": "North Kivu", "createdAt": datetime.utcnow()},
        ]
        await db["farmers"].insert_many(sample_farmers)

    return {"seeded": True}
