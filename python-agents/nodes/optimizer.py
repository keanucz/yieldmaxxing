"""Optimizer/summarizer agent — takes annotated bounding boxes + analysis and produces final report."""

import json
import os
from pathlib import Path

import anthropic

from graph import FarmState

_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

_KNOWLEDGE_PATH = Path(__file__).parent.parent / "knowledge" / "corn.json"
_CORN_KNOWLEDGE = json.loads(_KNOWLEDGE_PATH.read_text())

_SYSTEM_PROMPT = f"""You are an expert agronomist producing actionable field management reports for corn farmers.

You receive:
- Initial crop analysis with detected issues and NDVI data
- Farmer-annotated bounding boxes marking specific problem areas on the satellite image
- The corn agronomic knowledge base

<knowledge>
{json.dumps(_CORN_KNOWLEDGE, indent=2)}
</knowledge>

Your job is to synthesize this into a precise, actionable report. Be specific about:
- Which annotated zones have which issues
- Prioritized, timed treatment recommendations
- Estimated yield impact if untreated
- Cost-effective intervention strategies

Respond ONLY with valid JSON matching the schema in the user message."""


async def optimizer_node(state: FarmState) -> dict:
    analysis = state["crop_analysis"]
    annotations = state.get("annotations", [])
    satellite = state["satellite_images"]
    ndvi = satellite["ndvi_data"]

    annotations_desc = "\n".join(
        f"- Zone '{a.get('label', f'Zone {i+1}')}': x={a['x']:.1f}%, y={a['y']:.1f}%, "
        f"width={a['w']:.1f}%, height={a['h']:.1f}% of image"
        for i, a in enumerate(annotations)
    ) or "No zones annotated — treat whole field."

    issues_desc = json.dumps(analysis["issues"], indent=2)

    user_message = f"""Generate final field optimization report.

Field: {state['location'].get('name', f"lat={state['location']['lat']}, lon={state['location']['lon']}")}
Overall health score: {analysis['health_score']}/100
NDVI mean: {ndvi['mean']:.3f}

Detected issues:
{issues_desc}

Farmer-annotated problem zones:
{annotations_desc}

Respond ONLY with this JSON (no markdown):
{{
  "health_score": {analysis['health_score']},
  "annotated_issues": [
    {{
      "issue": {{
        "id": "issue_id",
        "name": "Issue name",
        "confidence": 0.0_to_1.0,
        "severity": "low|moderate|high",
        "area": "zone description"
      }},
      "bounding_box": {{
        "label": "Zone label",
        "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0
      }},
      "area_hectares": estimated_hectares_as_number
    }}
  ],
  "recommendations": [
    {{
      "priority": "urgent|high|medium|low",
      "action": "Specific action to take",
      "timing": "When to do it",
      "estimated_cost": "Cost estimate e.g. $15-25/acre"
    }}
  ],
  "executive_summary": "3-4 sentence summary for the farmer covering what was found, where, and what to do",
  "estimated_yield_impact": "e.g. 10-20% yield reduction if untreated"
}}"""

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()
    final_report = json.loads(raw)

    return {"final_report": final_report}
