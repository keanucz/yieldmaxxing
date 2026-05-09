// ISOXML 4.3 prescription zip generator. Produces a zip containing:
//   TASKDATA/TASKDATA.XML  — the task definition + grid metadata
//   TASKDATA/GRD00001.BIN  — Type 2 grid: row-major little-endian Int32, value=TZN id
//
// Format: ISO 11783-10. DDI 0006 = "Application Rate Mass per Area" (mg/m²).
// 120 kg/ha == 12000 mg/m². See dev4Agriculture/isoxml-js docs and isoxml.tools.
//
// Why hand-roll instead of `isoxml` npm: avoids Node Buffer assumptions in the
// browser, and the schema we need is tiny. Output validates in standard
// ISOXML viewers.

import JSZip from "jszip";
import type {
  Field,
  Prescription,
  PrescriptionZoneFeature,
  CROMEProps,
} from "../types";

const GRID_COLS = 4; // matches our 4×4 prescription cells
const GRID_ROWS = 4;

interface ZoneSummary {
  id: number;
  rate_kg_ha: number;
  band: string;
}

export async function generatePrescriptionZip(
  field: Field,
  prescription: Prescription,
): Promise<Blob> {
  const xml = buildTaskDataXML(field, prescription);
  const grid = buildGridBin(prescription);

  const zip = new JSZip();
  const folder = zip.folder("TASKDATA")!;
  folder.file("TASKDATA.XML", xml);
  folder.file("GRD00001.BIN", grid);

  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

// Generate a download for a Blob.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the download starts cleanly
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildTaskDataXML(field: Field, rx: Prescription): string {
  const ring = field.feature.geometry.coordinates[0];
  const props = field.feature.properties as CROMEProps;
  const [west, south, east, north] = field.bbox;

  // SW origin
  const swLat = south;
  const swLng = west;
  // Cell size in degrees
  const cellLat = (north - south) / GRID_ROWS;
  const cellLng = (east - west) / GRID_COLS;

  // Distinct zones with their rates (rate in mg/m² for DDI 0006: kg/ha × 100)
  const zoneMap = new Map<number, ZoneSummary>();
  for (const f of rx.zones.features) {
    const p = f.properties;
    if (!zoneMap.has(p.zone_id)) {
      zoneMap.set(p.zone_id, {
        id: p.zone_id,
        rate_kg_ha: p.rate_kg_ha,
        band: p.band,
      });
    }
  }
  // Build TZN list — *only* zones we actually use
  const usedZoneIds = new Set<number>();
  for (const f of rx.zones.features) usedZoneIds.add(f.properties.zone_id);

  const tznXml = [...zoneMap.values()]
    .filter((z) => usedZoneIds.has(z.id))
    .map(
      (z) =>
        `    <TZN A="${z.id}" B="${escapeAttr(zoneLabel(z))}">\n` +
        `      <PDV A="0006" B="${Math.round(z.rate_kg_ha * 100)}" C="PDT1"/>\n` +
        `    </TZN>`,
    )
    .join("\n");

  const polyXml = ring
    .map(
      ([lng, lat]) =>
        `        <PNT A="2" C="${lat.toFixed(7)}" D="${lng.toFixed(7)}"/>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ISO11783_TaskData VersionMajor="4" VersionMinor="3"
                   ManagementSoftwareManufacturer="CropGuard"
                   ManagementSoftwareVersion="1.0"
                   DataTransferOrigin="1">
  <CTR A="CTR1" B="${escapeAttr(field.name + " owner")}"/>
  <FRM A="FRM1" B="Manor Farm" I="CTR1"/>
  <PFD A="PFD1" C="${escapeAttr(field.name)}" D="${Math.round(field.areaHa * 10_000)}" E="FRM1" F="CTR1">
    <PLN A="1">
      <LSG A="1">
${polyXml}
      </LSG>
    </PLN>
  </PFD>
  <PDT A="PDT1" B="${escapeAttr(rx.product)}" F="1"/>
  <TSK A="TSK1" B="${escapeAttr("VRA " + rx.product + " " + rx.generatedAt.slice(0, 10))}" C="CTR1" E="FRM1" F="PFD1" G="1">
    <GRD A="${swLat.toFixed(7)}" B="${swLng.toFixed(7)}" C="${cellLat.toFixed(7)}" D="${cellLng.toFixed(7)}" E="${GRID_COLS}" F="${GRID_ROWS}" G="GRD00001" I="2"/>
${tznXml}
  </TSK>
  <!-- crome:${props.CROMEID} lucode:${props.LUCODE} -->
</ISO11783_TaskData>`;
}

function zoneLabel(z: ZoneSummary): string {
  return z.band === "skip"
    ? "Skip zone"
    : z.band === "low"
      ? `Maintenance ${z.rate_kg_ha} kg/ha`
      : `High rate ${z.rate_kg_ha} kg/ha`;
}

function buildGridBin(rx: Prescription): Uint8Array {
  // Type 2 grid: 32-bit signed int per cell, row-major, SW origin (row 0 = south).
  // We stored zones row-major north-to-south. Reverse rows so row 0 = south.
  const cells: PrescriptionZoneFeature[] = rx.zones.features;
  // Original layout: row 0 = north, row NY-1 = south. Reverse rows.
  const reordered: number[] = new Array(GRID_COLS * GRID_ROWS);
  for (let cy = 0; cy < GRID_ROWS; cy++) {
    for (let cx = 0; cx < GRID_COLS; cx++) {
      const srcIdx = cy * GRID_COLS + cx;
      const dstRow = GRID_ROWS - 1 - cy; // flip vertical
      reordered[dstRow * GRID_COLS + cx] = cells[srcIdx].properties.zone_id;
    }
  }
  const buf = new ArrayBuffer(reordered.length * 4);
  const view = new DataView(buf);
  for (let i = 0; i < reordered.length; i++) {
    view.setInt32(i * 4, reordered[i], true); // little-endian
  }
  return new Uint8Array(buf);
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
