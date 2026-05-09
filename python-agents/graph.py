"""LangGraph workflow definition for the FarmWise agent pipeline."""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt

from state import FarmState


def _field_selection_interrupt(state: FarmState) -> dict:
    """Pauses and returns detected fields to the frontend for user selection."""
    selected_ids = interrupt({
        "type": "field_selection_required",
        "rgb_url": state["satellite_images"]["rgb_url"],
        "detected_fields": state["detected_fields"],
        "crop_analysis": state["crop_analysis"],
        "message": "Select which fields you want to analyse.",
    })
    return {"selected_field_ids": selected_ids}


def build_graph():
    from nodes.analyzer import crop_analyze_node
    from nodes.satellite import satellite_fetch_node
    from nodes.field_detector import field_detector_node
    from nodes.optimizer import optimizer_node

    builder = StateGraph(FarmState)

    builder.add_node("crop_analyze", crop_analyze_node)
    builder.add_node("satellite_fetch", satellite_fetch_node)
    builder.add_node("field_detect", field_detector_node)
    builder.add_node("field_selection", _field_selection_interrupt)
    builder.add_node("optimizer", optimizer_node)

    builder.set_entry_point("crop_analyze")
    builder.add_edge("crop_analyze", "satellite_fetch")
    builder.add_edge("satellite_fetch", "field_detect")
    builder.add_edge("field_detect", "field_selection")
    builder.add_edge("field_selection", "optimizer")
    builder.add_edge("optimizer", END)

    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
