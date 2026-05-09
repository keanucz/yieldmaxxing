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

## CROME Field Boundaries (PMTiles)

### What it is

CROME (Crop Map of England 2024) contains polygons for every agricultural field in England with crop type classification. We've converted it to PMTiles format for efficient vector tile serving.

### How to load PMTiles in Mapbox GL JS

```bash
npm install pmtiles mapbox-gl
```

```typescript
import mapboxgl from 'mapbox-gl';
import { Protocol } from 'pmtiles';

// Register PMTiles protocol (do once at app init)
const protocol = new Protocol();
mapboxgl.addProtocol('pmtiles', protocol.tile);

// In your map setup:
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: [-0.24, 52.57],
  zoom: 14,
});

map.on('load', () => {
  // Add CROME source — URL points to the PMTiles file
  map.addSource('crome', {
    type: 'vector',
    url: 'pmtiles:///data/crome.pmtiles',
  });

  // Render field boundaries as polygons
  map.addLayer({
    id: 'crome-fields-fill',
    type: 'fill',
    source: 'crome',
    'source-layer': 'crome',
    paint: {
      'fill-color': '#22c55e',
      'fill-opacity': 0.15,
    },
  });

  map.addLayer({
    id: 'crome-fields-outline',
    type: 'line',
    source: 'crome',
    'source-layer': 'crome',
    paint: {
      'line-color': '#16a34a',
      'line-width': 1.5,
    },
  });

  // Highlight on hover
  map.on('mousemove', 'crome-fields-fill', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    // Optionally set feature state for highlight
  });

  map.on('mouseleave', 'crome-fields-fill', () => {
    map.getCanvas().style.cursor = '';
  });

  // Click to select field
  map.on('click', 'crome-fields-fill', (e) => {
    if (!e.features?.length) return;
    const feature = e.features[0];
    const geometry = feature.geometry; // GeoJSON polygon
    const properties = feature.properties;
    // properties.luname = crop type (e.g. "Winter wheat", "Maize")
    // properties.cromeid = unique field ID

    // Use this geometry to:
    // 1. Highlight the selected field
    // 2. Compute bounding box for satellite fetch
    // 3. Pass to job creation
    onFieldSelected(feature);
  });
});
```

### Computing BBox from selected polygon

```typescript
import { bbox } from '@turf/bbox';

function onFieldSelected(feature: GeoJSON.Feature) {
  const [west, south, east, north] = bbox(feature);
  const center = [(west + east) / 2, (south + north) / 2];

  // Fetch NDVI for this field's extent
  const params = new URLSearchParams({
    lat: center[1].toString(),
    lon: center[0].toString(),
    radius_km: '1',
  });
  fetch(`/api/satellite/ndvi?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

### Serving the PMTiles file

Option 1: Go API serves it as a static file from `/data/crome.pmtiles`
Option 2: Place on CDN/S3 and point frontend URL directly at it
Option 3: During dev, `npx serve ./data` on a port

For hackathon demo, the Go API will serve it at `/data/crome.pmtiles` via Fiber static middleware.

---

## User Flow (implement in this order)

### Phase 1: Map + Postcode Search
1. Full-screen Mapbox GL map with satellite basemap
2. Search bar at top — farmer types postcode
3. On submit → `GET /api/geocode?postcode=X` → `map.flyTo({ center, zoom: 14 })`

### Phase 2: CROME Field Selection
4. Load PMTiles source (field boundaries appear as green outlines)
5. Click handler on field polygons → highlight selected → show crop type in sidebar
6. "Use this field" button stores the geometry

### Phase 3: Photo Upload + Analysis
7. Upload panel — drag & drop or camera capture
8. On submit → `POST /api/jobs` with location + photo
9. Poll `GET /api/jobs/:id` every 2s until status = `awaiting_annotation` or `complete`

### Phase 4: Results Display
10. Overlay NDVI PNG on map (use ImageOverlay with bbox coordinates)
11. Show diagnosis card (health score, issues, recommendations)
12. Show treatment recommendations table

### Phase 5: Manual Draw Fallback
13. Toggle "Draw custom boundary" activates `mapbox-gl-draw`
14. Farmer draws polygon → same flow as clicking CROME field

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
