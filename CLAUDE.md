# CLAUDE.md — AI Agent Instructions

## What is this project?
A precision-agriculture platform that diagnoses crop stress from a phone photo (Claude Vision), fetches Sentinel-2 NDVI for the field, lets the farmer annotate problem zones on the satellite image, and returns a precision treatment report with prioritized actions, cost estimates, and yield-impact projections. Corn-only for the hackathon MVP. Pitched v2 adds UK CROME boundaries, multi-crop, ISOXML tractor export, and a supply-chain-aware fertiliser alternatives engine.

## Naming (effective decision)
- **Product / Go module / Postgres DB:** **CropGuard** (`github.com/hackathon/cropguard`, `fiber.Config{AppName: "CropGuard API"}`)
- **GitHub repo + production domain:** **YieldMaxxing** (`keanucz/yieldmaxxing`, `yieldmaxxing.keanuc.net`)
- **Legacy:** **FarmWise** still appears in the docker-compose network name and the Python FastAPI app title (`python-agents/main.py`). Rename when convenient.

## Read context first
Before doing any work, read `.context/index.md`, `.context/ARCHITECTURE.md`, and `.context/RESEARCH.md`. Those three files cover the project, the actual code, and what's aspirational vs implemented. The architecture file lists the open decisions at the bottom — check those before assuming a stack choice.

## Team split (3-hour hackathon)

| Person | Area |
|--------|------|
| **Federico (Fede)** | Frontend |
| **Fabian** | Frontend |
| **Keanu** | Backend |
| **Isaac** | Backend |
| **Claude (this agent)** | 50/50 frontend ↔ backend, floats between both stacks as needed |

Full notes in `.context/plans/team.md`.

## Repo structure
```
yieldmaxxing/
├── CLAUDE.md
├── docker-compose.yml              — postgres + go-api + python-agents (local dev)
├── docker-compose.prod.yml         — production stack (GHCR images + postgres)
├── .env.example                    — local-dev env scaffold
├── .gitignore                      — .firecrawl/, .env
├── .github/workflows/
│   └── deploy.yml                  — CI/CD: build → GHCR → SSH deploy to Unraid
├── deploy/
│   ├── caddy-snippet.txt           — Caddyfile reverse-proxy block (Oracle VPS)
│   └── komodo-stack.toml           — Komodo resource definition (Unraid stack)
├── go-api/                         — Go (Fiber v2) public REST API on :8080
│   ├── Dockerfile
│   ├── go.mod / go.sum             — module: github.com/hackathon/cropguard
│   ├── main.go                     — Fiber app, /auth/* (unprotected) + /api/* (JWT-protected)
│   ├── config/config.go            — env-loaded Config struct
│   ├── db/
│   │   ├── db.go                   — pgxpool init / Close
│   │   └── migrations/001_initial.sql  — users + jobs tables
│   ├── handlers/
│   │   ├── auth.go                 — Google OAuth login/callback/logout/me
│   │   └── jobs.go                 — CRUD + agent-service dispatch (Postgres-backed)
│   ├── middleware/auth.go          — AuthRequired (JWT cookie verification)
│   └── models/models.go            — Job, BoundingBox, SatelliteImages, CropAnalysis, FinalReport, User
├── python-agents/                  — Python FastAPI + LangGraph agent service on :8001
│   ├── Dockerfile
│   ├── requirements.txt            — fastapi, langgraph, anthropic, sentinelhub, pillow, numpy, dotenv
│   ├── main.py                     — FastAPI /run, /resume, /health
│   ├── graph.py                    — FarmState + LangGraph build with annotation interrupt
│   ├── knowledge/corn.json         — corn agronomy knowledge base
│   └── nodes/
│       ├── satellite.py            — Sentinel-2 RGB + NDVI fetch + stats
│       ├── analyzer.py             — Claude Opus 4.7 vision call
│       └── optimizer.py            — Claude Sonnet 4.6 final-report call
├── frontend/                       — TBD: merge from origin/frontend (Fabian's Vite/React skeleton)
├── .context/                       — knowledge base
│   ├── index.md                    — start here
│   ├── ARCHITECTURE.md             — canonical technical architecture
│   ├── RESEARCH.md                 — canonical research and open questions
│   ├── competitive-analysis.md     — competitor teardown
│   ├── links.md                    — external references
│   └── plans/
│       ├── principles.md
│       ├── project.md              — hackathon MVP + long-term vision
│       ├── team.md                 — team split
│       └── tools.md                — template (fill as we build)
├── .claude/
│   └── settings.json
└── .git/
```

## Working conventions
- Commit often with descriptive messages
- Push frequently — Claude pulls from `origin/master` to pick up teammates' work between turns
- Keep `.context/` updated as decisions land, but don't let documentation block code during the 3-hour hackathon
- The `.context/` directory IS tracked in git (despite the historical `.git/info/exclude` rule). Use `git add -f` for new files inside `.context/` if git ignores them.
- When adding or removing files/directories, update the repo structure tree in this file
- **Always use firecrawl CLI for web scraping/crawling** when installed and available (`firecrawl scrape`, `firecrawl search`). Prefer it over WebFetch. Output to `.firecrawl/` directory.

## Deployment
- **Target**: Unraid homelab (Tailscale IP 100.85.82.61) via Komodo stack orchestration
- **Domain**: yieldmaxxing.keanuc.net (Caddy reverse proxy on Oracle VPS)
- **CI/CD**: GitHub Actions → build Docker images → push to GHCR → Komodo auto-deploy
- **Secrets**: Never in git. Use Komodo `[[SECRET_NAME]]` interpolation or `.env` files
