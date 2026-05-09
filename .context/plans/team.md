# Team

How we're splitting the 3-hour hackathon build.

## Members and roles

| Person | Area |
|--------|------|
| **Federico (Fede)** | Frontend |
| **Fabian** | Frontend |
| **Keanu** | Backend |
| **Isaac** | Backend |
| **Claude (this agent)** | 50/50 frontend ↔ backend, floats between both stacks as needed |

## How to brief Claude

Because this agent sits across both stacks, briefs should make clear which stack a task belongs to (or whether it spans both — e.g. wiring an API contract). When pairing:

- **Frontend tasks** (Fede / Fabian) — React + Vite + TypeScript components, Leaflet + react-leaflet integration, image upload UX, results panel, pipeline progress indicator, GeoJSON / PDF export, mobile responsiveness.
- **Backend tasks** (Keanu / Isaac) — FastAPI scaffold, Claude Vision worker, Sentinel Hub auth + NDVI fetch, recommendation worker, ISOXML export endpoint, CORS, error handling and fallback to cached tiles.
- **Cross-cutting** — API contract / Pydantic models that the frontend types must mirror; demo data prep; integration testing.

See `.context/ARCHITECTURE.md` §6 for the original hour-by-hour task breakdown that the team split was derived from. The Person 1–4 buckets there map onto our actual five-person team as follows:

- Person 1 (Frontend + Map) → Fede + Fabian, with Claude floating in
- Person 2 (Backend API + AI) → Keanu + Isaac, with Claude floating in
- Person 3 (Satellite + demo content) → split across Keanu / Isaac (satellite integration sits in the backend); demo content prep can be shared
- Person 4 (Demo prep + presentation) → shared at the end of Hour 2 / Hour 3

## Working norms

- Commit often with descriptive messages.
- Push frequently — Claude pulls from `origin/master` to pick up teammates' work between turns.
- Keep `.context/` updated as decisions land, but don't let documentation block code during the 3-hour window.
