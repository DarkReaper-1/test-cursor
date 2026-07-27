from __future__ import annotations

import math
import re

from app.models.schemas import (
    HalalStatus,
    MenuAnalysisResult,
    MenuItemAnalysis,
    Restaurant,
    RestaurantSearchRequest,
)


SAMPLE_RESTAURANTS: list[Restaurant] = [
    Restaurant(
        id="r1",
        name="Green Crescent Kitchen",
        address="12 Oak Street",
        latitude=40.7128,
        longitude=-74.0060,
        rating=4.7,
        status="Halal Certified",
        tags=["Halal Certified", "Family friendly"],
        alcohol_served=False,
        halal_certified=True,
        serves_halal_meat=True,
        notes="IFANCA certified kitchen. No alcohol on premise.",
    ),
    Restaurant(
        id="r2",
        name="City Grill House",
        address="88 Market Ave",
        latitude=40.7200,
        longitude=-74.0100,
        rating=4.2,
        status="Serves Halal Meat",
        tags=["Serves Halal Meat", "Mixed Kitchen"],
        alcohol_served=True,
        serves_halal_meat=True,
        mixed_kitchen=True,
        notes="Claims halal meat; shared fryers possible. Alcohol served at bar.",
    ),
    Restaurant(
        id="r3",
        name="Garden Bowl Vegetarian",
        address="5 Pine Road",
        latitude=40.7150,
        longitude=-73.9950,
        rating=4.5,
        status="Vegetarian Only",
        tags=["Vegetarian Only"],
        vegetarian_only=True,
        alcohol_served=False,
        notes="Plant-based menu. Confirm cross-contact policies if needed.",
    ),
    Restaurant(
        id="r4",
        name="Harbor Sushi & Bar",
        address="22 Dock Lane",
        latitude=40.7050,
        longitude=-74.0200,
        rating=4.0,
        status="Mixed Kitchen",
        tags=["Mixed Kitchen", "Alcohol Served"],
        alcohol_served=True,
        mixed_kitchen=True,
        notes="Seafood and non-halal meats; alcohol served.",
    ),
    Restaurant(
        id="r5",
        name="Anatolia Doner",
        address="401 Cedar Blvd",
        latitude=40.7300,
        longitude=-73.9900,
        rating=4.6,
        status="Halal Certified",
        tags=["Halal Certified", "Serves Halal Meat"],
        alcohol_served=False,
        halal_certified=True,
        serves_halal_meat=True,
        notes="Local council certification displayed.",
    ),
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def search_restaurants(req: RestaurantSearchRequest) -> list[Restaurant]:
    q = (req.query or "").lower().strip()
    results: list[Restaurant] = []
    for r in SAMPLE_RESTAURANTS:
        if q and q not in r.name.lower() and q not in r.status.lower() and not any(q in t.lower() for t in r.tags):
            continue
        item = r.model_copy()
        if req.latitude is not None and req.longitude is not None:
            item.distance_km = round(
                _haversine_km(req.latitude, req.longitude, r.latitude, r.longitude), 2
            )
            if item.distance_km > req.radius_km:
                continue
        results.append(item)
    results.sort(key=lambda x: (x.distance_km is None, x.distance_km or 0, -x.rating))
    return results


PORK_WORDS = {"pork", "bacon", "ham", "pepperoni", "lard", "prosciutto", "sausage"}
ALCOHOL_WORDS = {"wine", "beer", "rum", "whiskey", "cocktail", "vodka", "sake", "mirin"}
DOUBTFUL_WORDS = {"gelatin", "marshmallow", "natural flavor", "rennet", "cross-contaminated", "shared fryer"}


def analyze_menu_text(text: str) -> MenuAnalysisResult:
    lines = [ln.strip() for ln in re.split(r"[\n•;]+", text) if ln.strip()]
    items: list[MenuItemAnalysis] = []
    for line in lines[:40]:
        low = line.lower()
        if any(w in low for w in PORK_WORDS):
            items.append(MenuItemAnalysis(name=line, status=HalalStatus.HARAM, reason="Appears to contain pork or pork product."))
        elif any(w in low for w in ALCOHOL_WORDS):
            items.append(MenuItemAnalysis(name=line, status=HalalStatus.HARAM, reason="Appears to be an alcohol dish or drink."))
        elif any(w in low for w in DOUBTFUL_WORDS):
            items.append(MenuItemAnalysis(name=line, status=HalalStatus.DOUBTFUL, reason="Needs confirmation (ingredients or kitchen practice)."))
        elif re.search(r"\b(chicken|lamb|beef|fish|vegetable|falafel|hummus|salad)\b", low):
            items.append(MenuItemAnalysis(name=line, status=HalalStatus.DOUBTFUL, reason="Likely acceptable if meat is halal and kitchen is not mixed — confirm with staff."))
        else:
            items.append(MenuItemAnalysis(name=line, status=HalalStatus.DOUBTFUL, reason="Could not fully verify from menu text alone."))

    haram_n = sum(1 for i in items if i.status == HalalStatus.HARAM)
    summary = f"Found {len(items)} menu lines: {haram_n} clearly risky, others need confirmation."
    return MenuAnalysisResult(
        items=items,
        summary=summary,
        disclaimer="Menu OCR/AI is approximate. Ask the restaurant about meat sources, fryer oil, and alcohol.",
    )
