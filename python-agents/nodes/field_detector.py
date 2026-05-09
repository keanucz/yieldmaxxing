"""Detects individual field boundaries from NDVI data and returns bounding boxes."""

import numpy as np
from skimage import measure, morphology

from state import FarmState


async def field_detector_node(state: FarmState) -> dict:
    satellite = state["satellite_images"]
    ndvi_raw = satellite.get("ndvi_array")  # 2D float array stored by satellite node

    if ndvi_raw is None:
        return {"detected_fields": []}

    ndvi = np.array(ndvi_raw)
    h, w = ndvi.shape

    # Vegetation mask: anything likely to be a crop field
    mask = (ndvi > 0.2) & (~np.isnan(ndvi))

    # Clean up noise
    mask = morphology.remove_small_objects(mask, min_size=50)
    mask = morphology.closing(mask, morphology.square(5))

    # Label connected regions
    labeled = measure.label(mask)
    regions = measure.regionprops(labeled, intensity_image=ndvi)

    fields = []
    for i, region in enumerate(regions):
        if region.area < 100:  # skip tiny blobs
            continue
        min_row, min_col, max_row, max_col = region.bbox
        fields.append({
            "id": i,
            "x": round(min_col / w, 4),
            "y": round(min_row / h, 4),
            "w": round((max_col - min_col) / w, 4),
            "h": round((max_row - min_row) / h, 4),
            "ndvi_mean": round(float(np.nanmean(ndvi[min_row:max_row, min_col:max_col])), 3),
            "pixel_area": region.area,
        })

    # Sort by size descending
    fields.sort(key=lambda f: f["pixel_area"], reverse=True)

    return {"detected_fields": fields}
