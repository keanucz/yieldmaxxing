# Frontend CLAUDE.md — Instructions for Frontend AI Agents

## What this frontend does

Interactive map-based UI where a UK farmer:
1. Enters their postcode → map zooms to their area
2. Sees real CROME field boundaries rendered as vector tile polygons
3. Clicks a field polygon to select it (or draws a custom boundary)
4. Uploads a crop photo for AI analysis
5. Views NDVI satellite overlay + diagnosis + treatment recommendations

## Stack

- **Framework**: React + Vite + TypeScript
- **Map**: Mapbox GL JS (vector tiles, smooth zoom, native PMTiles support)
- **Drawing**: `@mapbox/mapbox-gl-draw` for custom polygon input
- **State**: React state or zustand (keep simple for hackathon)
- **Styling**: Tailwind CSS

## Backend API (already built, running on :8080)

### `GET /api/geocode?postcode=PE73HJ` (no auth required)

Converts UK postcode to coordinates. Use this when farmer types a postcode.

```json
{
  "postcode": "PE7 3HJ",
  "lat": 52.5731,
  "lon": -0.2442,
  "bbox": {
    "West": -0.2802,
    "South": 52.5551,
    "East": -0.2082,
    "North": 52.5911
  },
  "district": "Peterborough",
  "county": ""
}
```

### `GET /api/fields?lat=X&lon=Y&radius_km=0.5&county=lincolnshire` (no auth required)

Returns GeoJSON FeatureCollection of CROME 2025 field boundary polygons near a point.
This is a live proxy to the UK gov CROME OGC Features API — no local data needed.

Query params:
- `lat`, `lon` — centre point (required)
- `radius_km` — search radius, default 0.5, max 5
- `county` — English county name lowercase (e.g. "lincolnshire", "cambridgeshire"). Resolved from postcodes.io `county` field.
- `limit` — max features, default 200, max 1000

Response: standard GeoJSON FeatureCollection. Each feature has:
- `geometry` — Polygon or MultiPolygon (field boundary)
- `properties.cromeid` — unique field ID
- `properties.lucode` — land use code (e.g. "AC63" = Winter Wheat)
- `properties.prob` — classification probability (0-1)
- `properties.county` — county abbreviation

Example usage:
```typescript
const geocodeResp = await fetch('/api/geocode?postcode=LN4+4TQ');
const { lat, lon, county } = await geocodeResp.json();

const fieldsResp = await fetch(`/api/fields?lat=${lat}&lon=${lon}&radius_km=0.5&county=${county.toLowerCase()}`);
const geojson = await fieldsResp.json();
// geojson.features = array of field polygons → render on map
```

---

### `GET /api/satellite/ndvi?lat=X&lon=Y&radius_km=1` (requires JWT)

Returns **raw PNG** (image/png content-type) of NDVI colour-mapped satellite imagery.
Response header `X-BBox` contains the bounding box used.

Query params:
- `lat`, `lon` — centre point (required)
- `radius_km` — default 1.0
- `width`, `height` — pixel dimensions, default 512
- `date_start`, `date_end` — ISO dates, default last 30 days

### `GET /api/satellite/rgb?lat=X&lon=Y&radius_km=1` (requires JWT)

Same as NDVI but returns true-colour satellite image.

### `POST /api/jobs` (requires JWT)

Start analysis pipeline. Send after farmer selects field + uploads photo.

```json
{
  "location": {"lat": 52.57, "lon": -0.24, "name": "My Field"},
  "date_start": "2026-04-01",
  "date_end": "2026-05-09",
  "crop_image_base64": "<base64 jpeg>"
}
```

### `GET /api/jobs/:id` (requires JWT)

Poll for job status. Statuses: `pending` → `fetching_satellite` → `analyzing` → `awaiting_annotation` → `optimizing` → `complete`

---

## CROME Field Boundaries (Live API)

### What it is

CROME 2025 (Crop Map of England) contains polygons for every agricultural field in England with crop type classification. The Go backend proxies the UK gov OGC Features API — no local data files needed.

### How to use it

After geocoding a postcode, call `/api/fields` with the lat/lon and county. The backend returns a standard GeoJSON FeatureCollection that you render directly as a Mapbox GL source.

```typescript
import mapboxgl from 'mapbox-gl';
import { bbox } from '@turf/bbox';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-0.24, 52.57],
  zoom: 14,
});

map.on('load', () => {
  // GeoJSON source — starts empty, filled after geocode + fields fetch
  map.addSource('crome-fields', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'crome-fill',
    type: 'fill',
    source: 'crome-fields',
    paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.2 },
  });

  map.addLayer({
    id: 'crome-outline',
    type: 'line',
    source: 'crome-fields',
    paint: { 'line-color': '#16a34a', 'line-width': 2 },
  });

  // Click to select field
  map.on('click', 'crome-fill', (e) => {
    if (!e.features?.length) return;
    const feature = e.features[0];
    onFieldSelected(feature);
  });
});

// After geocode, fetch and display fields:
async function loadFields(lat: number, lon: number, county: string) {
  const resp = await fetch(
    `/api/fields?lat=${lat}&lon=${lon}&radius_km=0.5&county=${county.toLowerCase()}`
  );
  const geojson = await resp.json();
  map.getSource('crome-fields').setData(geojson);
}

function onFieldSelected(feature: GeoJSON.Feature) {
  const [west, south, east, north] = bbox(feature);
  const center = [(west + east) / 2, (south + north) / 2];

  // Fetch NDVI for this field's bounding box
  const params = new URLSearchParams({
    lat: center[1].toString(),
    lon: center[0].toString(),
    radius_km: '1',
  });
  fetch(`/api/satellite/ndvi?${params}`, { credentials: 'include' });
}
```

### Key points
- No PMTiles, no local files — all live from gov.uk via Go backend proxy
- Fields load on-demand after postcode geocode (typically 50-500 polygons)
- Each feature has `cromeid`, `lucode`, `prob`, `county` in properties
- County is required — get it from the geocode response

---

## User Flow (implement in this order)

### Phase 1: Map + Postcode Search
1. Full-screen Mapbox GL map with satellite basemap
2. Search bar at top — farmer types postcode
3. On submit → `GET /api/geocode?postcode=X` → `map.flyTo({ center, zoom: 14 })`

### Phase 2: CROME Field Selection
4. After flyTo, call `GET /api/fields` with lat/lon/county from geocode response
5. Set GeoJSON source data → field boundaries render as green polygons
6. Click handler → highlight selected → show crop type in sidebar
7. "Use this field" button stores the geometry

### Phase 3: Photo Upload + Analysis
8. Upload panel — drag & drop or camera capture
9. On submit → `POST /api/jobs` with location + photo
10. Poll `GET /api/jobs/:id` every 2s until status = `awaiting_annotation` or `complete`

### Phase 4: Results Display
11. Overlay NDVI PNG on map (use ImageOverlay with bbox coordinates from X-BBox header)
12. Show diagnosis card (health score, issues, recommendations)
13. Show treatment recommendations table

### Phase 5: Manual Draw Fallback
14. Toggle "Draw custom boundary" activates `mapbox-gl-draw`
15. Farmer draws polygon → same flow as clicking CROME field

---

## Key Files to Create

```
frontend/
├── src/
│   ├── components/
│   │   ├── Map.tsx              — Mapbox GL + PMTiles + draw
│   │   ├── PostcodeSearch.tsx   — Input + geocode call
│   │   ├── FieldInfo.tsx        — Selected field details sidebar
│   │   ├── PhotoUpload.tsx      — Drag & drop image upload
│   │   ├── ResultsPanel.tsx     — Diagnosis + recommendations
│   │   └── NDVIOverlay.tsx      — Satellite image overlay on map
│   ├── hooks/
│   │   ├── useGeocoding.ts      — postcode → coords
│   │   ├── useSatellite.ts      — NDVI/RGB fetch
│   │   └── useJob.ts            — job creation + polling
│   ├── lib/
│   │   └── api.ts               — fetch wrapper with JWT
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── index.html
```

## Environment Variables

```env
VITE_API_URL=http://localhost:8080
VITE_MAPBOX_TOKEN=<get from mapbox.com — free tier is fine>
VITE_PMTILES_URL=/data/crome.pmtiles
```

## Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "mapbox-gl": "^3.9.0",
    "pmtiles": "^4.0.0",
    "@mapbox/mapbox-gl-draw": "^1.4.3",
    "@turf/bbox": "^7.0.0",
    "@turf/center": "^7.0.0"
  }
}
```

## Auth Notes

- Backend uses HTTP-only JWT cookie set after Google OAuth
- For local dev, hit `http://localhost:8080/auth/login` in browser first
- Token is sent automatically via cookie (credentials: 'include' in fetch)
- The geocode endpoint does NOT require auth (public)
- All `/api/*` endpoints require the JWT cookie
