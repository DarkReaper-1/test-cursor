from __future__ import annotations

from app.models.schemas import (
    AnalysisResult,
    HalalStatus,
    IngredientHit,
    ScholarSchool,
)
from app.services.ingredient_db import (
    extract_candidate_tokens,
    find_ingredient,
    load_database,
)


STATUS_RANK = {
    HalalStatus.HALAL: 0,
    HalalStatus.DOUBTFUL: 1,
    HalalStatus.HARAM: 2,
}

STATUS_LABEL = {
    HalalStatus.HALAL: "✅ HALAL",
    HalalStatus.DOUBTFUL: "⚠️ DOUBTFUL",
    HalalStatus.HARAM: "❌ HARAM",
}

HIGHLIGHT = {
    HalalStatus.HALAL: "green",
    HalalStatus.DOUBTFUL: "amber",
    HalalStatus.HARAM: "red",
}


def _school_key(school: ScholarSchool) -> str:
    return school.value


def _apply_school_status(item: dict, school: ScholarSchool) -> HalalStatus:
    base = HalalStatus(item.get("default_status", "doubtful"))
    if school == ScholarSchool.CUSTOM_STRICTEST and item.get("differs_by_school"):
        # Strictest custom: upgrade doubtful animal/alcohol-related to haram-leaning doubtful kept as haram for known risk classes
        risky = item.get("category") in {
            "gelling_agent",
            "emulsifier",
            "enzyme",
            "flavor",
            "solvent",
            "colorant",
            "fat",
            "protein",
            "dough_conditioner",
            "glazing_agent",
        }
        if base == HalalStatus.DOUBTFUL and risky and item["id"] not in {
            "citric_acid",
            "lecithin",
            "sugar",
            "water",
            "honey",
            "agar",
            "pectin",
        }:
            # Keep as doubtful visually but reason text will stress avoidance; for shellac/wine vinegar/custom mark haram
            if item["id"] in {"shellac", "wine_vinegar", "lanolin", "natural_flavors", "e471", "gelatin", "e441"}:
                return HalalStatus.HARAM
        if item["id"] in {"carmine", "e120", "lard", "pork", "alcohol"}:
            return HalalStatus.HARAM
    return base


def ingredient_to_hit(item: dict, school: ScholarSchool) -> IngredientHit:
    status = _apply_school_status(item, school)
    key = status.value
    reason = (item.get("reason_templates") or {}).get(key) or item.get("definition", "")
    school_notes = (item.get("scholarly_notes") or {})
    note = school_notes.get(_school_key(school)) or school_notes.get("general_sunni")
    return IngredientHit(
        id=item["id"],
        name=item["name"],
        status=status,
        explanation=reason,
        e_number=item.get("e_number"),
        aliases=list(item.get("aliases") or []),
        found_in=list(item.get("found_in") or []),
        scientific=item.get("scientific"),
        scholarly_notes=note,
        differs_by_school=bool(item.get("differs_by_school")),
        school_summaries={k: v for k, v in school_notes.items()},
        sources=["Halal Detector offline ingredient database"],
        highlight=HIGHLIGHT[status],
    )


def analyze_ingredient_list(
    text: str,
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI,
    product_type: str = "food",
) -> AnalysisResult:
    tokens = extract_candidate_tokens(text)
    hits: list[IngredientHit] = []
    seen: set[str] = set()

    for token in tokens:
        item = find_ingredient(token)
        if not item or item["id"] in seen:
            continue
        seen.add(item["id"])
        hits.append(ingredient_to_hit(item, school))

    # Also scan full text for known aliases missed by tokenization
    lower = text.lower()
    for item in load_database().get("ingredients", []):
        if item["id"] in seen:
            continue
        names = [item["name"], *(item.get("aliases") or [])]
        if item.get("e_number"):
            names.append(item["e_number"])
        for name in names:
            if len(name) >= 4 and name.lower() in lower:
                seen.add(item["id"])
                hits.append(ingredient_to_hit(item, school))
                break

    if not hits and text.strip():
        # Unknown list → doubtful with low confidence
        return AnalysisResult(
            status=HalalStatus.DOUBTFUL,
            status_label=STATUS_LABEL[HalalStatus.DOUBTFUL],
            confidence=45,
            confidence_reason="No known sensitive ingredients matched. Origin of complex additives could not be verified.",
            reason="Ingredients could not be fully verified from available data.",
            ingredients=[],
            scholarly_banner=None,
            school=school,
            facts=["Ingredient text was received but did not match known high-risk entries."],
            interpretations=["Unknown or uncommon additives should be treated carefully until verified."],
            sources=["Local offline analysis"],
        )

    worst = HalalStatus.HALAL
    for hit in hits:
        if STATUS_RANK[hit.status] > STATUS_RANK[worst]:
            worst = hit.status

    haram = [h for h in hits if h.status == HalalStatus.HARAM]
    doubtful = [h for h in hits if h.status == HalalStatus.DOUBTFUL]
    differs = [h for h in hits if h.differs_by_school]

    if haram:
        reason = haram[0].explanation
        confidence = 92 if any(h.id in {"pork", "lard", "e120", "carmine"} for h in haram) else 84
        confidence_reason = "A clearly impermissible ingredient was identified on the label."
    elif doubtful:
        reason = doubtful[0].explanation
        confidence = 61
        confidence_reason = "One or more ingredients need manufacturer or source verification."
    else:
        reason = "No known haram or doubtful ingredients were detected in the provided list."
        confidence = 88
        confidence_reason = "Matched ingredients are generally accepted as halal under the selected standard."

    # Medicine / cosmetic extra caution
    facts = [f"Matched {len(hits)} known ingredient(s)."]
    interpretations: list[str] = []
    if product_type == "medicine":
        interpretations.append(
            "For medicines, necessity (darura) may allow otherwise restricted inactive ingredients when no alternative exists. Ask a doctor and scholar for your situation."
        )
        if any(h.id in {"gelatin", "e441", "alcohol"} for h in hits):
            confidence = min(confidence, 70)
            confidence_reason = "Medicine excipients include gelatin and/or alcohol — check alternatives and medical necessity."
    if product_type == "cosmetic":
        interpretations.append(
            "Cosmetic rulings can differ for external use versus ingestion (e.g. lipstick). This result focuses on ingredient origin risk."
        )

    banner = None
    if differs:
        banner = "Scholarly opinions differ on this ingredient." if len(differs) == 1 else "Scholarly opinions differ on some ingredients."
        interpretations.append(banner)
        for d in differs[:3]:
            if d.scholarly_notes:
                interpretations.append(f"{d.name}: {d.scholarly_notes}")

    return AnalysisResult(
        status=worst,
        status_label=STATUS_LABEL[worst],
        confidence=confidence,
        confidence_reason=confidence_reason,
        reason=reason,
        ingredients=sorted(hits, key=lambda h: (-STATUS_RANK[h.status], h.name)),
        scholarly_banner=banner,
        school=school,
        facts=facts,
        interpretations=interpretations,
        sources=["Halal Detector offline ingredient database", "Label text provided by user or product database"],
    )


def analyze_single_query(query: str, school: ScholarSchool) -> IngredientHit | None:
    item = find_ingredient(query)
    if not item:
        return None
    return ingredient_to_hit(item, school)
