"""Quick test to verify Sentinel Hub credentials and fetch a sample NDVI image."""

import os
import numpy as np
from dotenv import load_dotenv
from sentinelhub import (
    SHConfig,
    BBox,
    CRS,
    DataCollection,
    SentinelHubRequest,
    MimeType,
    bbox_to_dimensions,
)

load_dotenv()

cfg = SHConfig()
cfg.sh_client_id = os.environ["SH_CLIENT_ID"]
cfg.sh_client_secret = os.environ["SH_CLIENT_SECRET"]

# Kansas cornfield: lat=38.5, lon=-97.5
bbox = BBox(bbox=[-97.55, 38.45, -97.45, 38.55], crs=CRS.WGS84)
size = bbox_to_dimensions(bbox, resolution=60)  # low-res for fast test

NDVI_EVALSCRIPT = """
//VERSION=3
function setup() {
  return { input: ["B04","B08"], output: { bands: 1, sampleType: "FLOAT32" } };
}
function evaluatePixel(s) {
  return [(s.B08 - s.B04) / (s.B08 + s.B04 + 1e-10)];
}
"""

req = SentinelHubRequest(
    evalscript=NDVI_EVALSCRIPT,
    input_data=[
        SentinelHubRequest.input_data(
            data_collection=DataCollection.SENTINEL2_L2A,
            time_interval=("2024-07-01", "2024-07-31"),
            mosaicking_order="leastCC",
        )
    ],
    responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
    bbox=bbox,
    size=size,
    config=cfg,
)

print("Fetching NDVI from Sentinel Hub...")
data = np.squeeze(req.get_data()[0])
print(f"Success! Image shape: {data.shape}")
print(f"NDVI mean: {np.mean(data):.3f}, min: {np.min(data):.3f}, max: {np.max(data):.3f}")
