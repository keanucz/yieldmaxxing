"""Fetches NDVI data from Sentinel Hub for field analysis.
RGB imagery is served directly by the Go API — we just build the URL here.
"""

import os
import numpy as np
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
    return BBox(
        bbox=[lon - radius_deg, lat - radius_deg, lon + radius_deg, lat + radius_deg],
        crs=CRS.WGS84,
    )


# --- RGB fetch is handled by Go API (handlers/satellite.go) ---
# def _fetch_rgb(cfg, bbox, size, time_interval): ...

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
    size = bbox_to_dimensions(bbox, resolution=10)
    time_interval = (state["date_start"], state["date_end"])

    # RGB URL — served by Go, frontend fetches it directly
    go_api = state.get("go_api_url", "http://localhost:8080")
    rgb_url = (
        f"{go_api}/api/satellite/rgb"
        f"?lat={loc['lat']}&lon={loc['lon']}"
        f"&date_start={state['date_start']}&date_end={state['date_end']}"
    )

    # NDVI float array — fetched here for field detection and stats
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
        "min":  float(np.min(valid)),
        "max":  float(np.max(valid)),
        "std":  float(np.std(valid)),
        "p10":  float(np.percentile(valid, 10)),
        "p25":  float(np.percentile(valid, 25)),
        "p75":  float(np.percentile(valid, 75)),
        "p90":  float(np.percentile(valid, 90)),
    }

    satellite_images = {
        "rgb_url": rgb_url,
        "ndvi_data": ndvi_stats,
        "ndvi_array": ndvi_array.tolist(),
        "metadata": {
            "bbox": list(bbox.lower_left) + list(bbox.upper_right),
            "resolution_m": 10,
            "date_start": state["date_start"],
            "date_end": state["date_end"],
            "image_size": list(size),
        },
    }

    return {"satellite_images": satellite_images}
