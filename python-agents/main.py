"""FastAPI service exposing the LangGraph agent pipeline to the Go API."""

import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command

from graph import graph, FarmState


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="FarmWise Agent Service", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---- request/response models ----

class Location(BaseModel):
    lat: float
    lon: float
    name: str = ""

class BoundingBox(BaseModel):
    label: str = ""
    x: float
    y: float
    w: float
    h: float

class RunRequest(BaseModel):
    job_id: str
    location: Location
    date_start: str
    date_end: str
    crop_image_base64: str = ""

class ResumeRequest(BaseModel):
    job_id: str
    selected_field_ids: list[int]

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    satellite_images: dict | None = None
    crop_analysis: dict | None = None
    detected_fields: list | None = None
    final_report: dict | None = None
    error: str | None = None


# ---- endpoints ----

@app.post("/run", response_model=JobStatusResponse)
async def run_pipeline(req: RunRequest):
    """Start the agent pipeline. Runs until it hits the annotation interrupt."""
    thread_config = {"configurable": {"thread_id": req.job_id}}

    initial_state: FarmState = {
        "job_id": req.job_id,
        "location": req.location.model_dump(),
        "date_start": req.date_start,
        "date_end": req.date_end,
        "crop_image_base64": req.crop_image_base64,
        "satellite_images": None,
        "crop_analysis": None,
        "annotations": None,
        "final_report": None,
    }

    try:
        # Run until interrupt
        result = await graph.ainvoke(initial_state, thread_config)
    except Exception as e:
        return JobStatusResponse(
            job_id=req.job_id,
            status="failed",
            error=str(e),
        )

    # Graph paused at annotation_interrupt — state has satellite + analysis
    snapshot = graph.get_state(thread_config)
    state = snapshot.values

    return JobStatusResponse(
        job_id=req.job_id,
        status="awaiting_annotation",
        satellite_images=state.get("satellite_images"),
        crop_analysis=state.get("crop_analysis"),
        detected_fields=state.get("detected_fields"),
    )


@app.post("/resume", response_model=JobStatusResponse)
async def resume_pipeline(req: ResumeRequest):
    """Resume the graph after the farmer submits bounding box annotations."""
    thread_config = {"configurable": {"thread_id": req.job_id}}

    try:
        result = await graph.ainvoke(
            Command(resume=req.selected_field_ids),
            thread_config,
        )
    except Exception as e:
        return JobStatusResponse(
            job_id=req.job_id,
            status="failed",
            error=str(e),
        )

    snapshot = graph.get_state(thread_config)
    state = snapshot.values

    return JobStatusResponse(
        job_id=req.job_id,
        status="complete",
        satellite_images=state.get("satellite_images"),
        crop_analysis=state.get("crop_analysis"),
        final_report=state.get("final_report"),
    )


@app.get("/health")
def health():
    return {"status": "ok"}
