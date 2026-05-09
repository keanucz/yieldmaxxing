// Format-accurate contracts. If these drift, the swap-to-real-backend promise breaks.

import type { Feature, FeatureCollection, Polygon } from "geojson";

// CROME (Crop Map of England) 2024 attributes — these are the public DEFRA fields.
export type LUCODE =
  | "AC01" // Wheat
  | "AC02" // Spring barley
  | "AC03" // Winter barley
  | "AC04" // Oats
  | "AC05" // Maize / Corn
  | "AC06" // Oilseed rape
  | "AC07" // Field beans
  | "AC08" // Sugar beet
  | "AC09" // Potatoes
  | "PG01" // Permanent grass
  | "TG01"; // Temporary grass

export interface CROMEProps {
  CROMEID: string; // "CG" + zero-padded id (real CROME uses RPA + Easting/Northing)
  LUCODE: LUCODE;
  REFDATE: string; // YYYY-MM-DD
  PROB: number; // 0..1, classification probability
}

export type FieldFeature = Feature<Polygon, CROMEProps>;

// Sentinel-2 NDVI capture metadata. Mirror of Sentinel Hub Process API output.
export interface NDVIStats {
  min: number;
  max: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface NDVICapture {
  capturedAt: string; // ISO8601, real S2 pass time over UK ~10:30 UTC
  pngUrl: string; // blob: URL for ImageOverlay
  ndviStats: NDVIStats;
  cloudCoverPct: number;
}

export type FertilizerProduct =
  | "Urea (46-0-0)"
  | "CAN 27%N"
  | "NPK 20-10-10"
  | "UAN 28%";

export type TractorModel =
  | "John Deere 6R"
  | "Fendt 700 Vario"
  | "Case IH Magnum"
  | "New Holland T7";

export type CropName =
  | "Corn (Zea mays)"
  | "Winter wheat"
  | "Spring barley"
  | "Oilseed rape";

export interface Field {
  id: string;
  name: string;
  slug: string;
  feature: FieldFeature; // CROME-shaped GeoJSON
  centroid: [number, number]; // [lat, lng]
  bbox: [number, number, number, number]; // [west, south, east, north]
  areaHa: number;
  crop: CropName;
  fertilizer: FertilizerProduct;
  tractor: TractorModel;
  plantedDate: string;
  ndviHistory: NDVICapture[];
  yieldZones: YieldZoneFeature[];
}

export interface YieldZoneProps {
  zone_id: number;
  yield_index: number; // 0..1
  band: "low" | "mid" | "high";
}
export type YieldZoneFeature = Feature<Polygon, YieldZoneProps>;

export interface PrescriptionZoneProps {
  zone_id: number; // 1..3 → maps to TZN id in ISOXML
  rate_kg_ha: number; // human-readable rate
  band: "skip" | "low" | "high";
}
export type PrescriptionZoneFeature = Feature<Polygon, PrescriptionZoneProps>;

export interface Prescription {
  fieldId: string;
  product: FertilizerProduct;
  generatedAt: string;
  zones: FeatureCollection<Polygon, PrescriptionZoneProps>;
  totalKg: number;
  treatedHa: number;
  skippedHa: number;
}

export interface Farm {
  id: string;
  name: string;
  ownerEmail: string;
  centroid: [number, number]; // [lat, lng]
  fields: Field[];
}
