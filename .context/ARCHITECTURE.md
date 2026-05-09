# Architecture

> **Single source of truth for the technical architecture.** Reflects the code that has actually been scaffolded, then layers on the agreed direction for new features.

---

## Naming (heads-up — three names in play)

| Where | Name |
|-------|------|
| GitHub repo | `keanucz/yieldmaxxing` |
| Product / pitch / docs | **CropGuard** |
| Code (`go.mod`, FastAPI app title, docker-compose service names, networks) | **FarmWise** |

The team needs to pick one. The recap at the bottom of `index.md` flags this. Until resolved: **YieldMaxxing = repo, CropGuard = product, FarmWise = legacy code identifier**.

---

## What's actually been built

Three streams of code, only partially aligned:

### 1. Backend — Go API + Python LangGraph agents (Isaac, on `master`)

Two services in `docker-compose.yml`:

- **`go-api`** — Go (Gin), port `8080`. Public-facing REST API. In-memory `map[string]*models.Job` for job state.
- **`python-agents`** — Python FastAPI + LangGraph, port `8001`. Internal agent service called by `go-api` over HTTP.

The Go API is the gateway; the Python service is the AI/agent worker.

### 2. Frontend — Vite/React (Fabian, on `origin/frontend` orphan branch)

Vite + React + JavaScript (`.jsx`, not TypeScript). Components: `FieldMap`, `FieldOverview`, `PrescriptionMap`, `ROISummary`. Static `src/data/fields.js`. Has `assets/hero.png`. **Not merged with `master`** — orphan branch, no shared history. Decision pending on how to integrate.

### 3. Research / planning docs (Keanu, on `master` in `.context/`)

This file, plus `RESEARCH.md` and `competitive-analysis.md`. Describes a **different** target architecture (single FastAPI service, polygon draw, ISOXML export, UK CROME, supply-chain alternatives engine, multi-crop). These features are agreed direction but **not yet in the code**.

---

## Agreed stack (the direction we're going)

| Layer | Choice | Status |
|-------|--------|--------|
| Frontend | Vite + React + Leaflet + leaflet-draw + jsPDF | Skeleton on `origin/frontend` (Fabian); needs Leaflet integration + merge into master |
| Public API | Go + Gin | **Built** (`go-api/`) |
| Agent service | Python + FastAPI + LangGraph (with `MemorySaver` checkpointer + `interrupt` for human-in-the-loop) | **Built** (`python-agents/`) |
| AI — vision | Anthropic Claude (`claude-opus-4-7` for analysis, `claude-sonnet-4-6` for optimizer) | **Built** |
| Satellite | Copernicus Data Space (Sentinel Hub) via `sentinelhub` Python SDK — **NOT** the Process API directly | **Built** — RGB + NDVI both fetched, NDVI stats computed server-side |
| Geocoding | postcodes.io (UK) | Aspirational |
| Field boundaries | CROME 2024 (Defra) for UK | Aspirational |
| Tractor export | ISOXML via `pip install isoxml` (Josephinum-Research/isoxml-py) | Aspirational |
| Backup export | GeoJSON, Shapefile, jsPDF | Aspirational |
| Knowledge base | Hardcoded JSON (`python-agents/knowledge/corn.json`) — diseases, NDVI signatures, treatments, economic thresholds | **Built**, corn-only |

---

## Pipeline (LangGraph state machine)

The actual code in `python-agents/graph.py`:

```
satellite_fetch ─► crop_analyze ─► annotation_interrupt ─► optimizer ─► END
                                         ▲
                                  (human-in-the-loop:
                                  farmer submits bounding
                                  boxes via the frontend)
```

State (`FarmState` TypedDict): `job_id`, `location {lat, lon, name}`, `date_start`, `date_end`, `crop_image_base64`, `satellite_images`, `crop_analysis`, `annotations`, `final_report`.

- `satellite_fetch` (`nodes/satellite.py`): fetches Sentinel-2 RGB (3.5× brightened RGB evalscript) and NDVI (FLOAT32) for a `~5km` radius around the farm point. Computes NDVI stats (`mean, min, max, std, p10, p25, p75, p90`). Returns RGB as a base64 PNG data URL plus the NDVI stats dict.
- `crop_analyze` (`nodes/analyzer.py`): Claude Opus 4.7 vision call. System prompt embeds the corn knowledge base. Returns `{crop_type, health_score, issues[], summary}`.
- `annotation_interrupt` (`graph.py`): pauses the graph via LangGraph's `interrupt(...)` mechanism with `{type: "annotation_required", satellite_images, crop_analysis, message}`. Resumes when farmer submits bounding boxes.
- `optimizer` (`nodes/optimizer.py`): Claude Sonnet 4.6 text call. Receives analysis + annotations + NDVI stats. Returns `{health_score, annotated_issues[], recommendations[], executive_summary, estimated_yield_impact}`.

> **Important:** the current annotation flow is **bounding boxes drawn on the RGB satellite image**, not polygons drawn on a Leaflet map. Keanu's plan called for `leaflet-draw` polygons. This is an open architectural decision — see "Open architectural decisions" below.

---

## API surface

### Go public API (`go-api/main.go`, `handlers/jobs.go`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/jobs` | Create a job. Body: `{location {lat, lon, name}, date_start, date_end, crop_image_base64}`. Response: `Job` (status `pending`). Triggers async `dispatchToAgents`. |
| `GET` | `/api/jobs` | List all jobs. |
| `GET` | `/api/jobs/:id` | Get a single job (poll for status). |
| `POST` | `/api/jobs/:id/annotations` | Submit bounding boxes. Only valid when status is `awaiting_annotation`. Triggers async `resumeAgentWithAnnotations`. |
| `GET` | `/health` | Liveness check. |

CORS is wide-open (`*`) for the demo.

### Python internal API (`python-agents/main.py`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/run` | Start the LangGraph pipeline. Body: `RunRequest`. Runs until `annotation_interrupt`. Returns satellite images + crop analysis with status `awaiting_annotation`. |
| `POST` | `/resume` | Resume the graph after annotations. Body: `ResumeRequest` (annotations). Runs to completion. Returns `final_report`. |
| `GET` | `/health` | Liveness check. |

Communication: Go → Python over HTTP at `http://localhost:8001` (constant `agentServiceURL` in `handlers/jobs.go`). In docker-compose, the network is named `farmwise`.

---

## Job state machine

```
pending ─► fetching_satellite ─► analyzing ─► awaiting_annotation ─► optimizing ─► complete
                                                                                  │
                                                                                  ▼
                                                                                failed
```

Statuses are defined in `go-api/models/job.go` (`JobStatus` type). Currently the Go side updates `pending → fetching_satellite` synchronously, then the Python `/run` response sets `awaiting_annotation`. `analyzing` is defined but isn't currently emitted as an intermediate status — surface area for tightening the UX progress indicator.

---

## Data shapes

Defined twice — Go (`go-api/models/job.go`) and Python Pydantic (`python-agents/main.py`). Frontend types (when written) must match. Highlights:

- `Location { lat: float, lon: float, name: string }`
- `BoundingBox { label: string, x: float, y: float, w: float, h: float }` — **percentages** of the RGB image, not lat/lon
- `SatelliteImages { rgb_url: string (data URL), ndvi_data: dict, metadata: dict }`
- `CropAnalysis { crop_type, health_score, ndvi_mean, issues[], summary }`
- `DetectedIssue { id, name, confidence, severity, area }` — `id` matches `python-agents/knowledge/corn.json`
- `Recommendation { priority, action, timing, estimated_cost }`
- `AnnotatedIssue { issue, bounding_box, area_hectares }`
- `FinalReport { health_score, annotated_issues[], recommendations[], executive_summary, estimated_yield_impact }`

---

## Knowledge base

`python-agents/knowledge/corn.json` is the agronomic source of truth for the demo. Corn-only. Schema:

- `crop`, `scientific_name`
- `key_spectral_indices` — NDVI, NDRE, NDWI, EVI explanations
- `diseases[]` — for each: `id`, `name`, `pathogen` (or `type: nutrient/abiotic`), `symptoms[]`, `ndvi_signature`, `risk_conditions[]`, `treatments[]`, `economic_threshold`
- `field_health_benchmarks` — `excellent / good / fair / poor / critical` with NDVI ranges and descriptions

Currently covers: gray leaf spot, northern corn leaf blight, common rust, nitrogen deficiency, drought / water stress.

To extend to other crops post-demo: add `wheat.json`, `barley.json`, etc., and load by `crop_type`.

---

## Project structure

```
yieldmaxxing/
├── CLAUDE.md                       — Agent entry point
├── docker-compose.yml              — go-api + python-agents on a shared bridge net
├── .env.example                    — ANTHROPIC_API_KEY, SH_CLIENT_ID, SH_CLIENT_SECRET
├── go-api/
│   ├── Dockerfile
│   ├── go.mod                      — module: github.com/hackathon/farmwise
│   ├── main.go                     — Gin router, CORS, /api/jobs routes
│   ├── handlers/jobs.go            — handlers + agent-service HTTP client
│   └── models/job.go               — Job, JobStatus, BoundingBox, SatelliteImages, CropAnalysis, FinalReport
├── python-agents/
│   ├── Dockerfile
│   ├── requirements.txt            — fastapi, langgraph, anthropic, sentinelhub, pillow, numpy, dotenv
│   ├── main.py                     — FastAPI app, /run, /resume, /health
│   ├── graph.py                    — FarmState TypedDict, LangGraph build
│   ├── knowledge/corn.json         — corn agronomy knowledge base
│   └── nodes/
│       ├── satellite.py            — Sentinel-2 RGB + NDVI fetch + stats
│       ├── analyzer.py             — Claude Opus 4.7 vision call
│       └── optimizer.py            — Claude Sonnet 4.6 final-report call
├── frontend/                       — TBD: merge from origin/frontend (Fabian's Vite/React skeleton)
└── .context/                       — knowledge base (this file lives here)
```

---

## External APIs and credentials

Required in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
SH_CLIENT_ID=...        # from dataspace.copernicus.eu dashboard → User Settings → OAuth clients
SH_CLIENT_SECRET=...
```

The Sentinel Hub base URL in code is `https://services.sentinel-hub.com` (commercial Sentinel Hub), **not** `https://sh.dataspace.copernicus.eu` (the free Copernicus Data Space tier referenced throughout `RESEARCH.md`). Either Isaac switched to the commercial endpoint deliberately or this needs reconciling with the free-tier auth flow Keanu researched. Open question — see below.

---

## Output formats

**Currently produced:**
- `final_report` JSON (returned by Python `/resume` → stored on the Go `Job`)
- RGB satellite PNG (base64 data URL) for the frontend to overlay

**Aspirational, not yet wired:**
- ISOXML ZIP for tractor terminals (via `pip install isoxml`, ~30 lines per Keanu's research)
- GeoJSON `FeatureCollection` with field boundary + zone properties
- Shapefile (legacy/backup)
- Printable PDF summary via jsPDF

---

## Risk mitigation for the demo

| Risk | Mitigation |
|------|-----------|
| Sentinel Hub slow / down | Pre-cache RGB+NDVI tiles for 3-4 demo locations; fallback path in `satellite_fetch_node` |
| Cloud cover hides NDVI | Use `mosaicking_order=leastCC` over a 30-day window (already in code) |
| Claude API slow / down | Cache one successful analysis + report response, surface as "example analysis" |
| Image too large for Claude | Resize to 1024px max dimension before base64 encode |
| Demo wifi flaky | Run everything locally; pre-fetch all satellite tiles; pre-cache LLM responses |
| LangGraph interrupt state lost | `MemorySaver` is in-process — if Python service restarts, jobs are lost. Acceptable for demo; flag for production. |

---

## Open architectural decisions

These are real decisions the team needs to make. The first three matter most:

1. **Project name.** YieldMaxxing (repo) vs CropGuard (pitch) vs FarmWise (code). Pick one and rename consistently.
2. **Annotation UX: bounding boxes vs polygon draw.** The current code uses `BoundingBox { x, y, w, h }` percentages on the RGB image. Keanu's plan + Fabian's frontend both assume `leaflet-draw` polygons in lat/lon. Picking polygons means refactoring `optimizer_node`, `BoundingBox` model, and `annotation_interrupt`.
3. **Crop scope: corn-only vs multi-crop.** The code is corn-only (`corn.json`, hardcoded prompts). The pitch is multi-crop (wheat, maize, barley, potato — see `competitive-analysis.md`). For the demo, ship corn and pitch as the "first crop"; add stubs for others post-demo.
4. **Frontend integration.** `origin/frontend` is an orphan branch. Options: merge into `master` as `frontend/` subdirectory; rebase / cherry-pick onto `master`; or rebuild the frontend in `master` using Fabian's components as reference. Coordinate with Fabian.
5. **Sentinel Hub endpoint.** Code points at `services.sentinel-hub.com` (paid). Research recommends `sh.dataspace.copernicus.eu` (free Copernicus Data Space). Reconcile.
6. **Single FastAPI vs Go+Python split.** Keanu's plan said single FastAPI; Isaac built two services. The Go+Python split is more interesting architecturally and is already working — keep it. Update Keanu's docs (this file) to reflect this — done.
7. **ISOXML / GeoJSON / PDF export.** Aspirational. Not blocking the demo. Slot in if there's time.
8. **UK-specific features (CROME boundaries, postcodes.io, Hormuz alternatives engine).** None are in code. Decision: keep them as the v2 differentiator narrative; demo on the existing corn pipeline.
9. **`analyzing` status not emitted.** Defined in the state machine but never set. Either remove or wire it up for a tighter pipeline progress UX.

---

## Hour-by-hour build plan (for reference)

Originally written for a clean-slate FastAPI build. Adapt to the current Go+Python+orphan-frontend reality:

- **Hour 1.** Frontend pair (Fede + Fabian, Claude floats): merge / rebase Fabian's frontend into `master`, wire it to the Go API, render RGB satellite image. Backend pair (Keanu + Isaac, Claude floats): smoke-test the existing pipeline end-to-end with real Sentinel Hub creds; pre-cache demo tiles.
- **Hour 2.** Frontend: bounding-box drawing UI on the RGB image (or pivot to leaflet-draw polygons if the team picks that direction); pipeline progress indicator; results card. Backend: final-report polish, error handling, cached fallback responses.
- **Hour 3.** Polish, demo script (4 UK farm locations or whatever set of demo points the team picks), backup video, slides, practice 2× before the pitch.

Team split is in [`plans/team.md`](plans/team.md).

---

## One-line summary for judges

> "CropGuard / YieldMaxxing diagnoses corn stress from a phone photo using Claude Vision, fetches Sentinel-2 NDVI for the field, lets the farmer annotate problem zones on the satellite image, and returns a precision treatment report with prioritized actions, costs, and yield impact."
