from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.models.schemas import ProductInfo


# Demo catalog used when Open Food Facts is unreachable or barcode unknown.
DEMO_PRODUCTS: dict[str, dict[str, Any]] = {
    "3017620422003": {
        "name": "Nutella",
        "brand": "Ferrero",
        "manufacturer": "Ferrero",
        "country": "Italy",
        "categories": ["spreads", "sweet spreads"],
        "ingredients_text": "Sugar, palm oil, hazelnuts, skimmed milk powder, fat-reduced cocoa, lecithin, vanillin",
        "nutrition": {"energy_kcal": 539, "fat": 30.9, "sugars": 56.3},
        "product_type": "food",
    },
    "0000000000001": {
        "name": "Classic Pork Gelatin Gummies",
        "brand": "Demo Brand",
        "manufacturer": "Demo Foods Co",
        "country": "United States",
        "categories": ["candy"],
        "ingredients_text": "Corn syrup, sugar, gelatin, citric acid, natural flavors, carmine, beeswax",
        "nutrition": {"energy_kcal": 140, "sugars": 22},
        "product_type": "food",
    },
    "0000000000002": {
        "name": "Alcohol-Free Vanilla Flavor",
        "brand": "Demo Pantry",
        "manufacturer": "Demo Pantry",
        "country": "United States",
        "categories": ["baking"],
        "ingredients_text": "Water, glycerin, vanilla bean extractives, sugar",
        "nutrition": {},
        "product_type": "food",
    },
    "0000000000003": {
        "name": "Demo Ibuprofen Softgels",
        "brand": "Demo Pharma",
        "manufacturer": "Demo Pharma",
        "country": "United Kingdom",
        "categories": ["medicine"],
        "ingredients_text": "Ibuprofen, gelatin, glycerin, sorbitol, purified water",
        "nutrition": {},
        "product_type": "medicine",
    },
    "0000000000004": {
        "name": "Demo Rose Lipstick",
        "brand": "Demo Beauty",
        "manufacturer": "Demo Beauty Labs",
        "country": "France",
        "categories": ["cosmetics"],
        "ingredients_text": "Castor oil, beeswax, lanolin, carmine, fragrance, alcohol denat",
        "nutrition": {},
        "product_type": "cosmetic",
    },
    "5000112588264": {
        "name": "Coca-Cola Original",
        "brand": "Coca-Cola",
        "manufacturer": "The Coca-Cola Company",
        "country": "Various",
        "categories": ["beverages"],
        "ingredients_text": "Carbonated water, sugar, caramel color, phosphoric acid, natural flavors, caffeine",
        "nutrition": {"energy_kcal": 42, "sugars": 10.6},
        "product_type": "food",
    },
}


async def fetch_open_food_facts(barcode: str) -> ProductInfo | None:
    settings = get_settings()
    url = f"{settings.open_food_facts_base}/product/{barcode}.json"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers={"User-Agent": "HalalDetector/1.0"})
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("status") != 1:
                return None
            p = data.get("product") or {}
            ingredients = (
                p.get("ingredients_text_en")
                or p.get("ingredients_text")
                or ""
            )
            nutriments = p.get("nutriments") or {}
            nutrition = {
                k: nutriments.get(k)
                for k in ("energy-kcal_100g", "fat_100g", "sugars_100g", "proteins_100g", "salt_100g")
                if nutriments.get(k) is not None
            }
            return ProductInfo(
                barcode=barcode,
                name=p.get("product_name") or p.get("generic_name") or "Unknown product",
                brand=p.get("brands"),
                manufacturer=p.get("manufacturing_places") or p.get("brands"),
                country=(p.get("countries") or "").split(",")[0].strip() or None,
                categories=[c.strip() for c in (p.get("categories") or "").split(",") if c.strip()][:8],
                ingredients_text=ingredients,
                nutrition=nutrition,
                image_url=p.get("image_front_url") or p.get("image_url"),
                quantity=p.get("quantity"),
                product_type="food",
            )
    except Exception:
        return None


async def lookup_barcode(barcode: str, product_type: str = "food") -> ProductInfo:
    barcode = barcode.strip()
    if barcode in DEMO_PRODUCTS:
        d = DEMO_PRODUCTS[barcode]
        return ProductInfo(
            barcode=barcode,
            name=d["name"],
            brand=d.get("brand"),
            manufacturer=d.get("manufacturer"),
            country=d.get("country"),
            categories=list(d.get("categories") or []),
            ingredients_text=d.get("ingredients_text"),
            nutrition=dict(d.get("nutrition") or {}),
            product_type=d.get("product_type") or product_type,
        )

    remote = await fetch_open_food_facts(barcode)
    if remote:
        if product_type in {"medicine", "cosmetic"}:
            remote.product_type = product_type
        return remote

    return ProductInfo(
        barcode=barcode,
        name=f"Unknown product ({barcode})",
        brand=None,
        manufacturer=None,
        country=None,
        categories=[],
        ingredients_text=None,
        nutrition={},
        product_type=product_type,
    )
