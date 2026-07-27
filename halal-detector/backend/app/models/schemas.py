from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class HalalStatus(str, Enum):
    HALAL = "halal"
    DOUBTFUL = "doubtful"
    HARAM = "haram"


class ScholarSchool(str, Enum):
    HANAFI = "hanafi"
    SHAFII = "shafii"
    MALIKI = "maliki"
    HANBALI = "hanbali"
    GENERAL_SUNNI = "general_sunni"
    CUSTOM_STRICTEST = "custom_strictest"


class IngredientHit(BaseModel):
    id: str
    name: str
    status: HalalStatus
    explanation: str
    e_number: str | None = None
    aliases: list[str] = Field(default_factory=list)
    found_in: list[str] = Field(default_factory=list)
    scientific: str | None = None
    scholarly_notes: str | None = None
    differs_by_school: bool = False
    school_summaries: dict[str, str] = Field(default_factory=dict)
    sources: list[str] = Field(default_factory=list)
    highlight: str = "none"  # red | amber | green | none


class AnalysisResult(BaseModel):
    status: HalalStatus
    status_label: str
    confidence: int = Field(ge=0, le=100)
    confidence_reason: str
    reason: str
    ingredients: list[IngredientHit] = Field(default_factory=list)
    scholarly_banner: str | None = None
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI
    disclaimer: str = (
        "This is informational guidance, not a religious ruling. "
        "Verified facts (labels, certifications, manufacturer data) are separated "
        "from scholarly interpretation. When origin is unknown, status is Doubtful. "
        "Verify uncertain cases with the manufacturer or a trusted local scholar."
    )
    facts: list[str] = Field(default_factory=list)
    interpretations: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class ProductInfo(BaseModel):
    barcode: str | None = None
    name: str
    brand: str | None = None
    manufacturer: str | None = None
    country: str | None = None
    categories: list[str] = Field(default_factory=list)
    ingredients_text: str | None = None
    nutrition: dict[str, Any] = Field(default_factory=dict)
    image_url: str | None = None
    quantity: str | None = None
    product_type: str = "food"  # food | medicine | cosmetic


class CertificationInfo(BaseModel):
    detected: bool = False
    organization: str | None = None
    full_name: str | None = None
    country: str | None = None
    verification_url: str | None = None
    label: str | None = None


class AlternativeProduct(BaseModel):
    name: str
    reason: str
    halal_certified: bool = True
    nearby_hint: str | None = None
    online_hint: str | None = None


class ProductResult(BaseModel):
    product: ProductInfo
    analysis: AnalysisResult
    certification: CertificationInfo | None = None
    alternatives: list[AlternativeProduct] = Field(default_factory=list)
    medicine_notes: list[str] = Field(default_factory=list)
    cosmetic_notes: list[str] = Field(default_factory=list)
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


class TextAnalyzeRequest(BaseModel):
    text: str
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI
    product_type: str = "food"
    product_name: str | None = None


class BarcodeRequest(BaseModel):
    barcode: str
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI
    product_type: str = "food"


class SearchResponse(BaseModel):
    query: str
    results: list[IngredientHit]


class Restaurant(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    distance_km: float | None = None
    rating: float
    status: str
    tags: list[str] = Field(default_factory=list)
    alcohol_served: bool = False
    halal_certified: bool = False
    serves_halal_meat: bool = False
    vegetarian_only: bool = False
    mixed_kitchen: bool = False
    notes: str | None = None


class RestaurantSearchRequest(BaseModel):
    query: str = ""
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float = 10


class MenuItemAnalysis(BaseModel):
    name: str
    status: HalalStatus
    reason: str


class MenuAnalysisResult(BaseModel):
    items: list[MenuItemAnalysis]
    summary: str
    disclaimer: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    status_hint: HalalStatus | None = None
    sources: list[str] = Field(default_factory=list)
    disclaimer: str


class VoiceRequest(BaseModel):
    transcript: str
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI


class VoiceResponse(BaseModel):
    spoken_answer: str
    detailed_answer: str
    status_hint: HalalStatus | None = None


class HistoryItem(BaseModel):
    id: str
    title: str
    subtitle: str | None = None
    status: HalalStatus
    kind: str
    created_at: datetime
    payload: dict[str, Any] = Field(default_factory=dict)


class FavoriteItem(BaseModel):
    id: str
    title: str
    kind: str
    status: HalalStatus | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class UserProfile(BaseModel):
    id: str
    display_name: str = "Guest"
    school: ScholarSchool = ScholarSchool.GENERAL_SUNNI
    text_scale: float = 1.0
    dark_mode: bool = False
    color_blind_friendly: bool = True
    voice_reading: bool = True
    language: str = "en"


class TipResponse(BaseModel):
    tip: str
