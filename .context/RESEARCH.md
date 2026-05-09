# Research

> Single source of truth for research and analysis. Combines the technical implementation research (Keanu, original `RESEARCH.md`) with the broader product context (long-term EU corn macro thesis) and consolidated open questions.

---

## Executive summary

CropGuard / YieldMaxxing is a precision-agriculture platform that combines phone-based crop photography (Claude Vision) with satellite imagery (Sentinel-2 NDVI) to generate targeted fertiliser recommendations. The hackathon MVP is corn-only, with bounding-box annotations on the RGB satellite image. The pitched product layers on supply-chain-aware fertiliser alternatives (Strait of Hormuz scenarios), UK CROME field boundaries, ISOXML export for tractor terminals, and multi-crop support — these are the v2 differentiators, not in code yet.

**Winning architecture for the 3-hour MVP** (and what got built): Anthropic Claude Vision for phone image analysis + Copernicus Sentinel Hub for NDVI + a corn agronomic knowledge base + LangGraph state machine for the agent pipeline + Go API as the public gateway. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the implementation detail.

---

## Macro context: the long-term EU corn thesis

Why this product matters at scale, beyond the hackathon demo. (This is the broader pitch the MVP is a wedge into.)

### Fertilizer is breaking the economics of EU corn

Corn is the most fertilizer-intensive grain crop in Europe:
- ~150–200 kg N/ha (mostly CAN, urea, or UAN)
- ~50–100 kg P₂O₅/ha (mostly DAP or MAP)
- ~50–100 kg K₂O/ha (mostly MOP)

Total fertilizer spend: ~€286/ha (Farmdesk NL benchmark). 13–14% of a French grain farmer's per-hectare budget (Argus). Prices are accelerating:
- Urea retail +27% in a single month (DTN, April 2026)
- World Bank projects urea +60% in 2026
- EU fertilizer prices 10–15% above 2025
- Prices rose 18% in 2025 before the 2026 shock

Result: EU growers are quitting corn. Argus and Expana now expect EU grain maize area to fall **below 8 million hectares in 2026** — first time this century. France alone projected to lose **10–15% of corn area (~200,000 ha)** in a single season (AGPM).

### Most of that fertilizer is wasted

A European corn field is heterogeneous. Within-field response to N can swing from near-zero to double-digit yield gains across the same plot. Uniform 180 kg N/ha over-applies on responsive zones and wastes the rest on non-responsive zones.

The waste is bigger than rate. Different zones need different *fertilizers*:
- High-pH calcareous patch → MAP, not DAP
- Waterlogged corner → CAN, not urea (volatilization)
- Potassium-deficient sandy zone with chloride-sensitive end-use → SOP, not MOP
- Cool clay zone in spring → ammonium-based forms

Today every farmer picks one bag and spreads it everywhere.

### Outcome opportunity

For a representative 50-ha EU corn farm:
- **20–30% reduction in N applied** (validated in EU and US VRA-N trials)
- **5–15% yield uplift** on responsive zones (peer-reviewed precision-ag meta-analyses)
- **€60–€90/ha fertilizer cost savings** at current prices
- **Total: €3,000–€4,500/year saved on a 50-ha farm**, before yield uplift

EU-wide across ~8M corn hectares: **€480M–€720M/year of preventable fertilizer waste recoverable**, with parallel reductions in nitrate runoff and N₂O emissions aligned with EU Green Deal and CAP eco-scheme targets.

### Phase 1 geography

Top 6 EU corn producers cover ~80% of EU production: France (~12M tons/year), Romania, Poland, Hungary, Germany, Italy.

---

## 1. Satellite imagery APIs

### Winner: Copernicus Data Space Ecosystem (Sentinel Hub)

Fastest path to a working NDVI image. Server-side evalscript computes NDVI, returns rendered PNG/TIFF in one API call. Free account, no approval wait.

| Feature | Detail |
|---------|--------|
| Resolution | 10m (B4 Red, B8 NIR) |
| Revisit | 5 days |
| Cost | Free (Copernicus open data) |
| Auth | OAuth2 client credentials |
| SDK | `pip install sentinelhub` |
| Process API | `https://sh.dataspace.copernicus.eu/process/v1` (free tier) |
| Token endpoint | `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` |

> ⚠️ The current scaffold (`python-agents/nodes/satellite.py`) points at `https://services.sentinel-hub.com` (commercial Sentinel Hub), not the free Copernicus Data Space tier above. Reconcile — see open questions.

**Setup steps (~15 min):**
1. Register at dataspace.copernicus.eu
2. Dashboard → User Settings → OAuth clients → Create
3. Save `client_id` and `client_secret`

**NDVI evalscript:**
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

**Python usage** (already implemented in `nodes/satellite.py`):
```python
from sentinelhub import SHConfig, SentinelHubRequest, DataCollection, MimeType, BBox, CRS, bbox_to_dimensions

config = SHConfig()
config.sh_client_id = os.environ["SH_CLIENT_ID"]
config.sh_client_secret = os.environ["SH_CLIENT_SECRET"]
# For free tier:
config.sh_token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
config.sh_base_url = "https://sh.dataspace.copernicus.eu"

aoi_bbox = BBox(bbox=[lon_min, lat_min, lon_max, lat_max], crs=CRS.WGS84)
aoi_size = bbox_to_dimensions(aoi_bbox, resolution=10)

request = SentinelHubRequest(
    evalscript=evalscript_ndvi,
    input_data=[SentinelHubRequest.input_data(
        data_collection=DataCollection.SENTINEL2_L2A,
        time_interval=("2026-04-01", "2026-04-30"),
        mosaicking_order="leastCC",
    )],
    responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
    bbox=aoi_bbox, size=aoi_size, config=config,
)
ndvi_data = request.get_data()
```

### Alternatives considered

| API | Pros | Cons | Verdict |
|-----|------|------|---------|
| Google Earth Engine | Massive catalog, one-liner NDVI | GCP project + EE approval (slow) | Risky for hackathon |
| Planet Labs | 3m daily imagery | No free tier for hackathons | Skip |
| Sentinel-1 SAR | Cloud-penetrating (UK weather!) | Complex interpretation, not NDVI | Future enhancement |

---

## 2. ML models & crop health detection

### Phone image analysis: Claude Vision API (primary, in code)

No training needed. Handles any crop. Structured prompt. Cost ~$0.01–0.05/image, latency 2–5s. Already wired in `python-agents/nodes/analyzer.py` (Claude Opus 4.7) and `optimizer.py` (Claude Sonnet 4.6) with a corn knowledge base in the system prompt.

```python
# Prompt skeleton (see analyzer.py for full version)
prompt = """Analyze this corn crop photo. Assess:
1. Overall health (healthy/moderate stress/severe stress)
2. Nitrogen status: yellowing, especially older leaves
3. Water stress: wilting, leaf curling, dry edges
4. Disease: spots, lesions, mold, unusual coloring
5. Pest damage: holes, chewing marks, webbing
Return JSON with confidence scores for each category."""
```

### Backup: PlantVillage MobileNet (not in code)

- Model: `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`
- 2.31M params, runs on CPU, 95.4% accuracy
- 38 disease classes across 14 crops (includes corn, wheat/related)

### Satellite health analysis: NDVI thresholds (in `corn.json`)

| NDVI Range | Interpretation (growing season) |
|---|---|
| 0.7 – 0.9 | Healthy, vigorous growth |
| 0.5 – 0.7 | Moderate stress |
| 0.3 – 0.5 | Significant stress |
| < 0.3 | Severe stress or bare soil |

The full `field_health_benchmarks` schema in `python-agents/knowledge/corn.json` has five tiers: `excellent / good / fair / poor / critical`.

### HuggingFace models assessed (none usable)

| Model | What it does | Hackathon usable? |
|---|---|---|
| allenai/satlas-pretrain | Foundation backbone (Swin-v2-B), needs fine-tuning | NO |
| GFM-Bench/EuroSAT | Land USE classification | NO — wrong task |
| NASA/IBM Prithvi-100M | Crop TYPE classification, 42% mIoU | NO — needs GPU |
| orion-ai-lab/S4A | 281GB dataset for crop type | NO |
| saget-antoine/francecrops | Crop type from time-series | NO — needs training |

**Key finding:** none of these do crop *health*. They all do crop *type*. For health, NDVI thresholds + Claude Vision (the current approach) is the right call.

---

## 3. Tractor export: prescription map formats

### ISOXML (ISO 11783-10) — universal standard

Works on ALL ISOBUS terminals: John Deere, CLAAS, Fendt, Case IH, Trimble, AgLeader.

- **Python library:** `pip install isoxml` (Josephinum-Research/isoxml-py)
- **JS library:** `npm install isoxml` (v1.11.2, has GeoJSON → ISOXML built-in)

**Recommended pipeline:**
```
Analysis → GeoJSON (rate per zone) → ISOXML ZIP (tractor) + Shapefile (legacy)
```

Generates a ZIP file the farmer puts on a USB stick. ~30 lines of Python.

### Zone map structure
- Grid cells: 10–20m for wheat, 5–10m for corn (match implement working width)
- Typically 3–5 rate zones per field
- Metadata: product type, rate (kg/ha), DDI code (`6` = mass per area)

### Shapefile (backup)
Accepted by John Deere Ops Center, AgLeader, Trimble. Rate encoded as attribute column (e.g. `RATE_KG_HA`).

> Status: aspirational. Not yet wired into the optimizer or any export endpoint.

---

## 4. UK field boundaries

### Best option: CROME 2024 (Crop Map of England)

- **Source:** data.gov.uk / Defra Data Services Platform
- **Coverage:** ALL agricultural fields in England (~32M hexagonal cells)
- **Data:** Field boundaries + crop type classification (15+ crop types)
- **Format:** GeoPackage (free download)
- **Cost:** FREE, open data
- **URL:** https://environment.data.gov.uk/dataset/0903079b-35a2-47de-b805-77a0cc0c57bf

### Integration pipeline

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

### Hybrid approach

1. Farmer enters postcode → geocode via postcodes.io
2. Query CROME for nearby field polygons
3. Show suggested boundaries on Leaflet map
4. Farmer accepts, modifies, or draws fresh

### Other UK data sources

| Source | Coverage | Quality | Access |
|---|---|---|---|
| CROME 2024 | England (all fields) | High | Free, data.gov.uk |
| INSPIRE Index Polygons | All registered UK land | Medium (generalised) | Free, Land Registry |
| HM Land Registry | Registered titles | Low (no field-level) | £3/title for plans |
| OpenStreetMap | Patchy | Variable | Free, Overpass API |
| RPA/LPIS | England (subsidy claimants) | Very high | NOT public |

> Status: aspirational. Current scaffold uses raw lat/lon + a hardcoded ~5km bbox in `nodes/satellite.py`.

---

## 5. Fertiliser alternatives (Strait of Hormuz scenario)

### Supply-chain risk

~30–35% of global urea exports transit the Strait of Hormuz. Nitrogen is most exposed. Potash least affected (Canada/Russia/Belarus ship via Atlantic/Baltic).

### Nitrogen alternatives to urea (46-0-0)

| Product | N% | Rate to replace 100kg urea | Cost/kg N (GBP) | Supply risk | Source |
|---|---|---|---|---|---|
| CAN 27% | 27 | 170 kg | £1.04–1.19 | LOW | EU |
| AN 34.5% | 34.5 | 133 kg | £0.87–1.01 | LOW | EU |
| UAN-32 | 32 | 144 L | £0.78–0.91 | LOW | EU |
| Blood meal | 12 | 383 kg | £4.17–5.83 | LOW | UK |
| Digestate | 0.5 | 13,143 kg | £0–0.67 | VERY LOW | Local UK |
| Cover crops (legumes) | N/A | N/A (fix 45–224 kg N/ha) | seed cost only | NONE | On-farm |

### Phosphorus alternatives to DAP (18-46-0)

| Product | P₂O₅% | Rate to replace 100kg DAP | Notes |
|---|---|---|---|
| SSP | 20 | 230 kg | Widely available |
| TSP | 45 | 102 kg | Nearest DAP equivalent |
| Bone meal | 15 | 307 kg | Slow release, acidic soils |
| Mycorrhizal inoculants | N/A | N/A | Reduce P need 20–50% |
| Struvite | 28 | N/A | Circular economy, growing |

### Potassium: least affected

Major sources (Canada, Russia) don't transit Hormuz. UK has Woodsmith Mine polyhalite (14% K₂O, targeting 2030 production).

### Decision logic structure

```
IF nitrogen_deficiency:
  primary: CAN 27% (EU-sourced, no volatilisation)
  budget:  Digestate (near-zero cost, if local AD plant)
  organic: Blood meal or cover crops (6-month lead time)

IF phosphorus_deficiency:
  primary: SSP or TSP
  organic: Bone meal (acid soils) or mycorrhizal inoculants

IF potassium_deficiency:
  primary: SOP (Germany/Chile sourced)
  organic: Wood ash, seaweed extracts
```

> Status: aspirational. The pitch differentiator. Not in code.

---

## 6. Competitive landscape (summary)

Full teardown in [`competitive-analysis.md`](competitive-analysis.md). Highlights:

| Platform | Satellite | Phone AI | VRA Export | Fertiliser Alternatives | UK Market | Free Tier |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| YaraPlus / Atfarm | Yes (NDVI, N only) | Yes | Yes (John Deere) | NO (sells own) | YES | Yes |
| OneSoil | Yes (Sentinel-2) | No | Limited | No | Partial | Yes |
| Ackerprofi | No | No | Yes (Shapefile) | No | No (DE) | 30-day trial |
| Cropwise (Syngenta) | Yes | No | Yes | No | Enterprise | No |
| xarvio (BASF) | Yes | Yes | Yes | No (product-tied) | Yes | Partial |
| Climate FieldView (Bayer) | Yes (paid) | No | Yes | No | No (US-first) | Basic free |
| Plantix | No | Yes | No | No | No | Yes |
| **CropGuard** | **Yes** | **Yes** | **(planned)** | **Yes (planned, unique)** | **Yes (planned)** | **Yes** |

### CropGuard's unique angles

1. **Phone camera + satellite fusion** — Plantix does camera only, OneSoil/xarvio do satellite only. Nobody combines both for a unified crop-health + recommendation engine.
2. **Supply-chain disruption intelligence** — fertiliser alternatives engine for Hormuz / sanctions / shock scenarios. Zero competitors do this.
3. **Vendor-neutral** — YaraPlus pushes Yara, xarvio pushes BASF. CropGuard recommends best option regardless of brand.
4. **UK-first** (planned) — CROME integration, postcodes.io, AHDB RB209 reference rates, UK-available alternatives.
5. **Atfarm sunset window** — Atfarm appears to be transitioning out; users being forced to migrate.

### Pitch positioning

> "While xarvio optimises when to spray and OneSoil shows where crops are struggling, CropGuard is the only platform that tells UK farmers what to do when their usual fertiliser supply is cut off — combining phone-based crop assessment with satellite monitoring to recommend accessible alternatives."

---

## 7. Hackathon precedents

Successful satellite + AI hackathon projects share these traits:
- **Single real satellite API call** visible in the demo (judges love real data)
- **LLM as the "ML pipeline"** — nobody builds a CNN in 3 hours
- **Visual output** — coloured maps and overlays beat text-only results
- **Export / actionable output** — shows you thought about the user's next step
- **Mobile-friendly** — judges testing on phones win extra points

Notable repos:
- `sentinel-hub/sentinelhub-js` (57 stars) — official JS library, overkill for a hackathon. Raw fetch to Process API is simpler.
- `zcernigoj/SH_APIs_LeafletExample` — perfect reference: 6 files, shows auth + Leaflet + Process API integration without library wrappers.
- `HorizonAuto/plug_and_play` — recent hackathon winner using FastAPI + Claude Vision. Same architecture pattern.
- `FallenStark/bioskins` — Next.js + FastAPI + Claude Vision + analysis pipeline. Proves the pattern.

---

## 8. Open questions

Consolidated. Each needs an owner and (where time permits) a target resolution.

### Architectural divergence (raised by the actual scaffold vs the pitch docs)

- **Project name.** YieldMaxxing (repo) vs CropGuard (product) vs FarmWise (code). Pick one.
- **Annotation UX.** Bounding boxes on the RGB image (current code) vs polygon draw on a Leaflet map (pitch). Picking polygons means refactoring `BoundingBox` → polygon GeoJSON, plus changes to `optimizer_node`.
- **Single FastAPI vs Go+Python split.** Pitch said one service; code is two. Keep the split (it works).
- **Sentinel Hub endpoint.** Code uses commercial endpoint; pitch + this doc reference the free Copernicus Data Space tier. Switch to free tier if hackathon credits are tight.
- **Fabian's frontend orphan branch.** Merge / rebase / rebuild. Decide with Fabian.

### Calibration

How do we ground-truth zone-level recommendations without years of farm-specific yield maps?

Likely answer: regional agronomic priors derived from LUCAS + published trials, used as a baseline; continuously improve as users upload yield data, lab tests, and (optionally) drone or N-sensor data. Open: how do we communicate confidence to the farmer when the baseline is the only signal?

### Fertilizer-type recommendation engine

What's the decision tree that picks CAN vs urea vs UAN vs ammonium sulfate, DAP vs MAP, MOP vs SOP?

Inputs: soil pH, drainage class, application timing, weather forecast, current price ratios. Authoring this credibly will require an agronomic advisory board (university extensions, neutral co-ops). Open: who's on it, how is it versioned, how is reasoning surfaced to the farmer?

### Distribution & business model

The product is free to the farmer. Who pays?

- Co-ops paying for fleet-wide deployment
- Government / CAP eco-schemes funding rollout against environmental targets
- Insurance partners underwriting yield/quality outcomes
- Carbon programs paying for measured N₂O reductions

Each pulls the product in a different direction (carbon needs measurement rigor; co-ops need multi-farm dashboards).

### Trust

Why would a farmer trust a free tool over Yara? Endorsements from neutral bodies (universities, ag extensions, farmer co-ops) matter more than any feature. Open: which 2–3 endorsement partners do we approach in Phase 1, and what evidence package do they need?

### Hackathon-specific

- **UK-vs-EU geographic wedge.** UK farm economics (avg ~87 ha) and the Atfarm sunset argue for staying UK; corn intensity and the €480M–€720M EU waste opportunity argue EU. Pick one for v1 launch.
- **Supply-chain alternatives data freshness.** Real-time fertiliser prices weren't available during research — estimates used. Production version needs a price feed (Argus? IFA? scraped retailer data?).
- **ISOXML compatibility QA.** Library is universal in theory; which 2–3 spreader brands do we actually QA on hardware before claiming compatibility?
- **Claude Vision accuracy on UK varieties.** No fine-tuning — Claude Vision is the entire ML pipeline. Open: how often is it wrong, and what's the failure mode the farmer sees (silent miscall vs low-confidence flag)?
- **`analyzing` job status not emitted.** Defined in `models/job.go` but never set in the Go handlers. Wire it up for tighter pipeline-progress UX, or remove.

---

## Sources & attribution

- Copernicus Data Space Ecosystem — Sentinel-2 API, auth, evalscripts
- data.gov.uk — CROME 2024 dataset
- Josephinum-Research/isoxml-py on GitHub — Python ISOXML library
- HuggingFace model cards — satlas-pretrain, EuroSAT, S4A, francecrops assessments
- uk.yaraplus.com — YaraPlus features (scraped 2026-05-09)
- ackerprofi.de — Ackerprofi features and pricing (scraped 2026-05-09)
- AHDB RB209 — UK nutrient management guidelines
- AHDB Maize Crop Nutrition guidance — reference rates
- IFA / World Bank — global fertiliser trade route data
- Argus Media — "Shake-up in EU fertilizer pricing to hit farmer costs" (Jan 2026); EU grain maize area projections (Apr 2026)
- AGPM — French maize area forecast 2026
- Verdant Robotics — "Why Fertilizer Prices Are Rising in 2026"
- World Bank Commodity Markets Outlook, 2026
- Farmdesk — "Updated standard fertilizer costs 2023–2024" (NL benchmark)
- DTN Retail Fertilizer Trends, April 2026
- Farmers National Company — EU fertilizer price commentary, 2026
- ScienceDirect — "Assessing yield and fertilizer response in heterogeneous smallholder fields with UAVs and satellites"
- Reprodgroup — "Relative Assessment of Fertilizer Application Techniques for Enhancing Nutrient Use Efficiency" (2025 meta-analysis)
- Bayer Climate FieldView, Yara Atfarm, BASF xarvio, John Deere Operations Center — product documentation (2024–2026)
- [Inference] supply-chain risk scores, cost projections, hackathon time budgets

---

## Methodology

- 7 parallel research agents covering: satellite APIs, ML models, tractor formats, UK land data, fertiliser alternatives, competitive analysis, MVP architecture
- 2 web-scraping agents using WebFetch (HuggingFace + competitor pages)
- Firecrawl CLI for direct URL scraping (Ackerprofi, YaraPlus, Atfarm)
- Cross-referenced findings across agents for consistency
- **Gaps:** Planet Labs pricing not fully verified; Woodsmith Mine production timeline approximate; real-time fertiliser prices not available (estimates used).
