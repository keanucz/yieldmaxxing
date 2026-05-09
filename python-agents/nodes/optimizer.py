"""Final planning agent — synthesizes everything into an actionable crop plan."""

import json
import os
from pathlib import Path

from openai import OpenAI

from state import FarmState

_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

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

    ndvi = satellite["ndvi_data"]

    user_message = f"""Generate a crop management plan for this farm.

Location: {state['location'].get('name', f"lat={state['location']['lat']}, lon={state['location']['lon']}")}
Date range: {state['date_start']} to {state['date_end']}

--- Crop photo analysis ---
Health score: {crop_analysis['health_score']}/100
Summary: {crop_analysis['summary']}
Detected issues:
{json.dumps(crop_analysis.get('issues', []), indent=2)}

--- Satellite NDVI statistics (whole farm) ---
Mean: {ndvi['mean']:.3f}, Min: {ndvi['min']:.3f}, Max: {ndvi['max']:.3f}, Std: {ndvi['std']:.3f}

--- Selected fields ---
{json.dumps(selected_fields, indent=2)}

Respond with this JSON:
{{
  "overall_health_score": 0_to_100,
  "field_plans": [
    {{
      "field_id": 0,
      "ndvi_mean": 0.0,
      "health": "excellent|good|fair|poor|critical",
      "issues": ["list of issues"],
      "actions": [
        {{
          "priority": "urgent|high|medium|low",
          "action": "Specific action",
          "timing": "When",
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
  "executive_summary": "3-4 sentences summarising findings and next steps",
  "estimated_yield_impact": "e.g. 15-25% yield reduction if untreated"
}}"""

    response = _client.chat.completions.create(
        model="gpt-5.5",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=2048,
    )

    final_report = json.loads(response.choices[0].message.content.strip())
    return {"final_report": final_report}
