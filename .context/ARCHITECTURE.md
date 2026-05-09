# CropGuard MVP Architecture — 3-Hour Hackathon Build

## Executive Summary

Build a monorepo with a React+Vite frontend (Leaflet map + image upload) and a Python FastAPI backend that orchestrates Claude Vision analysis and Copernicus Sentinel Hub NDVI fetching. The "worker chain" is a sequential FastAPI pipeline — no message queues needed for the demo.

---

## 1. Recommended Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | React + Vite + TypeScript | Fastest DX, hot reload, no SSR complexity. Vite scaffolds in 30s. |
| **Map** | Leaflet + react-leaflet + leaflet-draw | Free, no API key needed for base tiles, polygon drawing built-in. |
| **Backend** | Python FastAPI | Async, single file can hold entire API. Native httpx for satellite calls. |
| **AI Analysis** | Claude Vision API (claude-sonnet-4-20250514) | Best multimodal reasoning, structured output, fast. Haiku as fallback. |
| **Satellite** | Copernicus Data Space Sentinel Hub Process API | **FREE** — 10,000 requests/month, 10,000 PU/month. No credit card. |
| **Export** | GeoJSON (native) + jsPDF for simple report | Zero-dependency export. |

### Why NOT these alternatives:
- **Next.js** — SSR adds complexity with no hackathon benefit. API routes are slow to iterate vs FastAPI.
- **Mapbox GL JS** — requires API key signup, token management. Leaflet just works.
- **Google Maps** — billing setup, overkill for this use case.
- **GPT-4V** — Claude's structured output is better for extracting typed recommendations.
- **Serverless functions** — cold starts kill demo flow. FastAPI runs hot locally.

---

## 2. Simplified MVP Flow (Actually Buildable in 3 Hours)

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Upload photo ──► 2. AI identifies ──► 3. Enter location      │
│     + crop type        crop issue           (postcode/click)      │
│                                                                   │
│  4. See NDVI    ──► 5. Draw field    ──► 6. Get fertiliser       │
│     overlay           boundary              recommendation        │
│                                                                   │
│  7. Export GeoJSON + PDF summary                                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Detailed Step Breakdown:

**Step 1: Image Upload + Crop Info**
- Drag-and-drop or camera capture (mobile-friendly)
- Dropdown: crop type (wheat, maize, barley, potato, etc.)
- Optional: growth stage selector

**Step 2: Claude Vision Analysis (Worker 1)**
- Send image as base64 to Claude API
- Prompt: "Identify the crop disease/deficiency in this image. Return JSON with: disease_name, confidence, affected_nutrient, severity (1-5), description"
- Display results while user inputs location

**Step 3: Location Input**
- Text input for UK postcode or lat/lng
- OR: click on Leaflet map to set centre point
- Geocode postcode to coordinates (use postcodes.io — free, no key)

**Step 4: NDVI Satellite Overlay (Worker 2)**
- Hit Copernicus Sentinel Hub Process API with bbox around location
- Fetch last-30-days NDVI as PNG overlay
- Display as Leaflet image overlay on the map

**Step 5: User Draws Field Boundary**
- leaflet-draw polygon tool activated
- User draws bounding polygon on their field
- Extract GeoJSON geometry from drawn shape

**Step 6: Final Recommendation (Worker 3)**
- Send to Claude: disease info + NDVI zone stats + field boundary + crop type
- Prompt: "Given this crop issue and NDVI data, recommend fertiliser application. Return JSON with: primary_recommendation, application_rate_kg_ha, timing, alternatives[], zone_priorities[]"
- Display recommendation card

**Step 7: Export**
- Download GeoJSON (field boundary + zone data + recommendations as properties)
- Simple PDF with jsPDF (summary + recommendation + map screenshot)

---

## 3. API Integration Details

### 3.1 Copernicus Data Space (Sentinel Hub) — FREE TIER

**Registration**: https://dataspace.copernicus.eu (register, create OAuth client in dashboard)

**Limits**: 10,000 requests/month, 10,000 Processing Units/month (more than enough)

**Auth — get bearer token:**
```bash
curl -X POST https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET'
```

**NDVI Request — returns PNG directly:**
```python
import httpx

evalscript = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  if (sample.dataMask == 0) return [0, 0, 0, 0];
  if (ndvi < -0.5) return [0.05, 0.05, 0.05, 1];
  else if (ndvi < 0) return [0.75, 0.75, 0.75, 1];
  else if (ndvi < 0.1) return [0.86, 0.86, 0.86, 1];
  else if (ndvi < 0.2) return [0.92, 0.96, 0.57, 1];
  else if (ndvi < 0.4) return [0.57, 0.75, 0.32, 1];
  else if (ndvi < 0.6) return [0.31, 0.54, 0.18, 1];
  else return [0.0, 0.27, 0.0, 1];
}
"""

request_body = {
    "input": {
        "bounds": {
            "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            "bbox": [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01]
        },
        "data": [{
            "type": "sentinel-2-l2a",
            "dataFilter": {
                "timeRange": {
                    "from": "2026-04-01T00:00:00Z",
                    "to": "2026-05-09T00:00:00Z"
                },
                "maxCloudCoverage": 30
            },
            "processing": {"upsampling": "BILINEAR"}
        }]
    },
    "output": {
        "width": 512,
        "height": 512,
        "responses": [{"identifier": "default", "format": {"type": "image/png"}}]
    },
    "evalscript": evalscript
}

response = httpx.post(
    "https://sh.dataspace.copernicus.eu/api/v1/process",
    json=request_body,
    headers={"Authorization": f"Bearer {token}"}
)
# response.content is a PNG image
```

### 3.2 Claude Vision API

**Image analysis request:**
```python
import anthropic
import base64

client = anthropic.Anthropic()

with open("crop_photo.jpg", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": image_data,
                },
            },
            {
                "type": "text",
                "text": """Analyze this crop photo. The farmer reports this is {crop_type}.
                
Identify any disease, pest damage, or nutrient deficiency visible.

Return ONLY valid JSON:
{
  "disease_name": "string",
  "confidence": 0.0-1.0,
  "affected_nutrients": ["N", "P", "K", "Fe", etc],
  "severity": 1-5,
  "description": "brief description",
  "visual_symptoms": ["symptom1", "symptom2"]
}"""
            }
        ],
    }],
)
```

### 3.3 Postcodes.io (UK Location) — FREE, No Key

```python
# Postcode to coordinates
resp = httpx.get(f"https://api.postcodes.io/postcodes/{postcode}")
data = resp.json()["result"]
lat, lng = data["latitude"], data["longitude"]
```

### 3.4 Alternative: OpenCage Geocoder (International)
Free tier: 2,500 requests/day — sign up at opencagedata.com

---

## 4. What to Fake/Mock for Demo

| Component | Real Implementation | Demo Shortcut |
|-----------|-------------------|---------------|
| ML Pipeline | Complex multi-model ensemble | Single Claude Vision API call |
| Real-time satellite | Live fetch per request | Pre-cache 3-4 UK farm locations as fallback PNGs |
| Historical analysis | Time-series NDVI comparison | Single most-recent image |
| Tractor file export | ISO-XML / ISOBUS format | GeoJSON with zone data (any GIS opens it) |
| User accounts | Full auth system | None — stateless demo |
| Field history | Database of past analyses | In-memory, session only |
| Soil data | Integration with soil maps | Hardcoded typical values for region |

### Pre-cached Demo Locations (UK farming areas):
1. **Lincolnshire** (arable): 53.0, -0.25 — flat wheat/barley fields
2. **East Anglia** (crops): 52.4, 0.75 — sugar beet, potatoes
3. **Yorkshire** (mixed): 53.9, -1.2 — varied farming
4. **Somerset** (dairy/pasture): 51.1, -2.9 — grassland

---

## 5. Architecture That Impresses Judges

### 5.1 Worker Chain Pattern (Visible in UI)

Show a pipeline progress indicator:
```
[1. Crop Analysis ✓] → [2. Satellite Fetch ✓] → [3. NDVI Processing...] → [4. Recommendation]
```

Each "worker" is a FastAPI endpoint that chains:
```python
@app.post("/api/analyze")
async def full_pipeline(request: AnalysisRequest):
    # Worker 1: Vision Analysis
    crop_analysis = await analyze_crop_image(request.image_b64, request.crop_type)
    
    # Worker 2: Location + Satellite
    coords = await geocode_location(request.postcode)
    ndvi_image = await fetch_ndvi_tile(coords.lat, coords.lng)
    
    # Return intermediate results — user draws boundary
    return {
        "crop_analysis": crop_analysis,
        "ndvi_image_b64": base64.b64encode(ndvi_image).decode(),
        "coordinates": coords,
        "status": "awaiting_boundary"
    }

@app.post("/api/recommend")
async def generate_recommendation(request: RecommendationRequest):
    # Worker 3: Final recommendation with field boundary
    recommendation = await get_fertiliser_recommendation(
        crop_analysis=request.crop_analysis,
        field_boundary=request.boundary_geojson,
        ndvi_stats=request.ndvi_stats,
        crop_type=request.crop_type
    )
    return recommendation
```

### 5.2 Real Satellite Data (One API Call Does It)

The Sentinel Hub Process API returns a rendered NDVI PNG in a single POST. No band math, no TIFF processing, no GeoTIFF libraries. The evalscript runs server-side on Copernicus infrastructure. This is the key shortcut.

### 5.3 Actual AI Analysis (Not Hardcoded)

Claude Vision genuinely identifies crop diseases from photos. Use structured JSON output for clean integration. Consider having a "confidence" display and "alternative diagnoses" to show the AI is real.

### 5.4 Export Capability

```javascript
// GeoJSON export with recommendation data
const exportData = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    geometry: drawnPolygon.toGeoJSON().geometry,
    properties: {
      crop_type: "wheat",
      disease: "nitrogen_deficiency",
      recommendation: "Apply 40kg/ha urea",
      ndvi_mean: 0.45,
      analysis_date: "2026-05-09",
      zones: [
        { priority: "high", area_ha: 2.3, ndvi: 0.25 },
        { priority: "medium", area_ha: 5.1, ndvi: 0.45 }
      ]
    }
  }]
};

// Download as file
const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
// trigger download...
```

---

## 6. Team Split (3-4 People, 3 Hours)

### Person 1: Frontend + Map (Full 3 hours)
**Hour 1:**
- `npm create vite@latest cropguard-frontend -- --template react-ts`
- Install: `react-leaflet leaflet leaflet-draw @types/leaflet`
- Build layout: upload panel (left), map (right), results (bottom)
- Image upload component with drag-and-drop + preview

**Hour 2:**
- Leaflet map with OpenStreetMap tiles
- leaflet-draw integration for polygon drawing
- NDVI overlay display (ImageOverlay from base64 PNG)
- Location search (postcode input → map centre)

**Hour 3:**
- Results display card (disease info, recommendation)
- Pipeline progress indicator (step 1/2/3/4)
- Export buttons (GeoJSON download, simple PDF)
- Mobile responsiveness, polish

### Person 2: Backend API + AI Integration (Full 3 hours)
**Hour 1:**
- FastAPI scaffold with CORS, file upload endpoint
- Claude Vision integration (image → crop analysis JSON)
- Postcode geocoding endpoint (postcodes.io proxy)

**Hour 2:**
- Sentinel Hub auth token management (cache token for 10min lifetime)
- NDVI tile fetching endpoint (coords → PNG)
- Connect Worker 1 → Worker 2 pipeline

**Hour 3:**
- Final recommendation endpoint (Claude with full context)
- Error handling, fallback to cached tiles if satellite fails
- GeoJSON assembly endpoint
- API documentation (FastAPI auto-generates Swagger)

### Person 3: Satellite Data + Demo Content (Full 3 hours)
**Hour 1:**
- Register on Copernicus Data Space, create OAuth client
- Test NDVI requests manually (curl/Postman)
- Tune evalscript colour ramp for visual impact
- Test different time ranges for cloud-free imagery

**Hour 2:**
- Pre-cache NDVI tiles for 4 demo locations (fallback)
- Build "NDVI stats" extractor (mean NDVI from image pixels — can use canvas in browser)
- Create zone classification logic (high/medium/low vegetation health)

**Hour 3:**
- Integration testing with backend
- Prepare demo dataset (sample crop photos with known diseases)
- Create "wow" demo script (specific locations that show clear NDVI variation)
- Help with edge cases and error states

### Person 4: Demo Prep + Presentation (Hours 2-3, helps with code Hour 1)
**Hour 1:**
- Help Person 1 or 2 with boilerplate
- Write demo script and talking points
- Source 5-10 crop disease photos from public datasets

**Hour 2:**
- Build PDF export (jsPDF or html2canvas → PDF)
- Create compelling demo flow (start-to-finish in 90 seconds)
- Record backup video in case live demo fails

**Hour 3:**
- Presentation slides (problem → solution → demo → future)
- Practice demo 3 times
- Ensure fallback mode works (cached data if APIs down)

---

## 7. Project Structure

```
cropguard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── MapView.tsx
│   │   │   ├── FieldDrawer.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   ├── PipelineProgress.tsx
│   │   │   └── ExportButtons.tsx
│   │   ├── hooks/
│   │   │   ├── useAnalysis.ts
│   │   │   └── useSatellite.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── main.py              # FastAPI app + all endpoints
│   ├── workers/
│   │   ├── crop_analyzer.py # Claude Vision integration
│   │   ├── satellite.py     # Sentinel Hub integration
│   │   └── recommender.py   # Final recommendation logic
│   ├── models.py            # Pydantic models
│   ├── config.py            # Environment variables
│   └── requirements.txt
├── demo/
│   ├── sample_images/       # Pre-sourced crop disease photos
│   ├── cached_ndvi/         # Fallback NDVI tiles
│   └── demo_script.md
├── .env.example
└── README.md
```

---

## 8. Key Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-leaflet": "^5.0.0",
    "leaflet": "^1.9.4",
    "leaflet-draw": "^1.0.4",
    "jspdf": "^2.5.1"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.8",
    "@types/leaflet-draw": "^1.0.11",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

### Backend (requirements.txt)
```
fastapi==0.115.0
uvicorn==0.32.0
anthropic==0.40.0
httpx==0.28.0
python-multipart==0.0.12
pydantic==2.10.0
python-dotenv==1.0.1
Pillow==11.0.0
```

---

## 9. Environment Variables (.env)

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Copernicus Data Space (Sentinel Hub)
CDSE_CLIENT_ID=your-client-id
CDSE_CLIENT_SECRET=your-client-secret

# Optional: OpenCage for international geocoding
OPENCAGE_API_KEY=your-key
```

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Sentinel Hub API down | Pre-cached NDVI PNGs for demo locations |
| Claude API slow/down | Cache one successful response, show as "example analysis" |
| Cloud cover hides NDVI | Use 30-day time range; most of UK has clear pass within that window |
| Postcode API fails | Allow manual lat/lng input as fallback |
| Image too large | Resize to 1024px max dimension before sending to Claude |
| Demo wifi fails | Run everything locally, pre-fetch all satellite tiles |

---

## 11. Hackathon Precedents (What Others Built)

From research, successful satellite+AI hackathon projects share these traits:
- **Single real satellite API call** visible in the demo (judges love real data)
- **LLM as the "ML pipeline"** — nobody builds a CNN in 3 hours anymore
- **Visual output** — coloured maps and overlays beat text-only results
- **Export/actionable output** — shows you thought about the user's next step
- **Mobile-friendly** — if judges can test on their phones, you win points

Notable repos found:
- `sentinel-hub/sentinelhub-js` (57 stars) — official JS library, but overkill for hackathon. Raw fetch to Process API is simpler.
- `zcernigoj/SH_APIs_LeafletExample` — **Perfect reference**: 6 files, shows auth + Leaflet + Process API integration without any library wrapper.
- `HorizonAuto/plug_and_play` — Recent hackathon winner using FastAPI + Claude Vision. Same architecture pattern we're proposing.
- `FallenStark/bioskins` — Next.js + FastAPI + Claude Vision + analysis pipeline. Proves the pattern works for hackathons.

---

## 12. 30-Minute Checkpoint Plan

| Time | Checkpoint | Must Have |
|------|-----------|-----------|
| 0:30 | Scaffold done | Both apps running, CORS working, one endpoint connected |
| 1:00 | Core loop works | Photo upload → Claude response displayed |
| 1:30 | Map working | Leaflet renders, location input works, NDVI overlay shows |
| 2:00 | Full pipeline | Draw boundary → get recommendation |
| 2:30 | Polish | Error states, loading indicators, export works |
| 3:00 | Demo ready | Practised 2x, fallback data confirmed, slides done |

---

## 13. One-Line Summary for Judges

> "CropGuard uses Claude Vision to diagnose crop diseases from phone photos, overlays real Sentinel-2 NDVI satellite data on a map where farmers draw their field boundaries, then generates precision fertiliser recommendations with exportable zone maps."
