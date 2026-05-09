# CropGuard Deep Research Report

## Executive Summary

CropGuard is a precision agriculture platform that combines phone-based crop photography with satellite imagery (Sentinel-2 NDVI) to generate targeted fertiliser recommendations — with supply-chain-aware alternatives when conventional fertilisers are unavailable due to Strait of Hormuz disruption. For a 3-hour hackathon MVP, the winning architecture is: Claude Vision API for phone image analysis + Copernicus Data Space (Sentinel Hub) for NDVI + a rule-based recommendation engine with fertiliser alternatives database + ISOXML export for tractor compatibility.

## 1. Satellite Imagery APIs

### Winner: Copernicus Data Space Ecosystem (Sentinel Hub)

**Why**: Fastest path to working NDVI image. Server-side evalscript computes NDVI, returns rendered PNG/TIFF in one API call. Free account, no approval wait.

| Feature | Detail |
|---------|--------|
| Resolution | 10m (B4 Red, B8 NIR) |
| Revisit | 5 days |
| Cost | Free (Copernicus open data) |
| Auth | OAuth2 client credentials |
| SDK | `pip install sentinelhub` |
| Process API | `https://sh.dataspace.copernicus.eu/process/v1` |
| Token endpoint | `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` |

**Setup steps (15 min)**:
1. Register at dataspace.copernicus.eu
2. Dashboard → User Settings → OAuth clients → Create
3. Save client_id and client_secret

**NDVI Evalscript**:
```javascript
//VERSION=3
function setup() {
  return {
    input: [{bands: ["B04", "B08", "dataMask"]}],
    output: {bands: 1, sampleType: SampleType.FLOAT32}
  }
}
function evaluatePixel(sample) {
  return [(sample.B08 - sample.B04) / (sample.B08 + sample.B04)];
}
```

**Python usage**:
```python
from sentinelhub import SHConfig, SentinelHubRequest, DataCollection, MimeType, BBox, CRS, bbox_to_dimensions

config = SHConfig()
config.sh_client_id = "your_client_id"
config.sh_client_secret = "your_client_secret"
config.sh_token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
config.sh_base_url = "https://sh.dataspace.copernicus.eu"

aoi_bbox = BBox(bbox=[lon_min, lat_min, lon_max, lat_max], crs=CRS.WGS84)
aoi_size = bbox_to_dimensions(aoi_bbox, resolution=10)

request = SentinelHubRequest(
    evalscript=evalscript_ndvi,
    input_data=[SentinelHubRequest.input_data(
        data_collection=DataCollection.SENTINEL2_L2A.define_from(
            name="s2l2a", service_url="https://sh.dataspace.copernicus.eu"
        ),
        time_interval=("2024-06-01", "2024-06-30"),
        other_args={"dataFilter": {"mosaickingOrder": "leastCC"}},
    )],
    responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
    bbox=aoi_bbox, size=aoi_size, config=config,
)
ndvi_data = request.get_data()
```

### Alternatives Considered

| API | Pros | Cons | Verdict |
|-----|------|------|---------|
| Google Earth Engine | Massive catalog, one-liner NDVI | Needs GCP project + EE approval (slow) | Risky for hackathon |
| Planet Labs | 3m daily imagery | No free tier for hackathons | Skip |
| Sentinel-1 SAR | Cloud-penetrating (UK weather!) | Complex interpretation, not NDVI | Future enhancement |

---

## 2. ML Models & Crop Health Detection

### Phone Image Analysis: Claude Vision API (PRIMARY)

No training needed. Handles any crop. Structured prompt:

```python
prompt = """Analyze this crop photo. Assess:
1. Overall health (healthy/moderate stress/severe stress)
2. Nitrogen status: yellowing, especially older leaves
3. Water stress: wilting, leaf curling, dry edges
4. Disease: spots, lesions, mold, unusual coloring
5. Pest damage: holes, chewing marks, webbing
Return JSON with confidence scores for each category."""
```

Cost: ~$0.01-0.05/image. Latency: 2-5s.

### Backup: PlantVillage MobileNet

- Model: `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`
- 2.31M params, runs on CPU, 95.4% accuracy
- 38 disease classes across 14 crops (includes corn, wheat/related)
- Usage: `from transformers import pipeline; pipe = pipeline("image-classification", model="linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification")`

### Satellite Health Analysis: NDVI Thresholds

| NDVI Range | Interpretation (growing season) |
|---|---|
| 0.7 - 0.9 | Healthy, vigorous growth |
| 0.5 - 0.7 | Moderate stress |
| 0.3 - 0.5 | Significant stress |
| < 0.3 | Severe stress or bare soil |

### HuggingFace Models Assessment

| Model | What It Does | Hackathon Usable? |
|---|---|---|
| allenai/satlas-pretrain | Foundation backbone (Swin-v2-B), needs fine-tuning | NO — too complex |
| GFM-Bench/EuroSAT | Land USE classification (not health) | NO — wrong task |
| NASA/IBM Prithvi-100M | Crop TYPE classification, 42% mIoU | NO — needs GPU, complex deps |
| orion-ai-lab/S4A | 281GB dataset for crop type | NO — too large |
| saget-antoine/francecrops | Crop type from time-series | NO — needs training |
| reglab/cal-ff | Animal feeding operations | IRRELEVANT |

**Key finding**: NONE of these do crop HEALTH. They all do crop TYPE classification. For health, use NDVI thresholds + Claude Vision.

---

## 3. Tractor Export: Prescription Map Formats

### ISOXML (ISO 11783-10) — Universal Standard

Works on ALL ISOBUS terminals: John Deere, CLAAS, Fendt, Case IH, Trimble, AgLeader.

**Python library**: `pip install isoxml` (from Josephinum-Research/isoxml-py)
**JS library**: `npm install isoxml` (v1.11.2, has GeoJSON→ISOXML built-in)

**Recommended pipeline**:
```
Analysis → GeoJSON (rate per zone) → ISOXML ZIP (tractor) + Shapefile (legacy)
```

**Minimal ISOXML generation (~30 lines Python)** — generates a ZIP file the farmer puts on USB stick.

### Zone Map Structure
- Grid cells: 10-20m for wheat, 5-10m for corn (match implement working width)
- Typically 3-5 rate zones per field
- Metadata needed: product type, rate (kg/ha), DDI code (6 = mass per area)

### Shapefile (backup format)
- Accepted by John Deere Ops Center, AgLeader, Trimble
- Rate encoded as attribute column (e.g., `RATE_KG_HA`)

---

## 4. UK Field Boundaries

### Best Option: CROME Dataset (Crop Map of England 2024)

- **Source**: data.gov.uk / Defra Data Services Platform
- **Coverage**: ALL agricultural fields in England (~32M hexagonal cells)
- **Data**: Field boundaries + crop type classification (15+ crop types)
- **Format**: GeoPackage (free download)
- **Cost**: FREE, open data
- **URL**: https://environment.data.gov.uk/dataset/0903079b-35a2-47de-b805-77a0cc0c57bf

### Integration Pipeline

```python
# Geocode postcode → spatial query CROME
# 1. postcodes.io (free, no auth)
# 2. GeoPandas spatial query
import geopandas as gpd
from shapely.geometry import Point

crome = gpd.read_file("CROME_2024_ENGLAND.gpkg")
point = Point(lng, lat)
fields = crome[crome.contains(point)]
```

### Alternative: Draw-your-own

Use Leaflet + leaflet-draw plugin. Farmer draws polygon on satellite basemap. Store as GeoJSON. Zero external dependency.

### Hybrid MVP Approach

1. Farmer enters postcode → geocode via postcodes.io
2. Query CROME for nearby field polygons  
3. Show suggested boundaries on Leaflet map
4. Farmer accepts, modifies, or draws fresh

### Other UK Data Sources

| Source | Coverage | Quality | Access |
|---|---|---|---|
| CROME 2024 | England (all fields) | High | Free, data.gov.uk |
| INSPIRE Index Polygons | All registered UK land | Medium (generalised) | Free, Land Registry |
| HM Land Registry | Registered titles | Low (no field-level) | £3/title for plans |
| OpenStreetMap | Patchy | Variable | Free, Overpass API |
| RPA/LPIS | England (subsidy claimants) | Very high | NOT public |

---

## 5. Fertiliser Alternatives (Strait of Hormuz Scenario)

### Supply Chain Risk

~30-35% of global urea exports transit the Strait of Hormuz. Nitrogen is most exposed. Potash least affected (Canada/Russia/Belarus ship via Atlantic/Baltic).

### Nitrogen Alternatives to Urea (46-0-0)

| Product | N% | Rate to replace 100kg urea | Cost/kg N (GBP) | Supply Risk | Source |
|---|---|---|---|---|---|
| CAN 27% | 27 | 170 kg | £1.04-1.19 | LOW | EU |
| AN 34.5% | 34.5 | 133 kg | £0.87-1.01 | LOW | EU |
| UAN-32 | 32 | 144 L | £0.78-0.91 | LOW | EU |
| Blood meal | 12 | 383 kg | £4.17-5.83 | LOW | UK |
| Digestate | 0.5 | 13,143 kg | £0-0.67 | VERY LOW | Local UK |
| Cover crops (legumes) | N/A | N/A (fix 45-224 kg N/ha) | £seed cost | NONE | On-farm |

### Phosphorus Alternatives to DAP (18-46-0)

| Product | P2O5% | Rate to replace 100kg DAP | Notes |
|---|---|---|---|
| SSP | 20 | 230 kg | Widely available |
| TSP | 45 | 102 kg | Nearest DAP equivalent |
| Bone meal | 15 | 307 kg | Slow release, acidic soils |
| Mycorrhizal inoculants | N/A | N/A | Reduce P need 20-50% |
| Struvite | 28 | N/A | Circular economy, growing |

### Potassium: Least Affected

Major sources (Canada, Russia) don't transit Hormuz. UK has Woodsmith Mine polyhalite (14% K2O, targeting 2030 production).

### Decision Logic Structure

```
IF nitrogen_deficiency:
  primary: CAN 27% (EU-sourced, no volatilisation)
  budget: Digestate (near-zero cost, if local AD plant)
  organic: Blood meal or cover crops (6-month lead time)
  
IF phosphorus_deficiency:
  primary: SSP or TSP
  organic: Bone meal (acid soils) or mycorrhizal inoculants
  
IF potassium_deficiency:
  primary: SOP (Germany/Chile sourced)
  organic: Wood ash, seaweed extracts
```

---

## 6. Competitive Analysis

### Direct Competitors

| Platform | Satellite | Phone AI | VRA Export | Fertiliser Alternatives | UK Market | Free Tier |
|---|---|---|---|---|---|---|
| **YaraPlus/Atfarm** | Yes (NDVI) | Yes (photo analysis) | Yes (John Deere) | NO (sells own products) | YES | Yes |
| **OneSoil** | Yes (Sentinel-2) | No | Limited | No | Partial | Yes |
| **Ackerprofi** | Biomass maps | No | Yes (Shapefile) | No | No (Germany) | 30-day trial |
| **Cropio** (Syngenta) | Yes | No | Yes | No | Enterprise only | No |
| **xarvio** (BASF) | Yes | Yes | Yes | No (product-tied) | Yes | Partial |
| **CropGuard** | Yes (NDVI) | Yes (Claude Vision) | Yes (ISOXML) | **YES** (unique!) | YES | Yes |

### CropGuard's Unique Angle

1. **Supply chain disruption intelligence** — No competitor addresses fertiliser alternatives under geopolitical risk. This is completely unique.
2. **Vendor-neutral** — YaraPlus pushes Yara products. xarvio pushes BASF. CropGuard recommends best option regardless of brand.
3. **UK-first** — CROME integration, UK Land Registry, UK-available alternatives (CAN, digestate, polyhalite context).
4. **Atfarm closing 2026** — Users being forced to migrate. Disruption window.

### Ackerprofi Detail

- Digital field record system (Ackerschlagkartei) for German DüV compliance
- Pricing: €99/year (< 20ha) or €149 base + €0.10-1.00/ha
- Features: field import, nutrient balance, regulatory reports, precision farming maps
- Lesson: automate imports (don't make farmers enter data manually)

### YaraPlus Detail (UK)

- Variable rate application maps
- Photo analysis for N-uptake
- Satellite crop monitoring
- N-Tester BT handheld integration
- John Deere Operations Center sync
- Automatic field boundary detection
- FREE — funded by Yara fertiliser sales

---

## 7. Hackathon MVP Architecture (3 Hours)

### Recommended Stack

| Component | Choice | Why |
|---|---|---|
| Frontend | Next.js or React + Vite | Fast setup, good map libs |
| Map | Leaflet + leaflet-draw | Free, lightweight, drawing tools |
| Backend | Python FastAPI | sentinelhub + isoxml libs are Python |
| Image AI | Claude Vision API | No training, any crop, structured output |
| Satellite | Copernicus Data Space (sentinelhub-py) | Free, pre-computed NDVI |
| Recommendation | Claude text API + rules DB | Fast, flexible |
| Export | isoxml (Python) | 30 lines → tractor-ready ZIP |
| Field boundaries | CROME + postcodes.io | Free, comprehensive |

### Simplified MVP Flow

```
1. Farmer uploads photo + enters postcode
2. Backend:
   a. Claude Vision → identifies crop issue (N deficiency, disease, etc.)
   b. postcodes.io → lat/lng → CROME query → field boundary
   c. Sentinel Hub → NDVI for that bbox/date
3. Frontend shows:
   a. Field on map with NDVI overlay (colour-coded health zones)
   b. AI diagnosis from photo
   c. Fertiliser recommendation + alternatives table
   d. "Export to tractor" button → downloads ISOXML ZIP
```

### Time Budget (3 hours)

| Task | Time | Person |
|---|---|---|
| Frontend: upload + map + results display | 90 min | Person 1 |
| Backend: FastAPI + Claude Vision + recommendation engine | 90 min | Person 2 |
| Satellite: Sentinel Hub NDVI integration | 60 min | Person 3 |
| ISOXML export + demo data prep | 60 min | Person 3/4 |
| Integration + testing | 30 min | All |
| Demo prep + presentation | 30 min | All |

### What to Mock/Simplify for Demo

- CROME: pre-download a small area GeoPackage for demo region
- Satellite: if API is slow, pre-cache NDVI tiles for demo coordinates
- Recommendation DB: hardcode 10-15 fertiliser products with costs and risk scores
- Export: generate real ISOXML but from simplified zone data

### What Must Be Real (Impresses Judges)

- Claude Vision actually analyzing uploaded photo (live)
- At least one real Sentinel Hub API call returning NDVI
- Real ISOXML file that could theoretically load in a tractor terminal
- Supply chain alternative logic that responds to "Hormuz blockade" toggle

---

## 8. Key Takeaways

1. **Sentinel Hub via Copernicus Data Space** = fastest satellite API to integrate. Server-side NDVI, one API call, free.
2. **Claude Vision API** = best phone image analyzer for hackathon. No training, handles everything, $0.01/image.
3. **CROME dataset** = free field boundaries for all of England with crop types. Use with postcodes.io for geocoding.
4. **`pip install isoxml`** = generates tractor-ready prescription maps in 30 lines of Python.
5. **CAN (27% N)** = primary fertiliser alternative to urea. EU-sourced, no Hormuz dependency.
6. **No competitor combines phone AI + satellite + fertiliser alternatives under supply disruption** — this is CropGuard's unique angle.
7. **YaraPlus is vendor-locked** (Yara products only) and Atfarm is closing 2026 — market opportunity.

## 9. Sources & Attribution

- [Source: Copernicus Data Space Ecosystem] — Sentinel-2 API, auth, evalscripts
- [Source: data.gov.uk] — CROME 2024 dataset availability
- [Source: Josephinum-Research/isoxml-py on GitHub] — Python ISOXML library
- [Source: HuggingFace model cards] — satlas-pretrain, EuroSAT, S4A, francecrops assessments
- [Source: uk.yaraplus.com] — YaraPlus features and positioning (scraped 2026-05-09)
- [Source: ackerprofi.de] — Ackerprofi features and pricing (scraped 2026-05-09)
- [Source: AHDB RB209] — UK nutrient management guidelines
- [Source: IFA/World Bank] — Global fertiliser trade route data
- [Inference] — Supply chain risk scores and cost projections
- [Inference] — Hackathon time budgets based on typical integration complexity

## 10. Methodology

- 7 parallel research agents covering: satellite APIs, ML models, tractor formats, UK land data, fertiliser alternatives, competitive analysis, MVP architecture
- 2 web scraping agents using WebFetch for HuggingFace + competitor pages
- Firecrawl CLI for direct URL scraping (Ackerprofi, YaraPlus, Atfarm)
- Firecrawl search for ISOXML libraries and CROME data
- Cross-referenced findings across agents for consistency
- Gaps: Planet Labs pricing not fully verified; Woodsmith Mine production timeline approximate; real-time fertiliser prices not available (estimates used)
