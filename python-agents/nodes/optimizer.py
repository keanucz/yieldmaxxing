"""Final planning agent — synthesizes everything into an actionable crop plan."""

import json
import os
from pathlib import Path

import anthropic

from state import FarmState

_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

_KNOWLEDGE_PATH = Path(__file__).parent.parent / "knowledge" / "corn.json"
_CORN_KNOWLEDGE = json.loads(_KNOWLEDGE_PATH.read_text())

_SYSTEM_PROMPT = f"""You are an expert agronomist producing actionable crop management plans for corn farmers.

You receive everything gathered about their farm:
- A vision analysis of the crop photo they uploaded
- Satellite NDVI statistics for the farm area
- The specific fields they selected for analysis
- The corn agronomic knowledge base

<knowledge>
{json.dumps(_CORN_KNOWLEDGE, indent=2)}
</knowledge>

Produce a precise, practical crop plan. Be specific about each selected field.
Respond ONLY with valid JSON — no markdown."""


async def optimizer_node(state: FarmState) -> dict:
    crop_analysis = state["crop_analysis"]
    satellite = state["satellite_images"]
    detected_fields = state.get("detected_fields", [])
    selected_ids = state.get("selected_field_ids") or []

    selected_fields = [f for f in detected_fields if f["id"] in selected_ids] if selected_ids else detected_fields

    fields_desc = json.dumps(selected_fields, indent=2)
    issues_desc = json.dumps(crop_analysis.get("issues", []), indent=2)
    ndvi = satellite["ndvi_data"]

    user_message = f"""Generate a crop management plan for this farm.

Location: {state['location'].get('name', f"lat={state['location']['lat']}, lon={state['location']['lon']}")}
Date range: {state['date_start']} to {state['date_end']}

--- Crop photo analysis ---
Health score: {crop_analysis['health_score']}/100
Summary: {crop_analysis['summary']}
Detected issues:
{issues_desc}

--- Satellite NDVI statistics (whole farm) ---
Mean: {ndvi['mean']:.3f}, Min: {ndvi['min']:.3f}, Max: {ndvi['max']:.3f}, Std: {ndvi['std']:.3f}

--- Selected fields for analysis ---
{fields_desc}

Respond with this JSON:
{{
  "overall_health_score": 0_to_100,
  "field_plans": [
    {{
      "field_id": 0,
      "ndvi_mean": 0.0,
      "health": "excellent|good|fair|poor|critical",
      "issues": ["list of issues detected in this field"],
      "actions": [
        {{
          "priority": "urgent|high|medium|low",
          "action": "Specific action",
          "timing": "When to do it",
          "estimated_cost": "$X/acre"
        }}
      ]
    }}
  ],
  "recommendations": [
    {{
      "priority": "urgent|high|medium|low",
      "action": "Farm-wide recommendation",
      "timing": "When",
      "estimated_cost": "$X/acre"
    }}
  ],
  "executive_summary": "3-4 sentences summarising what was found and what to do",
  "estimated_yield_impact": "e.g. 15-25% yield reduction if untreated"
}}"""

    response = _client.messages.create(
        model="claude-opus-4-7",
        max_tokens=2048,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    final_report = json.loads(response.content[0].text.strip())
    return {"final_report": final_report}
