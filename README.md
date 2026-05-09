# YieldMaxxing

Precision agriculture for UK corn farmers. Upload a photo of your crop, get an AI diagnosis, see satellite health data overlaid on your actual field boundaries, and walk away with a treatment plan.

Built in 3 hours at a hackathon. It works.

## What it does

1. **Farmer uploads a crop photo** and enters their UK postcode
2. **GPT-5.5 Vision** identifies diseases, nutrient deficiencies, or pest damage from the image
3. **Sentinel-2 satellite** fetches NDVI (vegetation health) imagery for the farm area
4. **CROME 2025 field boundaries** from gov.uk render on the map so the farmer can select their actual fields
5. **AI optimizer** synthesizes everything into a prioritized treatment plan with cost estimates and timing

The farmer gets back something actionable. Not a dashboard, not a chart. "Apply 40kg/ha CAN to the north field before Thursday."

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │      │   Go API     │      │  Python Agents  │
│  React/Vite │◄────►│  Fiber :8080 │◄────►│  LangGraph :8001│
│  Mapbox GL  │      │  pgx/Postgres│      │  GPT-5.5 Vision  │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                     ┌──────┴───────┐
                     │   External   │
                     │  - Sentinel Hub (NDVI/RGB)
                     │  - postcodes.io (geocoding)
                     │  - CROME OGC API (field boundaries)
                     │  - Google OAuth
                     └──────────────┘
```

**Go API** handles auth, job management, satellite tile fetching (with OAuth2 token caching), geocoding, and CROME field boundary proxying.

**Python Agents** run the AI pipeline: crop photo analysis, NDVI-based field detection, human-in-the-loop field selection (LangGraph interrupt), and final treatment planning.

**Frontend** is a Mapbox GL map with postcode search, CROME polygon rendering, photo upload, and results display.

## Running locally

```bash
cp .env.example .env
# Fill in: OPENAI_API_KEY, SH_CLIENT_ID, SH_CLIENT_SECRET, GOOGLE_CLIENT_ID/SECRET

docker compose up
```

Go API on `:8080`, Python agents on `:8001`, Postgres on `:5432`.

Or run without Docker:

```bash
# Terminal 1: Postgres
docker compose up postgres

# Terminal 2: Go API
cd go-api && go run main.go

# Terminal 3: Python agents
cd python-agents && pip install -r requirements.txt && uvicorn main:app --port 8001
```

## Test page

Open `test-case-frontend/map-test.html` in a browser to test the Go API endpoints (geocode, CROME fields, satellite tiles) without needing the full React frontend.

Open `test-case-frontend/index.html` to test the Python agent pipeline directly.

## API endpoints

| Method | Path | Auth | What it does |
|--------|------|------|--------------|
| GET | `/api/geocode?postcode=X` | No | UK postcode to lat/lon + county |
| GET | `/api/fields?lat=X&lon=Y&county=X` | No | CROME 2025 field boundaries (GeoJSON) |
| GET | `/api/satellite/ndvi?lat=X&lon=Y` | JWT | Sentinel-2 NDVI tile (PNG) |
| GET | `/api/satellite/rgb?lat=X&lon=Y` | JWT | Sentinel-2 true-colour tile (PNG) |
| POST | `/api/jobs` | JWT | Start analysis pipeline |
| GET | `/api/jobs/:id` | JWT | Poll job status |
| POST | `/api/jobs/:id/annotations` | JWT | Submit field selections, resume pipeline |

## Stack

- **Go 1.23** + Fiber v2 + pgx (API, auth, satellite client)
- **Python 3.12** + FastAPI + LangGraph + OpenAI SDK (AI agents)
- **PostgreSQL 16** (jobs, users)
- **Sentinel Hub** / Copernicus Data Space (satellite imagery, free tier)
- **CROME 2025** via UK gov OGC Features API (field boundaries, free)
- **Mapbox GL JS** (frontend map rendering)

## Team

| Person | Role |
|--------|------|
| Federico | Frontend |
| Fabian | Frontend |
| Keanu | Backend |
| Isaac | Backend |

## Why "YieldMaxxing"

Because "CropGuard" sounded like antivirus software. We're helping farmers max their yield. Simple.

## License

Hackathon project. Do what you want with it.
