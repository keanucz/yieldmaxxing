// Frozen seed config for the demo farm. Don't change unless you want to retell
// the demo story differently — every polygon and NDVI capture derives from this.

export const DEMO_FARM = {
  id: "manor-farm",
  name: "Manor Farm",
  ownerEmail: "fede@manorfarm.uk",
  // Anwick, Lincolnshire — flat arable corn-belt, photogenic at zoom 14
  centroid: [53.073, -0.302] as [number, number],
  // Field metadata. Polygons are seeded from the centroid + this offset.
  fields: [
    {
      id: "north-cobb",
      name: "North Cobb",
      offset: [0.0085, -0.012] as [number, number],
      crop: "Corn (Zea mays)" as const,
      lucode: "AC05" as const,
      fertilizer: "Urea (46-0-0)" as const,
      tractor: "John Deere 6R" as const,
      plantedDate: "April 2025",
      // Used as a story bias on the NDVI noise — a "low corner"
      problemBias: { x: 0.18, y: 0.78, strength: 0.45 },
    },
    {
      id: "south-meadow",
      name: "South Meadow",
      offset: [-0.006, 0.005] as [number, number],
      crop: "Corn (Zea mays)" as const,
      lucode: "AC05" as const,
      fertilizer: "CAN 27%N" as const,
      tractor: "Fendt 700 Vario" as const,
      plantedDate: "April 2025",
      problemBias: { x: 0.72, y: 0.4, strength: 0.22 },
    },
    {
      id: "long-acre",
      name: "Long Acre",
      offset: [0.001, 0.011] as [number, number],
      crop: "Corn (Zea mays)" as const,
      lucode: "AC05" as const,
      fertilizer: "NPK 20-10-10" as const,
      tractor: "John Deere 6R" as const,
      plantedDate: "April 2025",
      problemBias: { x: 0.5, y: 0.5, strength: 0.18 },
    },
    {
      id: "mill-piece",
      name: "Mill Piece",
      offset: [-0.011, -0.008] as [number, number],
      crop: "Winter wheat" as const,
      lucode: "AC02" as const,
      fertilizer: "Urea (46-0-0)" as const,
      tractor: "Case IH Magnum" as const,
      plantedDate: "October 2024",
      problemBias: { x: 0.85, y: 0.2, strength: 0.28 },
    },
    {
      id: "church-close",
      name: "Church Close",
      offset: [0.013, 0.003] as [number, number],
      crop: "Winter wheat" as const,
      lucode: "AC02" as const,
      fertilizer: "UAN 28%" as const,
      tractor: "New Holland T7" as const,
      plantedDate: "October 2024",
      problemBias: { x: 0.3, y: 0.65, strength: 0.2 },
    },
  ],
};

// 12-month NDVI capture distribution, weighted to summer (UK-realistic).
// Each entry = (month 0-11, count). Real Sentinel-2 cloud-free passes over UK.
export const CAPTURE_DISTRIBUTION: Array<[number, number]> = [
  [0, 0], // Jan
  [1, 1], // Feb
  [2, 1], // Mar
  [3, 2], // Apr
  [4, 3], // May
  [5, 3], // Jun
  [6, 3], // Jul
  [7, 2], // Aug
  [8, 2], // Sep
  [9, 1], // Oct
  [10, 0], // Nov
  [11, 0], // Dec
];

export const ANCHOR_YEAR = 2025;

// Forced cloudy capture index for "cloud cover UX" demo
export const CLOUDY_CAPTURE_INDEX = 11;

export type DemoFieldSeed = (typeof DEMO_FARM.fields)[number];
