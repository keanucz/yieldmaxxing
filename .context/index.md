# Context Index

Entry point for understanding the project. Start here.

## Naming

- **GitHub repo:** `keanucz/yieldmaxxing`
- **Product / pitch:** **CropGuard**
- **Code identifier (legacy, in `go.mod`, FastAPI titles, docker-compose):** **FarmWise**

Three names is one too many — the team needs to pick one. Until then, treat **YieldMaxxing = repo, CropGuard = product, FarmWise = code identifier**.

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

Build a corn-first phone-photo + satellite NDVI diagnosis tool for the hackathon, on the existing Go API + Python LangGraph scaffold (Isaac), wired to a Vite/React frontend (Fabian, currently on an orphan `frontend` branch — needs merging). Pitch CropGuard as the only platform that combines phone-camera + satellite + supply-chain-aware fertiliser alternatives + UK-first localisation. Long-term, expand to the EU corn-belt smallholder market with a free, vendor-neutral, variable-rate-and-product fertility platform — a €480M–€720M/year preventable-fertiliser-waste opportunity. Three immediate decisions block clean execution: pick a project name, decide bounding-box vs polygon annotation, and decide how to merge Fabian's orphan frontend branch.
