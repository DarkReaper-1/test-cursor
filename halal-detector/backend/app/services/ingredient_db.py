from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = text.replace("–", "-").replace("—", "-")
    text = re.sub(r"[^a-z0-9\s\-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


@lru_cache
def load_database() -> dict[str, Any]:
    path = Path(get_settings().ingredients_path)
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def all_ingredients() -> list[dict[str, Any]]:
    return list(load_database().get("ingredients", []))


def all_certifications() -> list[dict[str, Any]]:
    return list(load_database().get("certifications", []))


def daily_tips() -> list[str]:
    return list(load_database().get("daily_tips", []))


def build_lookup() -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for item in all_ingredients():
        keys = [item["name"], item["id"], item.get("e_number") or ""]
        keys.extend(item.get("aliases") or [])
        for key in keys:
            norm = _normalize(key)
            if norm:
                lookup[norm] = item
    return lookup


@lru_cache
def get_lookup() -> dict[str, dict[str, Any]]:
    return build_lookup()


def find_ingredient(query: str) -> dict[str, Any] | None:
    lookup = get_lookup()
    norm = _normalize(query)
    if not norm:
        return None
    if norm in lookup:
        return lookup[norm]
    # Prefer longer, more specific keys. Only allow containment when the
    # query itself is reasonably specific (avoids "acid" → "carminic acid").
    candidates: list[tuple[int, dict[str, Any]]] = []
    for key, item in lookup.items():
        if len(key) < 4:
            continue
        if key == norm:
            return item
        if key in norm and len(key) >= 5:
            candidates.append((len(key), item))
        elif norm in key and len(norm) >= 6:
            candidates.append((len(norm), item))
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[0])
    return candidates[0][1]


def search_ingredients(query: str, limit: int = 25) -> list[dict[str, Any]]:
    norm = _normalize(query)
    if not norm:
        return all_ingredients()[:limit]
    scored: list[tuple[int, dict[str, Any]]] = []
    seen: set[str] = set()
    for item in all_ingredients():
        if item["id"] in seen:
            continue
        blob = " ".join(
            [
                item["name"],
                item["id"],
                item.get("e_number") or "",
                " ".join(item.get("aliases") or []),
                item.get("definition") or "",
            ]
        )
        blob_n = _normalize(blob)
        if norm == _normalize(item["name"]) or norm == _normalize(item.get("e_number") or ""):
            score = 100
        elif norm in blob_n:
            score = 80 if blob_n.startswith(norm) else 60
        else:
            continue
        seen.add(item["id"])
        scored.append((score, item))
    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return [i for _, i in scored[:limit]]


E_NUMBER_RE = re.compile(r"\be\s?-?\s?(\d{3,4}[a-z]?)\b", re.I)


def extract_candidate_tokens(text: str) -> list[str]:
    """Split ingredient lists into searchable tokens."""
    cleaned = text.replace("\n", ",").replace(";", ",")
    cleaned = re.sub(r"\([^)]*\)", " ", cleaned)
    parts = [p.strip() for p in cleaned.split(",") if p.strip()]
    tokens: list[str] = []
    for part in parts:
        tokens.append(part)
        for match in E_NUMBER_RE.finditer(part):
            tokens.append(f"E{match.group(1).upper()}")
        # also keep shorter words for hidden animal terms
        for word in re.split(r"[/\s]+", part):
            if len(word) >= 4:
                tokens.append(word)
    # preserve order, unique
    out: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        n = _normalize(t)
        if n and n not in seen:
            seen.add(n)
            out.append(t)
    return out
