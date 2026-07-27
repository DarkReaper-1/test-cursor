from __future__ import annotations

import json
import random
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FavoriteRow, HistoryRow, ProfileRow
from app.db.session import get_session
from app.models.schemas import (
    BarcodeRequest,
    ChatRequest,
    ChatResponse,
    FavoriteItem,
    HistoryItem,
    RestaurantSearchRequest,
    ScholarSchool,
    SearchResponse,
    TextAnalyzeRequest,
    TipResponse,
    UserProfile,
    VoiceRequest,
    VoiceResponse,
)
from app.services.analyzer import analyze_ingredient_list, ingredient_to_hit
from app.services.chat import answer_question, voice_answer
from app.services.ingredient_db import daily_tips, search_ingredients
from app.services.ocr import DEMO_OCR_SAMPLES, parse_label_text
from app.services.product_pipeline import analyze_barcode
from app.services.restaurants import analyze_menu_text, search_restaurants

router = APIRouter()


@router.get("/health")
async def health():
    return {"ok": True, "service": "halal-detector"}


@router.get("/tip", response_model=TipResponse)
async def tip():
    tips = daily_tips()
    return TipResponse(tip=random.choice(tips) if tips else "Scan labels and verify uncertain ingredients.")


@router.post("/analyze/text")
async def analyze_text(body: TextAnalyzeRequest, session: AsyncSession = Depends(get_session)):
    analysis = analyze_ingredient_list(body.text, school=body.school, product_type=body.product_type)
    # persist history
    hid = str(uuid.uuid4())
    row = HistoryRow(
        id=hid,
        title=body.product_name or "Ingredient analysis",
        subtitle=analysis.reason[:120],
        status=analysis.status.value,
        kind="text",
        payload_json=json.dumps({"text": body.text, "analysis": analysis.model_dump(mode="json")}),
    )
    session.add(row)
    await session.commit()
    return {"id": hid, "analysis": analysis}


@router.post("/analyze/barcode")
async def analyze_barcode_route(body: BarcodeRequest, session: AsyncSession = Depends(get_session)):
    result = await analyze_barcode(body.barcode, school=body.school, product_type=body.product_type)
    hid = str(uuid.uuid4())
    row = HistoryRow(
        id=hid,
        title=result.product.name,
        subtitle=result.analysis.reason[:120],
        status=result.analysis.status.value,
        kind="barcode",
        payload_json=result.model_dump_json(),
    )
    session.add(row)
    await session.commit()
    return {"id": hid, "result": result}


@router.post("/analyze/ocr")
async def analyze_ocr(
    school: ScholarSchool = Form(ScholarSchool.GENERAL_SUNNI),
    demo_key: str | None = Form(None),
    text: str | None = Form(None),
    file: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
):
    raw = text or ""
    if demo_key and demo_key in DEMO_OCR_SAMPLES:
        raw = DEMO_OCR_SAMPLES[demo_key]
    elif file is not None:
        # Placeholder: production would run cloud/on-device OCR on file bytes.
        # For now, if no text provided, use a safe demo path.
        _ = await file.read()
        if not raw:
            raw = DEMO_OCR_SAMPLES["gummies"]
    if not raw.strip():
        raise HTTPException(400, "Provide label text, demo_key, or an image file")
    parsed = parse_label_text(raw, school=school)
    hid = str(uuid.uuid4())
    row = HistoryRow(
        id=hid,
        title="Label OCR",
        subtitle=parsed["analysis"].reason[:120],
        status=parsed["analysis"].status.value,
        kind="ocr",
        payload_json=json.dumps(
            {
                "raw_text": parsed["raw_text"],
                "lines": parsed["lines"],
                "analysis": parsed["analysis"].model_dump(mode="json"),
            }
        ),
    )
    session.add(row)
    await session.commit()
    return {"id": hid, **parsed}


@router.get("/ingredients/search", response_model=SearchResponse)
async def ingredients_search(q: str = Query(""), school: ScholarSchool = ScholarSchool.GENERAL_SUNNI):
    rows = search_ingredients(q)
    hits = [ingredient_to_hit(r, school) for r in rows]
    return SearchResponse(query=q, results=hits)


@router.get("/ingredients/{ingredient_id}")
async def ingredient_detail(ingredient_id: str, school: ScholarSchool = ScholarSchool.GENERAL_SUNNI):
    rows = search_ingredients(ingredient_id, limit=50)
    match = next((r for r in rows if r["id"] == ingredient_id or r["name"].lower() == ingredient_id.lower()), None)
    if not match:
        # fallback exact find via search
        from app.services.ingredient_db import find_ingredient

        match = find_ingredient(ingredient_id)
    if not match:
        raise HTTPException(404, "Ingredient not found")
    return ingredient_to_hit(match, school)


@router.post("/restaurants/search")
async def restaurants_search(body: RestaurantSearchRequest):
    return {"results": search_restaurants(body)}


@router.post("/restaurants/menu")
async def restaurants_menu(text: str = Form(...), demo: bool = Form(False)):
    if demo and not text.strip():
        text = "Chicken Shawarma\nBacon Cheeseburger\nVegetable Falafel\nWine Spritzer\nLamb Kofta\nMarshmallow Sundae"
    return analyze_menu_text(text)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    return answer_question(body.message, body.school)


@router.post("/voice", response_model=VoiceResponse)
async def voice(body: VoiceRequest):
    return voice_answer(body.transcript, body.school)


@router.get("/history", response_model=list[HistoryItem])
async def list_history(q: str = "", session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(HistoryRow).order_by(HistoryRow.created_at.desc()).limit(200))
    rows = result.scalars().all()
    items = []
    for r in rows:
        if q and q.lower() not in (r.title or "").lower() and q.lower() not in (r.subtitle or "").lower():
            continue
        items.append(
            HistoryItem(
                id=r.id,
                title=r.title,
                subtitle=r.subtitle,
                status=r.status,  # type: ignore[arg-type]
                kind=r.kind,
                created_at=r.created_at or datetime.utcnow(),
                payload=json.loads(r.payload_json or "{}"),
            )
        )
    return items


@router.get("/favorites", response_model=list[FavoriteItem])
async def list_favorites(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(FavoriteRow).order_by(FavoriteRow.created_at.desc()))
    rows = result.scalars().all()
    return [
        FavoriteItem(
            id=r.id,
            title=r.title,
            kind=r.kind,
            status=r.status,  # type: ignore[arg-type]
            payload=json.loads(r.payload_json or "{}"),
        )
        for r in rows
    ]


@router.post("/favorites", response_model=FavoriteItem)
async def add_favorite(item: FavoriteItem, session: AsyncSession = Depends(get_session)):
    fid = item.id or str(uuid.uuid4())
    row = FavoriteRow(
        id=fid,
        title=item.title,
        kind=item.kind,
        status=item.status.value if item.status else None,
        payload_json=json.dumps(item.payload),
    )
    session.add(row)
    await session.commit()
    return FavoriteItem(id=fid, title=item.title, kind=item.kind, status=item.status, payload=item.payload)


@router.delete("/favorites/{favorite_id}")
async def delete_favorite(favorite_id: str, session: AsyncSession = Depends(get_session)):
    row = await session.get(FavoriteRow, favorite_id)
    if not row:
        raise HTTPException(404, "Favorite not found")
    await session.delete(row)
    await session.commit()
    return {"ok": True}


@router.get("/profile", response_model=UserProfile)
async def get_profile(session: AsyncSession = Depends(get_session)):
    row = await session.get(ProfileRow, "guest")
    if not row:
        return UserProfile(id="guest")
    return UserProfile(
        id=row.id,
        display_name=row.display_name,
        school=ScholarSchool(row.school),
        text_scale=float(row.text_scale),
        dark_mode=row.dark_mode == "true",
        color_blind_friendly=row.color_blind_friendly == "true",
        voice_reading=row.voice_reading == "true",
        language=row.language,
    )


@router.put("/profile", response_model=UserProfile)
async def put_profile(profile: UserProfile, session: AsyncSession = Depends(get_session)):
    row = await session.get(ProfileRow, profile.id or "guest")
    if not row:
        row = ProfileRow(id=profile.id or "guest")
        session.add(row)
    row.display_name = profile.display_name
    row.school = profile.school.value
    row.text_scale = str(profile.text_scale)
    row.dark_mode = "true" if profile.dark_mode else "false"
    row.color_blind_friendly = "true" if profile.color_blind_friendly else "false"
    row.voice_reading = "true" if profile.voice_reading else "false"
    row.language = profile.language
    await session.commit()
    return profile
