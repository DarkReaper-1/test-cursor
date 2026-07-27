from __future__ import annotations

import re
from typing import Any

from app.models.schemas import HalalStatus, ScholarSchool
from app.services.analyzer import analyze_ingredient_list


def parse_label_text(raw_text: str, school: ScholarSchool = ScholarSchool.GENERAL_SUNNI) -> dict[str, Any]:
    """Heuristic OCR post-processing: pull ingredients section and highlight risks."""
    text = raw_text.strip()
    # Prefer content after "ingredients"
    m = re.search(r"ingredients?\s*[:\-]\s*(.*)", text, flags=re.I | re.S)
    ingredient_text = m.group(1).strip() if m else text
    analysis = analyze_ingredient_list(ingredient_text, school=school)

    lines: list[dict[str, Any]] = []
    # Build per-token highlight list for UI
    parts = [p.strip() for p in re.split(r"[,;\n]", ingredient_text) if p.strip()]
    hit_map = {h.name.lower(): h for h in analysis.ingredients}
    for alias_hit in analysis.ingredients:
        for a in alias_hit.aliases:
            hit_map[a.lower()] = alias_hit
        if alias_hit.e_number:
            hit_map[alias_hit.e_number.lower()] = alias_hit

    for part in parts:
        matched = None
        low = part.lower()
        for key, hit in hit_map.items():
            if key and key in low:
                matched = hit
                break
        if matched:
            mark = "❌" if matched.status == HalalStatus.HARAM else "⚠️" if matched.status == HalalStatus.DOUBTFUL else "✅"
            lines.append(
                {
                    "text": part,
                    "status": matched.status.value,
                    "mark": mark,
                    "highlight": matched.highlight,
                    "explanation": matched.explanation,
                }
            )
        else:
            lines.append(
                {
                    "text": part,
                    "status": "unknown",
                    "mark": "",
                    "highlight": "none",
                    "explanation": None,
                }
            )

    return {
        "raw_text": raw_text,
        "ingredients_text": ingredient_text,
        "lines": lines,
        "analysis": analysis,
    }


# Demo OCR payloads for camera simulation when on-device OCR is unavailable.
DEMO_OCR_SAMPLES = {
    "gummies": "Ingredients: Corn syrup, sugar, gelatin, citric acid, natural flavor, carmine.",
    "shampoo": "Ingredients: Water, sodium laureth sulfate, glycerin, hydrolyzed keratin, fragrance, alcohol denat.",
    "medicine": "Inactive ingredients: gelatin, glycerin, sorbitol, purified water.",
}
