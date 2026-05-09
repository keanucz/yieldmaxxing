"""LangGraph workflow definition for the FarmWise agent pipeline."""

from typing import TypedDict, Optional, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt, Command


class FarmState(TypedDict):
    job_id: str
    location: dict           # {lat, lon, name}
    date_start: str
    date_end: str
    crop_image_base64: Optional[str]  # photo uploaded by farmer
    satellite_images: Optional[dict]
    crop_analysis: Optional[dict]
    annotations: Optional[list]
    final_report: Optional[dict]


def _annotation_interrupt_node(state: FarmState) -> dict:
    """Pauses the graph and waits for farmer to annotate bounding boxes."""
    annotations = interrupt({
        "type": "annotation_required",
        "satellite_images": state["satellite_images"],
        "crop_analysis": state["crop_analysis"],
        "message": "Please annotate the areas of concern on the satellite imagery.",
    })
    return {"annotations": annotations}


def build_graph():
    from nodes.satellite import satellite_fetch_node
    from nodes.analyzer import crop_analyze_node
    from nodes.optimizer import optimizer_node

    builder = StateGraph(FarmState)

    builder.add_node("satellite_fetch", satellite_fetch_node)
    builder.add_node("crop_analyze", crop_analyze_node)
    builder.add_node("annotation_interrupt", _annotation_interrupt_node)
    builder.add_node("optimizer", optimizer_node)

    builder.set_entry_point("satellite_fetch")
    builder.add_edge("satellite_fetch", "crop_analyze")
    builder.add_edge("crop_analyze", "annotation_interrupt")
    builder.add_edge("annotation_interrupt", "optimizer")
    builder.add_edge("optimizer", END)

    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
