"""Fetches RGB + NDVI imagery from Sentinel Hub for a given location and date range."""

import os
import base64
import numpy as np
from datetime import datetime
from sentinelhub import (
    SHConfig,
    BBox,
    CRS,
    DataCollection,
    SentinelHubRequest,
    MimeType,
    bbox_to_dimensions,
)

from state import FarmState


def _build_config() -> SHConfig:
    cfg = SHConfig()
    cfg.sh_client_id = os.environ["SH_CLIENT_ID"]
    cfg.sh_client_secret = os.environ["SH_CLIENT_SECRET"]
    cfg.sh_base_url = "https://services.sentinel-hub.com"
    return cfg


def _lat_lon_to_bbox(lat: float, lon: float, radius_deg: float = 0.05) -> BBox:
    """Create a BBox centred on the farm location. ~5km radius at mid-latitudes."""
    return BBox(
        bbox=[lon - radius_deg, lat - radius_deg, lon + radius_deg, lat + radius_deg],
        crs=CRS.WGS84,
    )


RGB_EVALSCRIPT = """
//VERSION=3
function setup() {
  return { input: ["B04","B03","B02"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  return [3.5*sample.B04, 3.5*sample.B03, 3.5*sample.B02];
}
"""

NDVI_EVALSCRIPT = """
//VERSION=3
function setup() {
  return { input: ["B04","B08"], output: { bands: 1, sampleType: "FLOAT32" } };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 1e-10);
  return [ndvi];
}
"""


async def satellite_fetch_node(state: FarmState) -> dict:
    cfg = _build_config()
    loc = state["location"]
    bbox = _lat_lon_to_bbox(loc["lat"], loc["lon"])
    size = bbox_to_dimensions(bbox, resolution=10)  # 10m/pixel Sentinel-2

    time_interval = (state["date_start"], state["date_end"])

    # --- RGB image ---
    rgb_req = SentinelHubRequest(
        evalscript=RGB_EVALSCRIPT,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=time_interval,
                mosaicking_order="leastCC",
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.PNG)],
        bbox=bbox,
        size=size,
        config=cfg,
    )
    rgb_data = rgb_req.get_data()[0]

    # Encode PNG as base64 data URL for the frontend
    from PIL import Image
    import io
    img = Image.fromarray(rgb_data.astype(np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    rgb_b64 = base64.b64encode(buf.getvalue()).decode()
    rgb_url = f"data:image/png;base64,{rgb_b64}"

    # --- NDVI ---
    ndvi_req = SentinelHubRequest(
        evalscript=NDVI_EVALSCRIPT,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=DataCollection.SENTINEL2_L2A,
                time_interval=time_interval,
                mosaicking_order="leastCC",
            )
        ],
        responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
        bbox=bbox,
        size=size,
        config=cfg,
    )
    ndvi_array = np.squeeze(ndvi_req.get_data()[0])
    valid = ndvi_array[~np.isnan(ndvi_array)]

    ndvi_stats = {
        "mean": float(np.mean(valid)),
        "min": float(np.min(valid)),
        "max": float(np.max(valid)),
        "std": float(np.std(valid)),
        "p10": float(np.percentile(valid, 10)),
        "p25": float(np.percentile(valid, 25)),
        "p75": float(np.percentile(valid, 75)),
        "p90": float(np.percentile(valid, 90)),
    }

    satellite_images = {
        "rgb_url": rgb_url,
        "ndvi_data": ndvi_stats,
        "ndvi_array": ndvi_array.tolist(),  # raw 2D array for field detector
        "metadata": {
            "bbox": list(bbox.lower_left) + list(bbox.upper_right),
            "resolution_m": 10,
            "date_start": state["date_start"],
            "date_end": state["date_end"],
            "image_size": list(size),
        },
    }

    return {"satellite_images": satellite_images}