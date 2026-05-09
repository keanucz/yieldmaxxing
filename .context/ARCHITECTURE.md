# Architecture

> **Single source of truth for the technical architecture.** Reflects the code that has actually been scaffolded, including Keanu's Fiber + Postgres + OAuth + production-deploy rewrite (commit `afd44a7`), then layers on the agreed direction for new features.

---

## Naming

| Where | Name |
|-------|------|
| GitHub repo | `keanucz/yieldmaxxing` |
| Production domain | `yieldmaxxing.keanuc.net` |
| Go API app name (`fiber.Config{AppName}`), Go module (`go.mod`) | **CropGuard** (`github.com/hackathon/cropguard`) |
| Python agent service title | "FarmWise Agent Service" *(legacy, untouched in Keanu's rewrite — should be renamed)* |
| docker-compose internal network | `farmwise` *(legacy)* |
| Pitch / docs / Postgres DB name | **CropGuard** |

**Decision (effective):** the product name is **CropGuard**, the GitHub repo and production domain are **YieldMaxxing**. **FarmWise** is legacy and survives only in the docker network name and the Python FastAPI app title. Rename those when convenient.

---

## What's actually been built

### 1. Backend — Go API + Python LangGraph agents (Isaac → Keanu rewrite, on `master`)

Three services in `docker-compose.yml`:

- **`postgres`** — Postgres 16-alpine on port `5432`. Persistent volume `pgdata`. Bootstraps with `go-api/db/migrations/001_initial.sql`. DB name / user / password all `cropguard` for local dev.
- **`go-api`** — Go (**Fiber v2**), port `8080`. Public-facing REST API. Job state in **Postgres** via `pgx/v5` (no more in-memory map). **Google OAuth2** with JWT cookie sessions (using `go-pkgz/auth` pattern). Module: `github.com/hackathon/cropguard`.
- **`python-agents`** — Python FastAPI + LangGraph, port `8001`. Internal agent service called by `go-api` over HTTP at `http://python-agents:8001`.

Production stack adds Komodo orchestration on Unraid + Caddy reverse proxy on Oracle VPS. See [Deployment](#deployment) below.

### 2. Frontend — Vite/React (Fabian, on `origin/frontend` orphan branch)

Vite + React + JavaScript (`.jsx`, not TypeScript). Components: `FieldMap`, `FieldOverview`, `PrescriptionMap`, `ROISummary`. Static `src/data/fields.js`. Has `assets/hero.png`. **Not merged with `master`** — orphan branch, no shared history. Will need to handle the new OAuth flow when wired up.

### 3. Research / planning docs (Keanu, on `master` in `.context/`)

This file, plus [`RESEARCH.md`](RESEARCH.md) and [`competitive-analysis.md`](competitive-analysis.md). Aspirational v2 features (UK CROME, ISOXML export, Strait-of-Hormuz alternatives engine, multi-crop) live in those files — not yet in code.

---

## Stack (full)

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Vite + React + Leaflet + leaflet-draw + jsPDF | Skeleton on `origin/frontend` (Fabian); needs OAuth wiring + map integration + merge into master |
| Public API | Go + **Fiber v2** | **Built** (`go-api/`) |
| Auth | Google OAuth2 (`go-pkgz/auth` pattern) + JWT cookie sessions | **Built** (`go-api/handlers/auth.go`, `go-api/middleware/auth.go`) |
| Database | **PostgreSQL 16** via `pgx/v5` | **Built** (`go-api/db/db.go`, migrations in `go-api/db/migrations/`) |
| Agent service | Python + FastAPI + LangGraph (with `MemorySaver` checkpointer + `interrupt` for human-in-the-loop) | **Built** (`python-agents/`) |
| AI — vision | Anthropic Claude (`claude-opus-4-7` for analysis, `claude-sonnet-4-6` for optimizer) | **Built** |
| Satellite | Copernicus / Sentinel Hub via `sentinelhub` Python SDK | **Built** — RGB + NDVI fetched, NDVI stats computed server-side |
| Geocoding | postcodes.io (UK) | Aspirational |
| Field boundaries | CROME 2024 (Defra) for UK | Aspirational |
| Tractor export | ISOXML via `pip install isoxml` | Aspirational |
| Backup export | GeoJSON, Shapefile, jsPDF | Aspirational |
| Knowledge base | Hardcoded JSON (`python-agents/knowledge/corn.json`) | **Built**, corn-only |
| Containers | Docker, multi-stage builds | **Built** |
| Image registry | GHCR (`ghcr.io/keanucz/yieldmaxxing-api`, `…-agents`) | **Built** |
| Orchestration (prod) | Komodo on Unraid (Tailscale `100.85.82.61`) | **Built** |
| Reverse proxy (prod) | Caddy on Oracle VPS, TLS via Cloudflare DNS-01 | **Built** |
| CI/CD | GitHub Actions: build → push GHCR → SSH deploy to Unraid | **Built** (`.github/workflows/deploy.yml`) |

---

## Pipeline (LangGraph state machine)

The agent flow in `python-agents/graph.py`:

```
satellite_fetch ─► crop_analyze ─► annotation_interrupt ─► optimizer ─► END
                                         ▲
                                  (human-in-the-loop:
                                  farmer submits bounding
                                  boxes via the frontend)
```

`FarmState` (TypedDict): `job_id, location {lat, lon, name}, date_start, date_end, crop_image_base64, satellite_images, crop_analysis, annotations, final_report`.

- **`satellite_fetch`** (`nodes/satellite.py`) — fetches Sentinel-2 RGB (3.5× brightened evalscript) + NDVI (FLOAT32) for a `~5km` radius around the farm point. Computes NDVI stats (`mean, min, max, std, p10, p25, p75, p90`). Returns RGB as base64 PNG data URL plus the stats dict.
- **`crop_analyze`** (`nodes/analyzer.py`) — Claude Opus 4.7 vision call. System prompt embeds the corn knowledge base. Returns `{crop_type, health_score, issues[], summary}`.
- **`annotation_interrupt`** (`graph.py`) — pauses the graph via LangGraph's `interrupt(...)` with `{type: "annotation_required", satellite_images, crop_analysis, message}`. Resumes when farmer submits bounding boxes.
- **`optimizer`** (`nodes/optimizer.py`) — Claude Sonnet 4.6 text call. Receives analysis + annotations + NDVI stats. Returns `{health_score, annotated_issues[], recommendations[], executive_summary, estimated_yield_impact}`.

> The annotation flow is **bounding boxes drawn on the RGB satellite image** (`{x, y, w, h}` percentages), not polygons drawn on a Leaflet map. This is an open architectural decision — see [Open architectural decisions](#open-architectural-decisions).

---

## API surface

### Go public API

Fiber v2 router in `go-api/main.go`. Routes:

**Unprotected:**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness check |
| `GET` | `/auth/login` | Start Google OAuth flow |
| `GET` | `/auth/callback` | OAuth callback; sets JWT cookie |
| `POST` | `/auth/logout` | Clear JWT cookie |

**Protected (`middleware.AuthRequired(JWTSecret)` on `/api/*`):**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/me` | Current user info |
| `POST` | `/api/jobs` | Create a job (also writes to Postgres). Triggers async dispatch to `python-agents`. |
| `GET` | `/api/jobs` | List the current user's jobs |
| `GET` | `/api/jobs/:id` | Get a single job (poll for status) |
| `POST` | `/api/jobs/:id/annotations` | Submit bounding boxes. Only valid when status is `awaiting_annotation`. Triggers async resume. |

CORS: `AllowOrigins: cfg.AppURL` (the frontend origin); `AllowCredentials: true` so the JWT cookie is sent.

### Python internal API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/run` | Start the LangGraph pipeline. Body: `RunRequest`. Runs until `annotation_interrupt`. |
| `POST` | `/resume` | Resume the graph after annotations. Body: `ResumeRequest`. Runs to completion. |
| `GET` | `/health` | Liveness check |

Communication: Go → Python via `cfg.AgentServiceURL` (default `http://python-agents:8001` in compose, `http://localhost:8001` for local non-compose dev).

---

## Database schema

`go-api/db/migrations/001_initial.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'google',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    location JSONB NOT NULL DEFAULT '{}',
    date_start TEXT NOT NULL DEFAULT '',
    date_end TEXT NOT NULL DEFAULT '',
    crop_image_base64 TEXT NOT NULL DEFAULT '',
    satellite_images JSONB,
    crop_analysis JSONB,
    annotations JSONB,
    final_report JSONB,
    error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
```

Job rows are scoped by `user_id` — each user only sees their own jobs.

---

## Job state machine

```
pending ─► fetching_satellite ─► analyzing ─► awaiting_annotation ─► optimizing ─► complete
                                                                                  │
                                                                                  ▼
                                                                                failed
```

Statuses defined in `go-api/models/models.go`. Currently `analyzing` is defined but not emitted as an intermediate status — surface area for tightening the UX progress indicator.

---

## Data shapes

Defined twice — Go (`go-api/models/models.go`) and Python Pydantic (`python-agents/main.py`). Frontend types must mirror. Highlights:

- `Location { lat: float, lon: float, name: string }`
- `BoundingBox { label: string, x: float, y: float, w: float, h: float }` — **percentages** of the RGB image, not lat/lon
- `SatelliteImages { rgb_url: string (data URL), ndvi_data: dict, metadata: dict }`
- `CropAnalysis { crop_type, health_score, ndvi_mean, issues[], summary }`
- `DetectedIssue { id, name, confidence, severity, area }` — `id` matches `python-agents/knowledge/corn.json`
- `Recommendation { priority, action, timing, estimated_cost }`
- `AnnotatedIssue { issue, bounding_box, area_hectares }`
- `FinalReport { health_score, annotated_issues[], recommendations[], executive_summary, estimated_yield_impact }`
- `User { id, email, name, avatar_url, provider, created_at }` *(new — auth)*

---

## Knowledge base

`python-agents/knowledge/corn.json` is the agronomic source of truth for the demo. Corn-only.

Schema: `crop`, `scientific_name`, `key_spectral_indices`, `diseases[]` (id, name, pathogen / type, symptoms, ndvi_signature, risk_conditions, treatments, economic_threshold), `field_health_benchmarks` (excellent / good / fair / poor / critical with NDVI ranges).

Currently covers: gray leaf spot, northern corn leaf blight, common rust, nitrogen deficiency, drought / water stress.

To extend: add `wheat.json`, `barley.json`, etc. and load by `crop_type` in `analyzer.py` / `optimizer.py`.

---

## Project structure

```
yieldmaxxing/
├── CLAUDE.md
├── docker-compose.yml              — postgres + go-api + python-agents on the `farmwise` bridge net
├── docker-compose.prod.yml         — production stack (GHCR images + postgres)
├── .env.example                    — local-dev env scaffold
├── .gitignore                      — .firecrawl/, .env
├── .github/workflows/
│   └── deploy.yml                  — CI/CD: build → GHCR → SSH deploy to Unraid
├── deploy/
│   ├── caddy-snippet.txt           — Caddyfile reverse-proxy block for the Oracle VPS
│   └── komodo-stack.toml           — Komodo resource definition for the Unraid stack
├── go-api/                         — Go (Fiber) public REST API on :8080
│   ├── Dockerfile
│   ├── go.mod / go.sum             — module: github.com/hackathon/cropguard
│   ├── main.go                     — Fiber app, routes, OAuth + protected /api groups
│   ├── config/config.go            — env-loaded Config struct
│   ├── db/
│   │   ├── db.go                   — pgxpool init / Close
│   │   └── migrations/001_initial.sql  — users + jobs tables
│   ├── handlers/
│   │   ├── auth.go                 — GoogleLogin, GoogleCallback, Logout, GetMe
│   │   └── jobs.go                 — CreateJob, ListJobs, GetJob, SubmitAnnotations + agent dispatch
│   ├── middleware/auth.go          — AuthRequired (JWT cookie verification)
│   └── models/models.go            — Job, JobStatus, BoundingBox, SatelliteImages, CropAnalysis, FinalReport, User
├── python-agents/                  — Python FastAPI + LangGraph internal agent service on :8001
│   ├── Dockerfile
│   ├── requirements.txt            — fastapi, langgraph, anthropic, sentinelhub, pillow, numpy, dotenv
│   ├── main.py                     — FastAPI /run, /resume, /health
│   ├── graph.py                    — FarmState TypedDict, LangGraph build with annotation interrupt
│   ├── knowledge/corn.json         — corn agronomy knowledge base
│   └── nodes/
│       ├── satellite.py            — Sentinel-2 RGB + NDVI fetch + stats
│       ├── analyzer.py             — Claude Opus 4.7 vision call
│       └── optimizer.py            — Claude Sonnet 4.6 final-report call
├── frontend/                       — TBD: merge from origin/frontend (Fabian's Vite/React skeleton)
└── .context/                       — knowledge base
```

---

## Environment variables

### Go API (`go-api/config/config.go`)

| Var | Default | Notes |
|-----|---------|-------|
| `DATABASE_URL` | `postgres://cropguard:cropguard@postgres:5432/cropguard` | Local dev / compose |
| `GOOGLE_CLIENT_ID` | (none) | Google OAuth2 |
| `GOOGLE_CLIENT_SECRET` | (none) | Google OAuth2 |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/auth/callback` | Must match Google Cloud console |
| `JWT_SECRET` | `dev-secret-change-me` | **Override in production** |
| `APP_URL` | `http://localhost:3000` | Frontend origin (CORS + post-login redirect) |
| `AGENT_SERVICE_URL` | `http://python-agents:8001` | Internal agent service base |
| `PORT` | `8080` | API port |

### Python agents

| Var | Notes |
|-----|-------|
| `ANTHROPIC_API_KEY` | Claude API |
| `SH_CLIENT_ID` | Sentinel Hub OAuth |
| `SH_CLIENT_SECRET` | Sentinel Hub OAuth |

### Production (managed in Komodo as `[[SECRET_NAME]]`)

`YIELDMAXXING_DB_PASSWORD`, `ANTHROPIC_API_KEY`, `SH_CLIENT_ID`, `SH_CLIENT_SECRET`, `YIELDMAXXING_GOOGLE_CLIENT_ID`, `YIELDMAXXING_GOOGLE_CLIENT_SECRET`, `YIELDMAXXING_JWT_SECRET`. GitHub Actions also needs `UNRAID_SSH_KEY` for the deploy step.

---

## Output formats

**Currently produced:**
- `final_report` JSON (returned by Python `/resume` → persisted on the Postgres `jobs.final_report` JSONB column)
- RGB satellite PNG (base64 data URL) for the frontend to overlay

**Aspirational:**
- ISOXML ZIP for tractor terminals (via `pip install isoxml`)
- GeoJSON `FeatureCollection` with field boundary + zone properties
- Shapefile (legacy/backup)
- Printable PDF summary via jsPDF

---

## Deployment

```
[git push origin master]
        │
        ▼
[GitHub Actions CI/CD]  (.github/workflows/deploy.yml)
   ├── Build go-api image       → ghcr.io/keanucz/yieldmaxxing-api:latest
   ├── Build python-agents image → ghcr.io/keanucz/yieldmaxxing-agents:latest
   └── SSH to Unraid → docker compose pull && up -d
        │
        ▼
[Unraid Server (Tailscale 100.85.82.61)]
   Komodo stack "yieldmaxxing"  (deploy/komodo-stack.toml)
   ├── yieldmaxxing-api      :8080
   ├── yieldmaxxing-agents   :8001
   └── yieldmaxxing-postgres :5432
        │
        ▼
[Oracle VPS — Caddy reverse proxy]  (deploy/caddy-snippet.txt)
   yieldmaxxing.keanuc.net → 100.85.82.61:8080
   TLS via Cloudflare DNS-01
```

GitHub Actions deploy secret: `UNRAID_SSH_KEY` (private key for `root@100.85.82.61`).

---

## Risk mitigation for the demo

| Risk | Mitigation |
|------|-----------|
| Sentinel Hub slow / down | Pre-cache RGB+NDVI tiles for 3-4 demo locations; fallback path in `satellite_fetch_node` |
| Cloud cover hides NDVI | Use `mosaicking_order=leastCC` over a 30-day window (already in code) |
| Claude API slow / down | Cache one successful analysis + report response, surface as "example analysis" |
| Image too large for Claude | Resize to 1024px max dimension before base64 encode |
| Demo wifi flaky | Run everything locally; pre-fetch all satellite tiles; pre-cache LLM responses |
| Postgres unavailable | Docker compose `depends_on: condition: service_healthy` blocks go-api start; if it fails the API is down — keep a local-only fallback path if time permits |
| OAuth redirect misconfigured | `GOOGLE_REDIRECT_URL` must match Google Cloud console **exactly**; for the demo use both `http://localhost:8080/auth/callback` and the prod domain |
| LangGraph interrupt state lost | `MemorySaver` is in-process — if Python service restarts, in-flight jobs are lost. Acceptable for demo; flag for production. |

---

## Open architectural decisions

The biggest are 1–3:

1. **Annotation UX: bounding boxes vs polygon draw.** Current code uses `BoundingBox {x, y, w, h}` percentages on the RGB image. Keanu's research + Fabian's frontend both assume `leaflet-draw` polygons in lat/lon. Picking polygons means refactoring `optimizer_node`, the `BoundingBox` model in both Go and Python, the `annotation_interrupt`, and the `jobs.annotations` JSONB shape.
2. **Frontend integration.** `origin/frontend` is an orphan branch with no merge base. Options: merge as `frontend/` subdirectory; rebase / cherry-pick onto `master`; rebuild in `master` using Fabian's components as reference. Coordinate with Fabian. Either way, the frontend now needs to handle the **OAuth flow** (redirect to `/auth/login`, send the JWT cookie on `/api/*` calls).
3. **Crop scope: corn-only vs multi-crop.** The code is corn-only (`corn.json`, hardcoded prompts). The pitch is multi-crop. For the demo, ship corn and pitch as the "first crop"; add stubs post-demo.
4. **Sentinel Hub endpoint.** Code uses `https://services.sentinel-hub.com` (commercial). [`RESEARCH.md`](RESEARCH.md) recommends free Copernicus Data Space (`https://sh.dataspace.copernicus.eu`). Switch if hackathon credits are tight.
5. **ISOXML / GeoJSON / PDF export.** Aspirational. Slot in if there's time.
6. **UK-specific features (CROME boundaries, postcodes.io, Hormuz alternatives).** None are in code. Decision: keep them as v2 differentiator narrative; demo on the existing corn pipeline.
7. **Rename legacy `farmwise` references.** Docker network name (`docker-compose.yml`) and Python FastAPI app title (`python-agents/main.py:21`) still say "FarmWise". Low priority.
8. **`analyzing` job status not emitted.** Defined in `models.go` but never set. Wire it up for tighter pipeline-progress UX, or remove.
9. **Rate limiting on the agents endpoint.** Token-cost control. Open per Keanu's note in the original `plans/architecture.md`.
10. **Redis cache layer for satellite imagery responses?** Open per Keanu's note.
11. **Postgres schema migration strategy in production.** Currently `001_initial.sql` is mounted as a `docker-entrypoint-initdb.d` file — runs only on a fresh DB. Open per Keanu's note.

---

## Hour-by-hour build plan

Adapted from Keanu's original plan to the current Go-Fiber + Postgres + OAuth + orphan-frontend reality:

- **Hour 1.** Frontend pair (Fede + Fabian, Claude floats): merge / rebase Fabian's frontend into `master`, set up a dev OAuth client in Google Cloud, wire login flow, render RGB satellite image. Backend pair (Keanu + Isaac, Claude floats): smoke-test the existing pipeline end-to-end with real Sentinel Hub creds; pre-cache demo tiles; verify the Postgres job lifecycle.
- **Hour 2.** Frontend: bounding-box drawing UI on the RGB image (or pivot to leaflet-draw polygons if the team picks that direction); pipeline progress indicator; results card. Backend: final-report polish, error handling, cached fallback responses.
- **Hour 3.** Polish, demo script (4 demo locations), backup video, slides, practice 2× before the pitch.

Team split: [`plans/team.md`](plans/team.md).

---

## One-line summary for judges

> "CropGuard diagnoses corn stress from a phone photo using Claude Vision, fetches Sentinel-2 NDVI for the field, lets the farmer annotate problem zones on the satellite image, and returns a precision treatment report with prioritized actions, costs, and yield impact — running on a Go + Postgres + Python LangGraph stack deployed via Komodo to a homelab and surfaced behind Caddy at yieldmaxxing.keanuc.net."
