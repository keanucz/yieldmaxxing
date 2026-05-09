# Project

What we're building, why, and the scope.

> **Two horizons.** The 3-hour hackathon MVP narrows to UK farms, multi-crop, with a phone-camera + satellite + supply-chain-disruption angle (see `.context/ARCHITECTURE.md` and `.context/RESEARCH.md` — both authored by Keanu and canonical for the build). The long-term vision below is the broader EU-corn smallholder play that this MVP is a wedge into.

---

## Hackathon MVP (now — 3 hours)

**One-liner:** Phone photo of a sick crop + UK postcode → Claude Vision diagnosis, Sentinel-2 NDVI overlay on a Leaflet map, farmer draws their field, get a fertiliser recommendation with supply-chain-aware alternatives, export an ISOXML prescription map for the tractor.

**Killer differentiators (per `.context/competitive-analysis.md`):**
- Phone camera + satellite fusion (Plantix does camera only; OneSoil does satellite only — nobody combines)
- Supply-chain disruption intelligence — fertiliser alternatives engine for Strait of Hormuz / sanctions / shock scenarios (zero competitors do this)
- UK-first localisation (CROME field boundaries, postcodes.io, AHDB RB209 reference rates, UK-available alternatives like CAN, digestate, polyhalite)
- Vendor-neutral (YaraPlus pushes Yara, xarvio pushes BASF; we recommend the best option regardless of brand)

**MVP scope checklist:**

- [ ] Image upload (drag-and-drop or camera) + crop type dropdown (wheat, maize, barley, potato, etc.)
- [ ] Worker 1 — Claude Vision: image + crop → JSON `{disease_name, confidence, affected_nutrients, severity, description, visual_symptoms}`
- [ ] Location input: UK postcode (postcodes.io geocoding) or click-on-map
- [ ] Worker 2 — Sentinel Hub Process API: bbox → rendered NDVI PNG (server-side evalscript)
- [ ] Leaflet map with NDVI overlay + leaflet-draw polygon tool for field boundary
- [ ] Worker 3 — Claude (text): crop analysis + NDVI stats + boundary + crop type → fertiliser recommendation with primary + alternatives + supply-chain risk
- [ ] Export: GeoJSON + ISOXML ZIP (tractor-ready, via `pip install isoxml`) + PDF summary
- [ ] Visible pipeline progress indicator (Vision ✓ → Satellite ✓ → NDVI ✓ → Recommendation)
- [ ] Demo fallbacks: 4 pre-cached NDVI tiles for UK locations (Lincolnshire, East Anglia, Yorkshire, Somerset), cached Claude response, manual lat/lng input if postcode API fails

Hour-by-hour breakdown lives in `.context/ARCHITECTURE.md` §6. Team assignments in `plans/team.md`.

**Out of scope for the 3-hour MVP:**
- User accounts / auth (stateless demo)
- Persistent database (in-memory, session only)
- Real-time / time-series satellite history
- ISO-XML compatibility QA across spreader brands
- Soil-data integrations beyond hardcoded regional defaults
- Localisation beyond English (long-term vision targets IT/FR/ES/DE/PL/RO)
- Crops outside the demo dropdown
- Mobile-native app (mobile-responsive web only)

---

## Long-term vision (post-hackathon)

The original product thesis is a free, satellite-first, fertilizer-agnostic prescription platform for European corn growers, expanding to other crops and non-EU smallholder markets over time. The hackathon MVP is the wedge: phone-camera diagnosis + supply-chain alternatives is a trojan horse for the broader variable-rate-and-product fertility platform.

### Long-term problem

European corn growers are quitting because uniform fertilizer application no longer pencils out at 2026 prices.

- ~150–200 kg N/ha, 50–100 kg P₂O₅/ha, 50–100 kg K₂O/ha — most fertilizer-intensive grain crop in Europe.
- ~€286/ha total fertilizer spend (Farmdesk NL); 13–14% of a French grain farmer's per-hectare budget (Argus).
- Urea retail +27% in a single month (DTN Apr 2026); World Bank projects another +60% in 2026; EU prices 10–15% above 2025.
- EU grain maize area projected below 8M hectares for the first time this century. France alone projected to lose 10–15% of corn area (~200,000 ha) in 2026 (AGPM).

Within-field response to N can swing from near-zero to double-digit yield gains across the same plot. Different zones also need different *fertilizers* (MAP not DAP on calcareous patches, CAN not urea on waterlogged corners, SOP not MOP for chloride-sensitive end-uses, ammonium-based forms on cool clay in spring). Today every farmer picks one bag and spreads it everywhere.

### Long-term goal

Tell every European corn grower exactly **which fertilizer to apply where, at what rate, and when** — for free — using only a smartphone or laptop.

### Long-term roadmap

**Phase 1 (post-hackathon v1):** Grain maize, EU. Top 6 producers cover ~80% of EU production: France (~12M tons/year), Romania, Poland, Hungary, Germany, Italy. Free baseline product fusing Sentinel-2 + LUCAS + Copernicus + DEM. Localise to IT, FR, ES, DE, PL, RO.

**Phase 2:** Silage maize, wheat, barley, sunflower. Optional integrations matured: lab soil tests (manual upload + partner integrations), yield maps from combine telemetry (CSV / ISO-XML), drone/UAV multispectral, soil moisture and EC sensors, tractor-mounted N-sensors, phone photos for ground-truth on visible deficiencies and disease.

**Phase 3:** Non-EU markets with similar smallholder structure: Ukraine, Turkey, North Africa, Brazilian smaller producers.

### Long-term success metrics

For a representative 50-hectare EU corn farm:
- 20–30% reduction in N applied (validated in EU and US variable-rate N trials)
- 5–15% yield uplift on responsive zones (peer-reviewed precision-ag meta-analyses)
- €60–€90/ha fertilizer cost savings at current prices
- Total: €3,000–€4,500/year saved on a 50-ha farm, before yield uplift

EU-wide across ~8M corn hectares: **€480M–€720M/year of preventable fertilizer waste recoverable**, with parallel reductions in nitrate runoff and N₂O emissions aligned with EU Green Deal and CAP eco-scheme targets.
