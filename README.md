# Resilient Food Systems

> Coordinates food aid before, during, and after disasters through existing local food economies.

**SDG 2** Zero Hunger · **SDG 13** Climate Action · **SDG 17** Partnerships

---

## Purpose

Resilient Food Systems is a full-stack demo platform for disaster response coordination in Haiti and DRC. It connects local vendors, smallholder farmers, NGOs, and donors through:
- pre-disaster readiness and resource mapping,
- automated disaster signal detection,
- supply routing and ration ticketing,
- Solana Devnet donation flows and vendor activation.

## Quick Start (Local)

```bash
# 1. Clone / open in terminal
cd GeorgeHacks_Food4All

# 2. Start everything
./start.sh

# App: http://localhost:5173
# API: http://localhost:8000/docs
```

The start script:
- Starts MongoDB (or uses URI in `.env`)
- Creates Python venv, installs deps
- Starts FastAPI on port 8000
- Seeds demo data (NGOs, hotspots, market messages)
- Starts React/Vite on port 5173

## Usage

- Open the app at `http://localhost:5173`
- Use the landing page to register or log in
- Internal users see the dashboard at `/dashboard`
- API docs are available at `http://localhost:8000/docs`

---

## Manual Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit with your keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env               # optional: add Mapbox token
npm run dev
```

### Seed Demo Data

```bash
curl -X POST http://localhost:8000/api/admin/seed-demo
```

---

## Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | Recommended | Google Gemini API key (routing narratives, market summaries) |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio for SMS alerts (mocked if not set) |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth |
| `TWILIO_FROM_NUMBER` | Optional | Sender number |
| `OPENWEATHER_API_KEY` | Optional | OpenWeatherMap for disaster signals |
| `JWT_SECRET` | Yes | Secret for mock JWT auth |
| `SOLANA_RPC_URL` | Auto | Defaults to `https://api.devnet.solana.com` |

### `frontend/.env`

| Variable | Optional | Description |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | Optional | Mapbox token (OpenStreetMap used by default) |

---

## Python Version

Python **3.11+** required.

Key dependencies:
```
fastapi, motor, pymongo, pydantic-settings
geopandas, shapely, momepy, networkx, fiona
pandas, requests, openpyxl
google-generativeai, twilio
solders, python-jose, passlib
apscheduler
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                       │
│  Landing Page                    Internal Dashboard             │
│  ┌────────────┐ ┌──────────────┐  BEFORE │ AFTER                │
│  │NGO Directory│ │Solana Donate │  ├ Map      │ ├ Tickets       │
│  │(HDX 3W)    │ │(Phantom/Dev) │  ├ Vendors  │ ├ Market Pulse   │
│  └────────────┘ └──────────────┘  ├ Farmers  │ └ Supply Route   │
│                                   ├ UN Hotspot│                 │
│                                   └ Signals   │                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ axios /api proxy
┌────────────────────────▼────────────────────────────────────────┐
│                   FastAPI Backend (Python)                      │
│  /auth  /ngos  /vendors  /farmers  /donations  /tickets         │
│  /market-pulse  /routing  /activations                          │
│                                                                 │
│  Services: Gemini AI │ Twilio SMS │ Solana verify │ Signals     │
│  Scheduler: 15min signal check │ 2am NGO ingest                 │
└────────────────────────┬────────────────────────────────────────┘
           ┌─────────────┴──────────┬──────────────────┐
           ▼                        ▼                   ▼
   MongoDB Atlas             HDX CKAN API          Solana Devnet
   (all collections)   (NGOs, HOT roads,          (tx verification)
                        FEWS NET, WFP prices)
```

---

## Data Pipelines

### NGO Directory
```bash
cd backend
source .venv/bin/activate
python pipelines/ingest_hdx_ngos.py --country hti --mongo  # Haiti
python pipelines/ingest_hdx_ngos.py --country cod --mongo  # DRC
```

### Geospatial (Roads + Routing Graph)
```bash
python pipelines/ingest_haiti_geodata.py --country hti --mongo
python pipelines/ingest_haiti_geodata.py --country cod --mongo
```
Builds a NetworkX graph from HOT roads shapefiles using `geopandas + momepy`. Caches as `data/haiti_road_graph.pkl`.

---

## Role-Based Auth (Mock)

| Role | Access |
|---|---|
| `general_public_donor` | Landing page, donation flow |
| `un_donor` | Landing page, donation flow (UN flag; @un.org email verified) |
| `ngo_volunteer` | Full internal dashboard |
| `vendor` | Dashboard + vendor profile |

---

## Demo Walkthrough

1. **Landing** → Visit `http://localhost:5173`. NGO directory loads Haiti NGOs from MongoDB (seeded from HDX or demo data). Switch country to DRC.

2. **Donation** → Click "General Public Donor" → register → select an NGO → Connect Phantom (Devnet) → donate 0.25 SOL → see tx hash receipt.

3. **Internal login** → Use NGO Login → register as `ngo_volunteer` → get routed to dashboard.

4. **BEFORE tab** → Map shows vendors, farmers, UN hotspots. Register a vendor in RootNet. Enroll a farmer in SowSafe.

5. **Disaster Signals** → Click "Check Now" to query USGS + weather. Or manually trigger an alert → vendors get SMS blast (mocked if no Twilio key).

6. **AFTER tab** → Issue a ration ticket (culturally accurate: rice/beans/cornmeal for Haiti). Market Pulse shows vendor messages. Click "Gemini Summary".

7. **Supply Routing** → Select depot + destination → Compute Route → see road path on map + Gemini narrative.

---

## Ethics & Data Privacy

See [ETHICS.md](ETHICS.md).

---

## License

This repository includes an open-source MIT license. See the `LICENSE` file for full terms.
