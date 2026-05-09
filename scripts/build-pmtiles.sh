#!/usr/bin/env bash
set -euo pipefail

# Build CROME 2024 PMTiles from GeoPackage
# Prerequisites: ogr2ogr (gdal), tippecanoe, pmtiles CLI
#
# Download CROME 2024 from:
#   https://environment.data.gov.uk/dataset/0903079b-35a2-47de-b805-77a0cc0c57bf
#
# Usage:
#   ./scripts/build-pmtiles.sh /path/to/CROME_2024_ENGLAND.gpkg

INPUT="${1:?Usage: $0 <path-to-crome.gpkg>}"
OUTDIR="$(dirname "$0")/../data"
mkdir -p "$OUTDIR"

echo ">>> Converting GeoPackage to GeoJSONSeq..."
ogr2ogr -f GeoJSONSeq \
  -select "cromeid,lucode,luname" \
  "$OUTDIR/crome.geojsonl" \
  "$INPUT"

echo ">>> Building PMTiles with tippecanoe..."
tippecanoe \
  -o "$OUTDIR/crome.pmtiles" \
  -zg \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  -l crome \
  --name "CROME 2024 England Field Boundaries" \
  --attribution "Contains Defra CROME data © Crown copyright" \
  "$OUTDIR/crome.geojsonl"

echo ">>> Cleaning up intermediate..."
rm -f "$OUTDIR/crome.geojsonl"

echo ">>> Done: $OUTDIR/crome.pmtiles"
ls -lh "$OUTDIR/crome.pmtiles"
