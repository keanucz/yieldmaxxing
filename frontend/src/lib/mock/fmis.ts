// Deterministic FMIS metadata generator — seeded from fieldId so the same
// field always gets the same variety, soil, history, etc. across reloads.

import { makeRng } from "./seed";
import type {
  CropName,
  Field,
  FieldActivity,
  GrowthStage,
  SoilType,
} from "../../types";

const VARIETIES: Record<CropName, string[]> = {
  "Corn (Zea mays)": [
    "Pioneer P0937AM",
    "DKC4717 (Dekalb)",
    "LG 31.272",
    "KWS Kazuar",
  ],
  "Winter wheat": [
    "KWS Extase",
    "Skyfall",
    "Crusoe",
    "Graham",
  ],
  "Spring barley": [
    "RGT Planet",
    "Laureate",
    "LG Diablo",
  ],
  "Oilseed rape": [
    "DK Exsteel",
    "LG Aviron",
    "Aurelia",
  ],
};

const SOILS: SoilType[] = [
  "Clay loam",
  "Sandy loam",
  "Silty clay",
  "Chalky loam",
  "Peat",
];

const PREVIOUS_CROPS: Array<CropName | "Cover crop"> = [
  "Winter wheat",
  "Spring barley",
  "Oilseed rape",
  "Corn (Zea mays)",
  "Cover crop",
];

// Approximate t/ha yield bands by crop (UK averages, rounded to one decimal)
const YIELD_BANDS: Record<CropName, [number, number]> = {
  "Corn (Zea mays)": [9.0, 12.0],
  "Winter wheat": [7.5, 10.5],
  "Spring barley": [5.5, 7.5],
  "Oilseed rape": [3.0, 4.5],
};

const SOWING_RATES: Record<CropName, [number, number]> = {
  "Corn (Zea mays)": [22, 28],
  "Winter wheat": [180, 220],
  "Spring barley": [150, 190],
  "Oilseed rape": [3, 5],
};

// Reference "today" used by the demo so the same artefacts replay forever.
// 2025-08-15 puts us mid-season for spring-sown corn / late-fill for winter wheat.
const DEMO_TODAY = new Date("2025-08-15T00:00:00Z");

export interface FmisData {
  variety: string;
  expectedHarvestDate: string;
  growthStage: GrowthStage;
  sowingRateKgHa: number;
  expectedYieldTHa: number;
  previousCrop: CropName | "Cover crop";
  soilType: SoilType;
  soilPh: number;
  organicMatterPct: number;
  lastActivity: FieldActivity;
}

export function buildFmisData(
  fieldId: string,
  crop: CropName,
  fertilizer: Field["fertilizer"],
  plantedDate: string,
): FmisData {
  const rng = makeRng("fmis", fieldId);

  const varietyChoices = VARIETIES[crop] ?? VARIETIES["Corn (Zea mays)"];
  const variety = varietyChoices[Math.floor(rng() * varietyChoices.length)];

  const soilType = SOILS[Math.floor(rng() * SOILS.length)];
  const soilPh = round(5.8 + rng() * 1.4, 1); // 5.8 – 7.2
  const organicMatterPct = round(2.4 + rng() * 3.2, 1); // 2.4 – 5.6 %

  const previousCrop =
    PREVIOUS_CROPS[Math.floor(rng() * PREVIOUS_CROPS.length)];

  const [yLo, yHi] = YIELD_BANDS[crop] ?? [6, 9];
  const expectedYieldTHa = round(yLo + rng() * (yHi - yLo), 1);

  const [sLo, sHi] = SOWING_RATES[crop] ?? [180, 220];
  const sowingRateKgHa = Math.round(sLo + rng() * (sHi - sLo));

  const expectedHarvestDate = computeHarvestDate(crop, plantedDate);
  const growthStage = computeGrowthStage(crop, plantedDate, DEMO_TODAY);
  const lastActivity = pickLastActivity(crop, fertilizer, plantedDate, rng);

  return {
    variety,
    expectedHarvestDate,
    growthStage,
    sowingRateKgHa,
    expectedYieldTHa,
    previousCrop,
    soilType,
    soilPh,
    organicMatterPct,
    lastActivity,
  };
}

function computeHarvestDate(crop: CropName, planted: string): string {
  // Rough UK windows
  const yearGuess = parsePlantedYear(planted);
  switch (crop) {
    case "Corn (Zea mays)":
      return `${yearGuess + (planted.toLowerCase().includes("october") ? 1 : 0)}-10-05`;
    case "Winter wheat":
      return `${yearGuess + (planted.toLowerCase().includes("october") ? 1 : 0)}-08-10`;
    case "Spring barley":
      return `${yearGuess}-08-25`;
    case "Oilseed rape":
      return `${yearGuess + 1}-07-25`;
    default:
      return `${yearGuess}-09-01`;
  }
}

function computeGrowthStage(
  crop: CropName,
  planted: string,
  today: Date,
): GrowthStage {
  const sown = approxPlantedDate(planted);
  const days = Math.floor(
    (today.getTime() - sown.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return "Pre-sowing";
  if (crop === "Corn (Zea mays)") {
    if (days < 14) return "Emergence";
    if (days < 50) return "Stem extension";
    if (days < 90) return "Flowering";
    if (days < 130) return "Grain fill";
    return "Maturity";
  }
  if (crop === "Winter wheat") {
    if (days < 30) return "Emergence";
    if (days < 150) return "Tillering";
    if (days < 220) return "Stem extension";
    if (days < 260) return "Heading";
    if (days < 300) return "Grain fill";
    return "Maturity";
  }
  if (crop === "Spring barley") {
    if (days < 14) return "Emergence";
    if (days < 60) return "Tillering";
    if (days < 90) return "Heading";
    if (days < 120) return "Grain fill";
    return "Maturity";
  }
  if (crop === "Oilseed rape") {
    if (days < 30) return "Emergence";
    if (days < 200) return "Stem extension";
    if (days < 240) return "Flowering";
    return "Grain fill";
  }
  return "Stem extension";
}

function pickLastActivity(
  crop: CropName,
  fertilizer: Field["fertilizer"],
  planted: string,
  rng: () => number,
): FieldActivity {
  const sown = approxPlantedDate(planted);
  // Most recent activity = a fertilization or scouting pass roughly 4–8 weeks ago
  const daysAgo = 14 + Math.floor(rng() * 35);
  const date = new Date(DEMO_TODAY.getTime() - daysAgo * 86400000)
    .toISOString()
    .slice(0, 10);
  if (rng() < 0.55) {
    const rate = 80 + Math.floor(rng() * 140);
    return {
      date,
      kind: "Fertilization",
      detail: `${fertilizer.split(" ")[0]} ${rate} kg/ha`,
    };
  }
  if (rng() < 0.7) {
    return {
      date,
      kind: "Scouting",
      detail: `Walked ${crop.split(" ")[0].toLowerCase()} — pest pressure low`,
    };
  }
  return {
    date: sown.toISOString().slice(0, 10),
    kind: "Sowing",
    detail: `Drilled ${crop.split(" ")[0].toLowerCase()}`,
  };
}

function parsePlantedYear(planted: string): number {
  const m = planted.match(/(\d{4})/);
  return m ? Number(m[1]) : 2025;
}

function approxPlantedDate(planted: string): Date {
  // Accept "April 2025", "October 2024", "2025-04-12", etc.
  const iso = planted.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(iso[0]);
  const months: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const lower = planted.toLowerCase();
  const yr = parsePlantedYear(planted);
  for (const key of Object.keys(months)) {
    if (lower.includes(key)) return new Date(Date.UTC(yr, months[key], 15));
  }
  return new Date(Date.UTC(yr, 3, 15));
}

function round(v: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
