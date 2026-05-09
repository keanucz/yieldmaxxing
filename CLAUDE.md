# CLAUDE.md — AI Agent Instructions

## What is this project?
A precision-agriculture platform that diagnoses crop stress from a phone photo (Claude Vision), fetches Sentinel-2 NDVI for the field, lets the farmer annotate problem zones on the satellite image, and returns a precision treatment report with prioritized actions, cost estimates, and yield-impact projections. Corn-only for the hackathon MVP. Pitched v2 adds UK CROME boundaries, multi-crop, ISOXML tractor export, and a supply-chain-aware fertiliser alternatives engine.

## Naming (heads-up)
- **GitHub repo:** `keanucz/yieldmaxxing`
- **Product / pitch:** **CropGuard**
- **Code identifier:** **FarmWise** (in `go.mod`, FastAPI app title, docker-compose service / network names)

Pick one. Until then, the three names map as above.

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
├── CLAUDE.md                       — Agent entry point
├── docker-compose.yml              — go-api + python-agents on the `farmwise` bridge net
├── .env.example                    — ANTHROPIC_API_KEY, SH_CLIENT_ID, SH_CLIENT_SECRET
├── go-api/                         — Go (Gin) public REST API on :8080
│   ├── Dockerfile
│   ├── go.mod                      — module: github.com/hackathon/farmwise
│   ├── main.go                     — router, CORS, /api/jobs routes
│   ├── handlers/jobs.go            — handlers + agent-service HTTP client
│   └── models/job.go               — Job, JobStatus, BoundingBox, SatelliteImages, CropAnalysis, FinalReport
├── python-agents/                  — Python FastAPI + LangGraph internal agent service on :8001
│   ├── Dockerfile
│   ├── requirements.txt            — fastapi, langgraph, anthropic, sentinelhub, pillow, numpy, dotenv
│   ├── main.py                     — FastAPI /run, /resume, /health
│   ├── graph.py                    — FarmState TypedDict, LangGraph build with annotation interrupt
│   ├── knowledge/corn.json         — corn agronomy knowledge base (diseases, NDVI signatures, treatments)
│   └── nodes/
│       ├── satellite.py            — Sentinel-2 RGB + NDVI fetch + stats
│       ├── analyzer.py             — Claude Opus 4.7 vision call
│       └── optimizer.py            — Claude Sonnet 4.6 final-report call
├── frontend/                       — TBD: Vite/React. Currently on origin/frontend orphan branch (Fabian); not merged to master.
├── .context/                       — Knowledge base
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
│   └── settings.json               — Claude Code project settings
└── .git/
```

## Working conventions
- Commit often with descriptive messages
- Push frequently — Claude pulls from `origin/master` to pick up teammates' work between turns
- Keep `.context/` updated as decisions land, but don't let documentation block code during the 3-hour hackathon
- The `.context/` directory IS tracked in git (despite the historical `.git/info/exclude` rule). Use `git add -f` for new files inside `.context/` if git ignores them.
- When adding or removing files/directories, update the repo structure tree in this file
