from __future__ import annotations

import re

from app.models.schemas import CertificationInfo
from app.services.ingredient_db import all_certifications


def detect_certification(text: str | None, labels: list[str] | None = None) -> CertificationInfo:
    blob = " ".join([text or "", " ".join(labels or [])]).lower()
    if not blob.strip():
        return CertificationInfo(detected=False)

    for cert in all_certifications():
        names = [cert["name"], cert["full_name"], *(cert.get("aliases") or [])]
        for name in names:
            if not name:
                continue
            pattern = r"\b" + re.escape(name.lower()) + r"\b"
            if re.search(pattern, blob) or name.lower() in blob:
                return CertificationInfo(
                    detected=True,
                    organization=cert["name"],
                    full_name=cert["full_name"],
                    country=cert.get("country"),
                    verification_url=cert.get("verification_url"),
                    label="Certified Halal",
                )
    return CertificationInfo(detected=False)


def detect_certification_from_image_labels(vision_labels: list[str]) -> CertificationInfo:
    return detect_certification(" ".join(vision_labels), vision_labels)
