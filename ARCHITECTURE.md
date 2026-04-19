# Architecture — Resilient Food Systems

## Data Flow Diagram

```mermaid
flowchart TD
    subgraph Frontend["React Frontend (Vite + Tailwind)"]
        LP[Landing Page\nNGO Directory · Donation · Staff Login]
        DB[Internal Dashboard\nBEFORE / AFTER Disaster tabs]
        MAP[Leaflet Map\nVendors · Farmers · Markets · Routes]
    end

    subgraph Backend["FastAPI Backend (Python)"]
        AUTH[/api/auth\nMock JWT RBAC]
        NGOS[/api/ngos\nHDX-sourced directory]
        VENDORS[/api/vendors\nRootNet registry]
        FARMERS[/api/farmers\nSowSafe ledger]
        DONATIONS[/api/donations\nSolana tx records]
        TICKETS[/api/tickets\nRation ticketing]
        PULSE[/api/market-pulse\nVendor comms]
        ROUTING[/api/routing\nNetworkX paths]
        ACTIVATIONS[/api/activations\nDisaster signals]
    end

    subgraph DataSources["External Data Sources"]
        HDX[HDX CKAN API\n3W NGO data · HOT roads/places\nFEWS NET · WFP prices]
        USGS[USGS Earthquake\nFeed]
        OWM[OpenWeatherMap\nAlerts]
        SOL[Solana Devnet\nRPC endpoint]
    end

    subgraph AI["AI Layer"]
        GEM[Google Gemini API\nRouting narratives\nMarket pulse summaries\nRation suggestions]
    end

    subgraph Storage["Data Storage"]
        MONGO[(MongoDB\nngos · vendors · farmers\ntickets · donations\nplaces · markets · roads)]
        GRAPHPKL[NetworkX Graph\n.pkl cache\nhaiti_road_graph.pkl]
    end

    subgraph Comms["Notifications"]
        TWI[Twilio\nSMS + WhatsApp\nVendor blast]
    end

    LP -->|axios /api proxy| AUTH
    LP -->|fetch NGOs| NGOS
    LP -->|Phantom wallet| SOL
    LP -->|record donation| DONATIONS
    DB -->|CRUD| VENDORS
    DB -->|CRUD| FARMERS
    DB -->|CRUD| TICKETS
    DB -->|messages| PULSE
    DB -->|POST /route| ROUTING
    DB -->|trigger| ACTIVATIONS

    NGOS -->|read| MONGO
    VENDORS -->|read/write| MONGO
    FARMERS -->|read/write| MONGO
    DONATIONS -->|verify tx| SOL
    DONATIONS -->|write| MONGO
    TICKETS -->|read/write| MONGO
    PULSE -->|read/write| MONGO
    ROUTING -->|load graph| GRAPHPKL
    ROUTING -->|context| MONGO
    ACTIVATIONS -->|write| MONGO

    ROUTING -->|narrative prompt| GEM
    PULSE -->|summarize| GEM

    ACTIVATIONS -->|blast| TWI

    HDX -->|nightly cron| NGOS
    HDX -->|ingest_haiti_geodata.py| GRAPHPKL
    HDX -->|ingest_haiti_geodata.py| MONGO
    USGS -->|15min poll| ACTIVATIONS
    OWM -->|15min poll| ACTIVATIONS
```

## Collections Schema

| Collection | Key Fields |
|---|---|
| `users` | email, role, country, walletAddress, verifiedUn |
| `ngos` | organization, sectors, country, region, email, source |
| `vendors` | name, location (GeoPoint), foodTypes, crisisActive, vouches |
| `farmers` | name, location, cropType, pledgedKg, reserveTag, pledgeStatus |
| `reservePledges` | farmerId, crop, pledgedKg, season, status, paymentStages |
| `donations` | donorId, ngoId, amount, txHash, verified, network |
| `tickets` | ticketCode, beneficiaryName, ration[], status, validUntil |
| `activations` | triggerType, country, firedAt, notifiedVendors[], smsResults |
| `market_pulse` | region, text, vendor, messageType, timestamp |
| `places` | name, location (GeoPoint), flagged, distanceToMarketKm, ipcPhase |
| `markets` | name, location (GeoPoint), priceVolatility |
| `hotspots` | name, category, lat/lon, agency, inventory, capacity |

## Cultural Defaults Config

```python
CULTURAL_DEFAULTS = {
  "hti": { staples: ["rice", "beans", "cornmeal", "plantains", "cassava", "oil", "salt", "dried fish"] },
  "cod": { staples: ["cassava flour (fufu)", "maize flour", "beans", "palm oil", "dried fish"] },
  "moz": { staples: ["maize meal (xima)", "beans", "cassava", "cooking oil"] },
  "ind": { staples: ["rice", "wheat flour (atta)", "dal", "mustard oil", "salt", "spices"] },
}
```
