# CLAUDE.md — AI Agent Instructions

## What is this project?
_TODO — one-paragraph description of what cropguard is, who it's for, and the problem it solves._

## Read context first
Before doing any work, read `.context/index.md` — it explains the project and links to all plans and research.

## Repo structure
```
cropguard/
├── CLAUDE.md                  — Agent entry point
├── .context/                  — Knowledge base
│   ├── index.md
│   ├── links.md
│   ├── plans/
│   │   ├── principles.md
│   │   ├── project.md
│   │   ├── architecture.md
│   │   └── tools.md
│   └── research/
├── .claude/
│   └── settings.json          — Claude Code project settings
└── .git/
```

## Working conventions
- Commit often with descriptive messages
- Keep `.context/` updated as the project evolves
- Document research and decisions in `.context/research/`
- When adding or removing files/directories, update the repo structure tree in this file
- **Always use firecrawl CLI for web scraping/crawling** when installed and available (`firecrawl scrape`, `firecrawl search`). Prefer it over WebFetch. Output to `.firecrawl/` directory.

## Deployment
- **Target**: Unraid homelab (Tailscale IP 100.85.82.61) via Komodo stack orchestration
- **Domain**: yieldmaxxing.keanuc.net (Caddy reverse proxy on Oracle VPS)
- **CI/CD**: GitHub Actions → build Docker images → push to GHCR → Komodo auto-deploy
- **Secrets**: Never in git. Use Komodo `[[SECRET_NAME]]` interpolation or `.env` files
