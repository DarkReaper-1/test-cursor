from __future__ import annotations

from app.models.schemas import ChatResponse, HalalStatus, ScholarSchool, VoiceResponse
from app.services.analyzer import analyze_single_query
from app.services.ingredient_db import search_ingredients


DISCLAIMER = (
    "Educational answer only — not a fatwa. When status depends on ingredient source "
    "or scholarly interpretation, verify with a trusted local scholar."
)


def answer_question(message: str, school: ScholarSchool = ScholarSchool.GENERAL_SUNNI) -> ChatResponse:
    q = message.strip()
    low = q.lower()

    # Direct ingredient questions
    hit = analyze_single_query(q, school)
    if not hit:
        # try extract after "what is" / "is X halal"
        for prefix in ("what is ", "what's ", "is ", "can i eat ", "can muslims eat "):
            if low.startswith(prefix):
                rest = q[len(prefix) :].strip(" ?!.")
                hit = analyze_single_query(rest, school)
                if hit:
                    break
        if not hit:
            # search keywords
            results = search_ingredients(q, limit=1)
            if results:
                hit = analyze_single_query(results[0]["name"], school)

    if hit:
        differ = ""
        if hit.differs_by_school:
            differ = " Scholarly opinions differ on this ingredient."
        answer = (
            f"{hit.name}: {hit.status.value.upper()}. {hit.explanation}{differ}\n\n"
            f"Simple science: {hit.scientific or 'N/A'}\n"
            f"Under your selected standard ({school.value}): {hit.scholarly_notes or 'See general guidance.'}"
        )
        return ChatResponse(
            answer=answer,
            status_hint=hit.status,
            sources=hit.sources,
            disclaimer=DISCLAIMER,
        )

    if "gelatin" in low and ("why" in low or "haram" in low):
        return ChatResponse(
            answer=(
                "Gelatin is often made from animal bones or skin. If it comes from pigs, it is haram. "
                "If it comes from cows, it must be from a halal-slaughtered animal. "
                "If the source is unknown, label it Doubtful (mashbooh) and verify. "
                "Plant gels like agar or pectin are clear halal alternatives."
            ),
            status_hint=HalalStatus.DOUBTFUL,
            sources=["Halal Detector knowledge base"],
            disclaimer=DISCLAIMER,
        )

    if "rennet" in low or "microbial" in low:
        return ChatResponse(
            answer=(
                "Microbial rennet (and fermentation-produced chymosin) is widely accepted by many scholars "
                "because it is not taken from an animal stomach. Animal rennet needs a halal source. "
                "If the cheese label only says “enzymes,” ask the maker."
            ),
            status_hint=HalalStatus.DOUBTFUL,
            sources=["Halal Detector knowledge base"],
            disclaimer=DISCLAIMER,
        )

    if "shellac" in low:
        return ChatResponse(
            answer=(
                "Shellac is a glaze from lac insects, used on some candies and pills. "
                "Scholarly opinions differ — some permit it as a secretion, others avoid insect products. "
                "Foods that commonly use it include shiny candy coatings and some tablet finishes."
            ),
            status_hint=HalalStatus.DOUBTFUL,
            sources=["Halal Detector knowledge base"],
            disclaimer=DISCLAIMER,
        )

    return ChatResponse(
        answer=(
            "I can help with ingredients (like E471), foods, medicines, and cosmetics. "
            "Try asking: “What is E471?”, “Is vanilla extract halal?”, or “Why is gelatin haram?” "
            "For product decisions, scan the barcode or ingredient list in the app."
        ),
        status_hint=None,
        sources=[],
        disclaimer=DISCLAIMER,
    )


def voice_answer(transcript: str, school: ScholarSchool) -> VoiceResponse:
    chat = answer_question(transcript, school)
    spoken = chat.answer.replace("\n\n", ". ").replace("\n", " ")
    # Keep spoken answer short for older users
    if len(spoken) > 320:
        spoken = spoken[:300].rsplit(" ", 1)[0] + "."
    return VoiceResponse(
        spoken_answer=spoken,
        detailed_answer=chat.answer,
        status_hint=chat.status_hint,
    )
