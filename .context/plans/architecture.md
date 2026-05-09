# Architecture

**Status:** active

The stack, repo layout, auth model, and conventions for YieldMaxxing (cropguard).

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| API | Go (Fiber/Gin) | REST API, OAuth handling, JWT sessions |
| AI Agents | Python (FastAPI + LangGraph) | Crop analysis, fertiliser recommendations |
| Database | PostgreSQL 16 | User data, field/crop records |
| Containers | Docker | Multi-stage builds, GHCR registry |
| Orchestration | Komodo | Stack management on Unraid |
| Reverse Proxy | Caddy | TLS via Cloudflare DNS-01, on Oracle VPS |
| CI/CD | GitHub Actions | Build images, push GHCR, SSH deploy |

Key dependencies:
- `go-pkgz/auth` for Google OAuth2
- `anthropic` SDK (Python) for Claude-based crop analysis
- Sentinel Hub API for satellite imagery (`SH_CLIENT_ID`, `SH_CLIENT_SECRET`)

## Repo layout

```
cropguard/
├── go-api/                  # Go REST API service
│   ├── Dockerfile
│   ├── main.go
│   ├── handlers/            # HTTP route handlers
│   └── models/              # Data models
├── python-agents/           # Python AI agent service
│   ├── Dockerfile
│   ├── main.py              # FastAPI app entrypoint
│   ├── graph.py             # LangGraph agent definition
│   ├── nodes/               # Graph node implementations
│   └── knowledge/           # Domain knowledge for agents
├── docker-compose.yml       # Local development compose
├── docker-compose.prod.yml  # Production compose (GHCR images + postgres)
├── deploy/                  # Deployment config snippets
│   ├── caddy-snippet.txt    # Caddyfile block for reverse proxy
│   └── komodo-stack.toml    # Komodo resource definition
├── .github/workflows/
│   └── deploy.yml           # CI/CD: build, push, deploy
└── .context/plans/          # Architecture and planning docs
```

## Authentication & authorization

- **Provider:** Google OAuth2 via `go-pkgz/auth`
- **Flow:** Browser redirect to Google, callback at `/auth/callback`
- **Session:** JWT cookie issued after successful OAuth, signed with `JWT_SECRET`
- **Redirect URL:** `https://yieldmaxxing.keanuc.net/auth/callback`
- **Authorization:** All authenticated users have full access (single-tenant for hackathon demo)

## Data model

Core entities:
- **User** - Google account info, created on first login
- **Field** - Geographic area (polygon/point), belongs to a user
- **Analysis** - AI-generated crop analysis for a field, includes NDVI data and recommendations

## Conventions

- Go: standard library style, Gin/Fiber router, handler functions in `handlers/`
- Python: FastAPI for HTTP, LangGraph for agent orchestration, type hints everywhere
- Environment variables for all secrets (never hardcoded)
- Docker multi-stage builds for minimal production images

## Deployment

```
[GitHub Push to master]
        │
        ▼
[GitHub Actions CI/CD]
   ├── Build go-api image → ghcr.io/keanucz/yieldmaxxing-api:latest
   ├── Build python-agents image → ghcr.io/keanucz/yieldmaxxing-agents:latest
   └── SSH to Unraid → docker compose pull && up -d
        │
        ▼
[Unraid Server (100.85.82.61)]
   Komodo stack "yieldmaxxing"
   ├── yieldmaxxing-api      :8080
   ├── yieldmaxxing-agents   :8001
   └── yieldmaxxing-postgres :5432
        │
        ▼
[Oracle VPS - Caddy Reverse Proxy]
   yieldmaxxing.keanuc.net → 100.85.82.61:8080
   TLS via Cloudflare DNS-01
```

**Domain:** `yieldmaxxing.keanuc.net`

**Secrets managed in Komodo** (interpolated as `[[SECRET_NAME]]`):
- `YIELDMAXXING_DB_PASSWORD`
- `ANTHROPIC_API_KEY`
- `SH_CLIENT_ID` / `SH_CLIENT_SECRET`
- `YIELDMAXXING_GOOGLE_CLIENT_ID` / `YIELDMAXXING_GOOGLE_CLIENT_SECRET`
- `YIELDMAXXING_JWT_SECRET`

**GitHub Actions secret required:**
- `UNRAID_SSH_KEY` - SSH private key for root@100.85.82.61

## Open architectural questions

- Rate limiting strategy for the AI agents endpoint (token cost control)
- Whether to add a Redis cache layer for satellite imagery responses
- Migration strategy for PostgreSQL schema changes in production
