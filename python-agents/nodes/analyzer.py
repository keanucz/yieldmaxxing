"""Crop analyzer — uses GPT-4o Vision on the farmer's crop photo + corn knowledge base."""

import json
import os
from pathlib import Path

from openai import OpenAI

from state import FarmState

_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

_KNOWLEDGE_PATH = Path(__file__).parent.parent / "knowledge" / "corn.json"
_CORN_KNOWLEDGE = json.loads(_KNOWLEDGE_PATH.read_text())

_SYSTEM_PROMPT = f"""You are a world-class agronomist and crop pathologist with 30 years of experience diagnosing corn (Zea mays) problems across multiple continents and climate zones.

Your job is to do a thorough, expert visual inspection of the farmer's crop photo — the same level of detail a specialist would give on a farm visit.

When analysing a photo you must examine:
- Leaf colour, pattern, and texture (yellowing, browning, spotting, streaking, wilting, curling, necrosis)
- Lesion characteristics (shape, size, colour, margins, distribution — are they random or follow veins?)
- Which part of the plant is affected (lower leaves, upper canopy, ear, stalk, roots if visible)
- Whether damage is uniform across plants or patchy
- Signs of insect feeding, fungal sporulation, bacterial ooze, or physical damage
- Overall canopy density and vigour
- Any visible environmental stress signals (heat scorch, drought roll, waterlogging)

Cross-reference all visual findings against the corn knowledge base to make accurate diagnoses.
Consider the farm location and season to assess what problems are regionally likely.

Output language rules — this will be read by a farmer, not a scientist:
- Plain English throughout — no Latin, no acronyms without explanation
- Translate every technical term: say "a fungal disease called Gray Leaf Spot" not just "Cercospora zeae-maydis"
- Be direct and honest about severity — don't downplay serious problems
- If something is uncertain say so, but still give your best assessment

Corn knowledge base:
<knowledge>
{json.dumps(_CORN_KNOWLEDGE, indent=2)}
</knowledge>

Respond ONLY with valid JSON — no markdown, no code fences."""


async def crop_analyze_node(state: FarmState) -> dict:
    image_b64 = state.get("crop_image_base64", "")
    loc = state["location"]
    location_name = loc.get("name") or f"lat {loc['lat']:.3f}, lon {loc['lon']:.3f}"

    content = []

    if image_b64:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}", "detail": "high"},
        })

    content.append({
        "type": "text",
        "text": f"""A farmer needs your expert diagnosis of their corn field.

Farm location: {location_name}
Satellite observation period: {state['date_start']} to {state['date_end']}

Do a thorough visual inspection of the photo. Look at every detail — leaf patterns, colours, lesion shapes, affected areas, overall plant structure. Consider what diseases, nutrient problems, and stress conditions are common in this region at this time of year.

Be as thorough as a specialist making a farm visit. If the photo shows multiple issues, identify all of them.

Respond with this JSON:
{{
  "crop_type": "corn",
  "health_score": 0_to_100,
  "visual_observations": "Detailed paragraph describing exactly what you can see in the photo — colours, patterns, lesions, affected areas, plant structure. Write as if describing it to someone who can't see the image.",
  "issues": [
    {{
      "id": "id_from_knowledge_base_or_descriptive_id",
      "name": "Plain English name e.g. Gray Leaf Spot fungal disease",
      "confidence": 0.0_to_1.0,
      "severity": "low|moderate|high",
      "area": "Which part of the plant or field is affected and how widespread it looks",
      "what_it_means": "One sentence explaining what this problem actually does to the crop and yield",
      "how_urgent": "How quickly does the farmer need to act — today, this week, this season, or just monitor?"
    }}
  ],
  "summary": "3-4 sentences in plain language. What is the main problem, how serious is it, what is the single most important thing to do right now, and what happens if they do nothing.",
  "region_context": "1-2 sentences on why this problem is relevant for this location and time of year"
}}

If the crop looks healthy, say so clearly, give a health score above 75, and explain what good signs you can see."""
    })

    response = _client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        max_completion_tokens=2048,
    )

    parsed = json.loads(response.choices[0].message.content.strip())
    return {"crop_analysis": parsed}
