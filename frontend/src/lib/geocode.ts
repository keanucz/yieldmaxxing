// Nominatim geocoding wrapper. GB-only, single-shot (no autocomplete).
// Cached in localStorage so demo is offline-resilient after first hit.

const CACHE_KEY = "yieldmaxxing.geocode.cache.v1";

interface GeocodeHit {
  lat: number;
  lng: number;
  display_name: string;
}

function readCache(): Record<string, GeocodeHit> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeCache(cache: Record<string, GeocodeHit>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

// Pre-seed the demo address so the demo never hits the network.
const SEEDS: Record<string, GeocodeHit> = {
  "anwick, lincolnshire": {
    lat: 53.073,
    lng: -0.302,
    display_name: "Anwick, Lincolnshire, England, United Kingdom",
  },
  anwick: {
    lat: 53.073,
    lng: -0.302,
    display_name: "Anwick, Lincolnshire, England, United Kingdom",
  },
};

export async function geocode(query: string): Promise<GeocodeHit | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (SEEDS[key]) return SEEDS[key];
  const cache = readCache();
  if (cache[key]) return cache[key];

  // Remote fallback (Nominatim)
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "gb");
    url.searchParams.set("limit", "1");
    const resp = await fetch(url.toString(), {
      headers: { "Accept-Language": "en-GB" },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) return null;
    const hit: GeocodeHit = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
    cache[key] = hit;
    writeCache(cache);
    return hit;
  } catch {
    return null;
  }
}
