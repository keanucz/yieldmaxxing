"""Final planning agent — synthesizes everything into a farmer-friendly actionable crop plan."""

import json
import os
from pathlib import Path

from openai import OpenAI

from state import FarmState

_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

_KNOWLEDGE_PATH = Path(__file__).parent.parent / "knowledge" / "corn.json"
_CORN_KNOWLEDGE = json.loads(_KNOWLEDGE_PATH.read_text())

_SYSTEM_PROMPT = f"""You are a trusted farm advisor writing a crop management plan for a real farmer.

You have access to:
- A detailed visual diagnosis from a crop photo
- Satellite NDVI data showing field health from above
- Which specific fields the farmer wants to focus on
- A comprehensive corn disease and stress knowledge base

Your job is to turn all of this into a clear, actionable plan the farmer can actually follow.

Writing rules — this is for a farmer, not an agronomist:
- Write every recommendation as a specific action with a clear timeframe: "This week, spray X on fields 2 and 3" not "consider fungicide application"
- Use costs in £/acre or £/hectare depending on region (UK = hectares, US = acres)
- Prioritise by urgency — what needs doing TODAY vs this week vs this season
- Explain the WHY behind each recommendation in one sentence — farmers follow advice they understand
- Reference the specific fields by name/number where relevant
- Take the farm's location and season into account for timing recommendations
- If satellite NDVI is low in areas the farmer didn't select, flag it — they may have missed a problem
- End with an honest yield impact estimate if issues go untreated

Tone: direct, practical, respectful. Like advice from a trusted neighbour who happens to be an expert.

Corn knowledge base:
<knowledge>
{json.dumps(_CORN_KNOWLEDGE, indent=2)}
</knowledge>

Respond ONLY with valid JSON — no markdown, no code fences."""


async def optimizer_node(state: FarmState) -> dict:
    crop_analysis = state["crop_analysis"]
    satellite = state["satellite_images"]
    detected_fields = state.get("detected_fields", [])
    selected_ids = state.get("selected_field_ids") or []

    selected_fields = [f for f in detected_fields if f["id"] in selected_ids] if selected_ids else detected_fields
    unselected_fields = [f for f in detected_fields if f["id"] not in (selected_ids or [])]

    ndvi = satellite["ndvi_data"]
    loc = state["location"]
    location_name = loc.get("name") or f"lat {loc['lat']:.3f}, lon {loc['lon']:.3f}"

    user_message = f"""Write a crop management plan for this farmer.

Farm: {location_name}
Satellite data period: {state['date_start']} to {state['date_end']}

=== VISUAL CROP DIAGNOSIS ===
Health score from photo: {crop_analysis['health_score']}/100
What was observed: {crop_analysis.get('visual_observations', 'See issues below')}
Regional context: {crop_analysis.get('region_context', 'N/A')}
Summary: {crop_analysis['summary']}

Detected issues:
{json.dumps(crop_analysis.get('issues', []), indent=2)}

=== SATELLITE NDVI DATA (whole farm) ===
Average field health (NDVI): {ndvi['mean']:.3f} — benchmark: healthy corn = 0.6-0.9
Worst areas (P10): {ndvi['p10']:.3f}
Best areas (P90): {ndvi['p90']:.3f}
Variation (std dev): {ndvi['std']:.3f} — {'high variation suggests patchy problems' if ndvi['std'] > 0.15 else 'relatively uniform field'}

=== SELECTED FIELDS FOR ANALYSIS ===
{json.dumps(selected_fields, indent=2)}

=== OTHER DETECTED FIELDS (not selected — flag if concerning) ===
{json.dumps(unselected_fields, indent=2)}

Write the plan as this JSON:
{{
  "overall_health_score": 0_to_100,
  "headline": "One sentence summary of the farm's situation right now",
  "field_plans": [
    {{
      "field_id": 0,
      "field_label": "Field 1 (north-east corner)" ,
      "ndvi_mean": 0.0,
      "health_rating": "Excellent / Good / Fair / Poor / Critical",
      "diagnosis": "1-2 sentences on what is happening in this specific field",
      "actions": [
        {{
          "priority": "Do today|Do this week|Do this month|Monitor",
          "action": "Specific instruction — what product, what rate, what method",
          "why": "One sentence explaining why this action matters",
          "timing": "Exact timing e.g. within 48 hours, before next rain, at VT stage",
          "estimated_cost": "£X per hectare or £X total"
        }}
      ]
    }}
  ],
  "farm_wide_actions": [
    {{
      "priority": "Do today|Do this week|Do this month|Monitor",
      "action": "Farm-wide action",
      "why": "Why this applies to the whole farm",
      "timing": "When",
      "estimated_cost": "£X per hectare"
    }}
  ],
  "flags": [
    "Any fields not selected that show concerning NDVI values — flag them here with field ID and NDVI"
  ],
  "executive_summary": "4-5 sentences. What is the overall situation, which fields need urgent attention, what are the top 2-3 actions and in what order, and what is at stake if nothing is done.",
  "estimated_yield_impact": "Specific estimate e.g. 15-25% yield reduction across selected fields if untreated — explain the basis"
}}"""

    response = _client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_completion_tokens=3000,
    )

    final_report = json.loads(response.choices[0].message.content.strip())
    return {"final_report": final_report}
