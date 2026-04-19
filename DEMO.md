# Resilient Food Systems — Demo Guide

> A disaster food-aid coordination platform for Haiti and DRC, built on FastAPI + React + MongoDB + Solana Devnet + Google Gemini.

---

## Quick Start

```bash
./start.sh
```

- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs
- **MongoDB:** `mongodb://localhost:27017/resilient_food` (or in-memory fallback)

---

## Demo Credentials

All accounts are seeded automatically on first start. Password for every account: **`demo1234`**

| Role | Email | Password | Access |
|------|-------|----------|--------|
| General Public Donor | `donor@demo.com` | `demo1234` | Landing page — donate via Solana |
| UN-Affiliated Donor | `un@demo.com` | `demo1234` | Landing page — donate with UN verification |
| NGO Volunteer | `ngo@demo.com` | `demo1234` | Full internal dashboard |
| Food Vendor | `vendor@demo.com` | `demo1234` | Full internal dashboard |

> **Internal dashboard** (http://localhost:5173/dashboard) requires `ngo_volunteer` or `vendor` role.
> Use the **Quick Demo Login** buttons on the landing page for one-click access.

---

## Features

### Landing Page (Public)

#### 1. NGO Directory
- Browse food security & disaster relief NGOs sourced from **HDX CKAN 3W datasets**
- Haiti: 35+ NGOs from OCHA 3W XLSX (Aug 2025)
- DRC: 54+ NGOs from HDX HAPI global CSV
- Filter by country (🇭🇹 Haiti / 🇨🇩 DRC) and search by name or sector
- Click any NGO card to **select it for donation**
- Blue `HDX` badge indicates live humanitarian data; grey = demo seed

#### 2. Solana Donation Flow
- Select donor type: General Public or UN-Affiliated
- Login/register with your role (or use demo credentials above)
- Connect **Phantom wallet** (Solana Devnet — no real funds)
- Choose preset amount (0.1–2.0 SOL) or enter custom
- Donation is recorded on Solana Devnet with a transaction hash
- Receipt shows NGO name, amount, tx hash

> **Note:** This uses Solana Devnet. Get free devnet SOL at https://faucet.solana.com — or the mock tx hash still works for demonstration.

#### 3. Internal Staff Login
- NGO volunteers and vendors log in here
- **Quick Demo Login buttons** auto-fill credentials — one click to dashboard
- Supports register + login flows

---

### Internal Dashboard (Staff Only)

Access via `/dashboard` after logging in as `ngo@demo.com` or `vendor@demo.com`.

#### Before Disaster Tab

##### Overview Map
- **Leaflet map** centered on Haiti or DRC (switch country in top-right selector)
- Layer controls (top-right of map) to toggle:
  - 🟢 **Vendors** (green circles) — RootNet registered food vendors
  - 🟡 **Farmers** (orange circles) — SowSafe enrolled farmers
  - 🔵 **Markets** (indigo circles) — HDX-sourced market locations
  - ⚫ **Populated Places** (grey/red) — red = underserved (>10 km from nearest market)
  - 🔴 **UN Hotspots** (color-coded) — WFP, UNHCR, MSF, UNICEF facilities

##### RootNet Vendor Registry
Register and manage local food vendors who form the **crisis distribution backbone**.
- Fields: name, GPS coordinates, food types, daily capacity (kg), contact method (SMS/WhatsApp/community radio), storage capacity, transport availability
- Vouch system: community members can verify vendors (vouches / flags)
- Crisis mode toggle: marks a vendor as active during disaster (triggers SMS activation)
- Demo vendors pre-seeded: Marché de Fer, Les Cayes Food Hub, Cap-Haïtien Vendor Collective (Haiti); Kinshasa Food Depot, Goma Market Collective (DRC)

##### SowSafe Farmer Enrollment
Enroll farmers for **pre-disaster crop pledges** — creates reserve stock commitments.
- Fields: name, crop type, yield estimate (kg), pledge percentage (15–20%), planting season
- Generates a unique **reserve tag** (e.g., `HAI-R-001`)
- Pledge status: pending → active → fulfilled
- Pledge amounts feed into ration ticket calculations
- Demo farmers pre-seeded across both countries

##### UN Aid Hotspots
Map view showing UN and INGO facility locations:
- **Food hubs** (green) — WFP distribution centers
- **Shelter** (blue) — UNHCR camps
- **Medical** (pink) — MSF emergency posts
- **Water** (cyan) — UNICEF purification points
- **Fuel** (amber) — reserve fuel stations

##### Disaster Signals
Automated disaster detection + manual activation:
- **Auto Signals:** Click "Check Now" to poll USGS Earthquake Feed + OpenWeatherMap alerts
  - Threshold: earthquake M5.0+ within 500 km, or severe weather alert
  - On threshold cross → auto-activates vendor SMS blast
- **Manual Activation:** Set description, severity (watch/warning/emergency), trigger type → fires Twilio SMS to all registered vendors in that country
- Activation log shows all past alerts with timestamps and vendor notification counts

---

#### After Disaster Tab

##### Ration Ticket System
Issue and redeem digital ration tickets for displaced households.
- **Issue ticket:** beneficiary name, location, household size → generates ration items
- **Culturally accurate rations** by country:
  - 🇭🇹 **Haiti:** rice, beans, cornmeal, plantains, cassava, cooking oil, salt, dried fish
  - 🇨🇩 **DRC:** cassava flour (fufu), maize flour, beans, palm oil, dried fish
- Quantities scaled by household size (e.g., 4-person household = 2× ration_kg per item)
- **Redeem ticket:** enter ticket code (format: `RFS-XXXXXXXX`) at vendor point
- Stats bar shows issued / redeemed / expired counts

##### Live Market Pulse
Real-time vendor messaging system with AI summaries.
- Select region (Port-au-Prince, Les Cayes, Gonaïves… or Kinshasa, Goma, Bukavu…)
- Post messages by type: **update**, **price change**, **shortage**, **broadcast**
- Click **Gemini Summary** to get an AI-generated market intelligence summary for that region
- Useful for NGO coordinators monitoring supply conditions across multiple locations

##### Supply Route Planner
Compute optimal supply routes from depots to underserved communities.
- **Select Source Depot:** preset WFP hubs (Port-au-Prince, Les Cayes, Cap-Haïtien for Haiti; Kinshasa, Goma for DRC) — or enter custom lon/lat
- **Select Destination:** preset underserved towns (Jérémie, Corail, Pestel, Gonaïves for Haiti) — or enter custom coordinates
- **Compute Route** → runs NetworkX shortest-path on HOT road graph (real road data via HDX)
  - Falls back to straight-line distance if graph unavailable
  - Shows distance in km
- **Gemini Routing Narrative:** AI-generated plain-English route description with cultural context and risk factors
- Map overlay shows: route (dashed amber line), underserved places (red dots), markets (indigo), source (green dot), destination (red dot)
- **Underserved Places panel:** lists communities >10 km from nearest market, sorted by distance

---

## Data Sources

| Source | What | Used For |
|--------|------|----------|
| [HDX CKAN](https://data.humdata.org) | OCHA 3W NGO datasets | NGO directory |
| [HDX HAPI](https://data.humdata.org) | Global operational presence CSV | DRC NGO data |
| [HOT OSM](https://export.hotosm.org) | Roads + populated places | Map layers + routing graph |
| [USGS Earthquake](https://earthquake.usgs.gov) | M4.5+ earthquake feed | Disaster signals |
| [OpenWeatherMap](https://openweathermap.org) | Severe weather alerts | Disaster signals |
| [WFP VAM](https://data.humdata.org) | Market price data | Market volatility layer |
| Solana Devnet | Blockchain transactions | Donation verification |
| Google Gemini 2.0 Flash | LLM | Routing narratives, market summaries, ration suggestions |

---

## Running the HDX Ingest Pipelines

```bash
# Haiti NGOs (~35 orgs from OCHA 3W XLSX)
cd backend
.venv/bin/python pipelines/ingest_hdx_ngos.py --country hti --mongo

# DRC NGOs (~54 orgs from HDX HAPI CSV)
.venv/bin/python pipelines/ingest_hdx_ngos.py --country cod --mongo

# Debug mode (print all HDX datasets + CSV links)
.venv/bin/python pipelines/ingest_hdx_ngos.py --country hti --debug
```

---

## Environment Variables

Create `backend/.env` (auto-created by `start.sh`):

```env
MONGODB_URI=mongodb://localhost:27017/resilient_food
JWT_SECRET=your_secret_here
GEMINI_API_KEY=your_gemini_key       # https://aistudio.google.com
OPENWEATHER_API_KEY=your_owm_key     # https://openweathermap.org/api
TWILIO_ACCOUNT_SID=your_twilio_sid   # optional, for real SMS
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM=+1555000000
```

> Without `GEMINI_API_KEY`, all AI features return mock strings.
> Without `TWILIO_*`, SMS activations are simulated (logged but not sent).

---

## Architecture

```
Frontend (React/Vite :5173)
  ├── Landing:  NGO Directory · Donation Flow · Login
  └── Dashboard: Map · Vendors · Farmers · Tickets · Pulse · Routing · Signals

Backend (FastAPI :8000)
  ├── /api/auth        — JWT mock auth (4 roles)
  ├── /api/ngos        — HDX-sourced NGO directory
  ├── /api/vendors     — RootNet vendor registry
  ├── /api/farmers     — SowSafe farmer ledger
  ├── /api/tickets     — Ration ticketing system
  ├── /api/market-pulse — Vendor comms + Gemini
  ├── /api/routing     — NetworkX road graph routing
  ├── /api/activations — USGS/OWM signals + SMS blast
  └── /api/donations   — Solana tx records

Pipelines (cron / manual)
  ├── ingest_hdx_ngos.py      — HDX 3W → MongoDB
  └── ingest_haiti_geodata.py — HOT roads → NetworkX .pkl

Storage: MongoDB (mongomock in-memory fallback)
```
