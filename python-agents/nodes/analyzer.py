"""Crop analyzer — uses GPT-4o Vision on the farmer's crop photo + corn knowledge base."""

import json
import os
from pathlib import Path

from openai import OpenAI

from state import FarmState

_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

_KNOWLEDGE_PATH = Path(__file__).parent.parent / "knowledge" / "corn.json"
_CORN_KNOWLEDGE = json.loads(_KNOWLEDGE_PATH.read_text())

_SYSTEM_PROMPT = f"""You are an expert agronomist specializing in corn (Zea mays) field diagnostics.
You analyze photos of crops taken by farmers to identify diseases, nutrient deficiencies, and stress.

Corn knowledge base:
<knowledge>
{json.dumps(_CORN_KNOWLEDGE, indent=2)}
</knowledge>

Respond ONLY with valid JSON — no markdown."""


async def crop_analyze_node(state: FarmState) -> dict:
    image_b64 = state.get("crop_image_base64", "")

    content = []

    if image_b64:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
        })

    content.append({
        "type": "text",
        "text": f"""Analyze this corn crop photo from a farmer.
Location: {state['location'].get('name', f"lat={state['location']['lat']}, lon={state['location']['lon']}")}

Identify any diseases, nutrient deficiencies, or stress visible in the image.
Use the knowledge base to match symptoms accurately.

Respond with this JSON:
{{
  "crop_type": "corn",
  "health_score": 0_to_100,
  "issues": [
    {{
      "id": "id_from_knowledge_base",
      "name": "Human readable name",
      "confidence": 0.0_to_1.0,
      "severity": "low|moderate|high",
      "area": "Where in the image / which part of plant"
    }}
  ],
  "summary": "2-3 sentence plain-language summary for the farmer"
}}"""
    })

    response = _client.chat.completions.create(
        model="gpt-5.5",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        max_tokens=1024,
    )

    parsed = json.loads(response.choices[0].message.content.strip())
    return {"crop_analysis": parsed}
