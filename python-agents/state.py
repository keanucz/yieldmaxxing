from typing import TypedDict, Optional


class FarmState(TypedDict):
    job_id: str
    location: dict
    date_start: str
    date_end: str
    crop_image_base64: Optional[str]
    go_api_url: Optional[str]  # Go API base URL for satellite image serving
    satellite_images: Optional[dict]
    detected_fields: Optional[list]    # auto-detected field bboxes [{id, x, y, w, h, ndvi_mean}]
    crop_analysis: Optional[dict]
    selected_field_ids: Optional[list] # field IDs the user selected
    final_report: Optional[dict]
