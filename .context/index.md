# Context Index

Entry point for understanding the project. Start here.

## Naming (effective)

- **Product / Go module / Postgres DB:** **CropGuard** (`github.com/hackathon/cropguard`, Fiber app name "CropGuard API")
- **GitHub repo + production domain:** **YieldMaxxing** (`keanucz/yieldmaxxing`, `yieldmaxxing.keanuc.net`)
- **Legacy:** **FarmWise** still appears in the docker-compose network name and the Python FastAPI app title — rename when convenient.

## What this project is

A precision-agriculture platform that diagnoses crop stress from a phone photo (Claude Vision), fetches Sentinel-2 NDVI for the field, lets the farmer annotate problem zones on the satellite image, and returns a precision treatment report with prioritized actions, cost estimates, and yield-impact projections. The hackathon MVP is **corn-only**. The pitched v2 layers on UK CROME field boundaries, multi-crop, ISOXML tractor export, and a supply-chain-aware fertiliser alternatives engine (Strait of Hormuz scenarios).

## Source-of-truth files

The two big ones — read first:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — single source of truth for the technical architecture. Reflects what's actually been scaffolded (Go API + Python LangGraph agents + Vite frontend orphan branch) and the agreed direction for new features. Open architectural decisions are listed at the bottom.
- **[RESEARCH.md](RESEARCH.md)** — single source of truth for research and analysis. Combines technical research (satellite APIs, ML models, ISOXML, UK CROME, fertiliser alternatives) with the long-term EU corn macro thesis and consolidated open questions.
- [competitive-analysis.md](competitive-analysis.md) — full teardown of Ackerprofi, OneSoil, Cropwise, FieldView, Corvian, PTx, xarvio, Yara, Plantix, Solvi. Comparative matrix and CropGuard's unique angles.

## Plans

How we're operating.

- [Principles](plans/principles.md) — vision and design principles (long-term)
- [Project](plans/project.md) — hackathon MVP scope + long-term vision, problem, goal, roadmap, success metrics
- [Team](plans/team.md) — who's working on what for the 3-hour build
- [Tools](plans/tools.md) — template for tool/component specs (fill as we build)

## References

- [Links](links.md) — external sources

## Direction we're going (one-paragraph recap)

Build a corn-first phone-photo + satellite NDVI diagnosis tool for the hackathon, on the Go (Fiber) + Postgres + Python LangGraph scaffold Keanu rewrote on top of Isaac's initial cut, wired to a Vite/React frontend (Fabian, currently on an orphan `frontend` branch — needs merging and OAuth wiring). Production stack already wired: Komodo on Unraid + Caddy on Oracle VPS, behind `yieldmaxxing.keanuc.net`. Pitch CropGuard as the only platform that combines phone-camera + satellite + supply-chain-aware fertiliser alternatives + UK-first localisation. Long-term, expand to the EU corn-belt smallholder market with a free, vendor-neutral, variable-rate-and-product fertility platform — a €480M–€720M/year preventable-fertiliser-waste opportunity. Two immediate decisions block clean execution: bounding-box vs polygon annotation, and how to merge Fabian's orphan frontend branch (and wire it through the new OAuth flow).
