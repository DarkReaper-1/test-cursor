from __future__ import annotations

from app.models.schemas import AlternativeProduct, HalalStatus, ProductInfo


CATALOG: list[dict] = [
    {
        "match": ["nutella", "chocolate hazelnut", "hazelnut spread"],
        "alt": AlternativeProduct(
            name="Halal-certified hazelnut cocoa spread",
            reason="Look for JAKIM/MUI/IFANCA marks and alcohol-free flavoring.",
            nearby_hint="Check local halal grocery or major supermarket international aisle.",
            online_hint="Search online halal markets for certified hazelnut spread.",
        ),
    },
    {
        "match": ["gummy", "gelatin", "marshmallow"],
        "alt": AlternativeProduct(
            name="Agar or pectin gummies / vegetarian marshmallows",
            reason="Plant gels avoid animal gelatin uncertainty.",
            nearby_hint="Health food stores often stock gelatin-free candy.",
            online_hint="Search “halal marshmallows” or “agar gummies”.",
        ),
    },
    {
        "match": ["vanilla extract"],
        "alt": AlternativeProduct(
            name="Alcohol-free vanilla flavor",
            reason="Avoids ethanol used in many pure vanilla extracts.",
            nearby_hint="Baking aisle — labeled alcohol-free vanilla.",
            online_hint="Widely available from baking specialty brands.",
        ),
    },
    {
        "match": ["lipstick", "carmine", "blush"],
        "alt": AlternativeProduct(
            name="Carmine-free / halal-certified lipstick",
            reason="Uses mineral or plant pigments instead of cochineal.",
            nearby_hint="Ask beauty retailers for vegan/halal color cosmetics.",
            online_hint="Search IFANCA or MUI certified cosmetics.",
        ),
    },
    {
        "match": ["softgel", "gelatin capsule", "ibuprofen"],
        "alt": AlternativeProduct(
            name="Tablet or cellulose (HPMC) capsule alternative",
            reason="Avoids gelatin capsules when a clinically suitable option exists.",
            nearby_hint="Ask pharmacist for gelatin-free versions.",
            online_hint="Check manufacturer halal statements for excipients.",
        ),
    },
    {
        "match": ["cheese", "rennet"],
        "alt": AlternativeProduct(
            name="Microbial rennet / vegetarian cheese",
            reason="Avoids unspecified animal rennet.",
            nearby_hint="Look for “microbial enzyme” or “vegetarian rennet” on cheese labels.",
            online_hint="Halal-certified cheese brands online.",
        ),
    },
]


def suggest_alternatives(product: ProductInfo, status: HalalStatus) -> list[AlternativeProduct]:
    if status == HalalStatus.HALAL:
        return []
    blob = " ".join(
        [
            product.name or "",
            product.brand or "",
            " ".join(product.categories or []),
            product.ingredients_text or "",
        ]
    ).lower()
    out: list[AlternativeProduct] = []
    for row in CATALOG:
        if any(m in blob for m in row["match"]):
            out.append(row["alt"])
    if not out:
        out.append(
            AlternativeProduct(
                name="Search for a certified halal alternative",
                reason="Choose products with recognized halal marks or simpler ingredient lists.",
                nearby_hint="Halal grocery / supermarket halal section.",
                online_hint="Filter marketplaces by halal-certified.",
            )
        )
    return out[:3]
