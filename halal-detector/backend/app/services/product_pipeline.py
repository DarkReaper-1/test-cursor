from __future__ import annotations

from app.models.schemas import (
    HalalStatus,
    ProductResult,
    ScholarSchool,
)
from app.services.alternatives import suggest_alternatives
from app.services.analyzer import analyze_ingredient_list
from app.services.barcode import lookup_barcode
from app.services.certification import detect_certification


def medicine_notes(ingredients_text: str, status: HalalStatus) -> list[str]:
    notes = [
        "Check inactive ingredients: alcohol, gelatin capsules, and animal-derived additives.",
        "In an emergency, necessity (darura) may allow medicine when no alternative exists — ask a doctor and scholar.",
    ]
    low = (ingredients_text or "").lower()
    if "gelatin" in low:
        notes.append("Gelatin capsules are common. Ask a pharmacist for tablet or HPMC capsule options.")
    if "alcohol" in low or "ethanol" in low:
        notes.append("Alcohol content may be present as a solvent. Ask about alcohol-free formulations.")
    if status != HalalStatus.HALAL:
        notes.append("If medically necessary and no alternative exists, consult a qualified scholar for your case.")
    return notes


def cosmetic_notes(ingredients_text: str) -> list[str]:
    notes = [
        "Cosmetics may include animal collagen, alcohol, glycerin, keratin, carmine, or lanolin.",
        "External-use rulings can differ from food rulings; origin still matters to many users.",
    ]
    low = (ingredients_text or "").lower()
    for word, tip in [
        ("carmine", "Carmine/cochineal is insect-based color — often avoided."),
        ("keratin", "Keratin is usually animal-derived."),
        ("lanolin", "Lanolin comes from sheep wool; many accept it externally."),
        ("collagen", "Collagen source (fish/bovine/porcine) should be verified."),
        ("alcohol", "Alcohol denat is common in perfume and some skincare."),
        ("glycerin", "Glycerin may be plant or animal — look for vegetable glycerin."),
    ]:
        if word in low:
            notes.append(tip)
    return notes


async def analyze_barcode(
    barcode: str,
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI,
    product_type: str = "food",
) -> ProductResult:
    product = await lookup_barcode(barcode, product_type=product_type)
    text = product.ingredients_text or ""
    analysis = analyze_ingredient_list(text, school=school, product_type=product.product_type)
    if not text.strip():
        analysis.confidence = min(analysis.confidence, 40)
        analysis.confidence_reason = "Product found but ingredient list missing. Treat as incomplete information."
        analysis.reason = "Not enough ingredient data to verify this product."
        analysis.status = HalalStatus.DOUBTFUL
        analysis.status_label = "⚠️ DOUBTFUL"

    cert = detect_certification(
        " ".join(
            [
                product.name or "",
                product.brand or "",
                text,
                " ".join(product.categories),
            ]
        )
    )
    if cert.detected and analysis.status != HalalStatus.HARAM:
        analysis.confidence = max(analysis.confidence, 90)
        analysis.confidence_reason = (
            f"Recognized halal certification mark/reference: {cert.organization}."
        )
        analysis.facts.append(f"Certification signal: {cert.organization} ({cert.country}).")

    alts = suggest_alternatives(product, analysis.status)
    med = medicine_notes(text, analysis.status) if product.product_type == "medicine" else []
    cos = cosmetic_notes(text) if product.product_type == "cosmetic" else []

    return ProductResult(
        product=product,
        analysis=analysis,
        certification=cert,
        alternatives=alts,
        medicine_notes=med,
        cosmetic_notes=cos,
    )
