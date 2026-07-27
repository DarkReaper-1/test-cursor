from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Halal Detector API"
    api_prefix: str = "/api/v1"
    debug: bool = True
    database_url: str = f"sqlite+aiosqlite:///{ROOT / 'backend' / 'halal.db'}"
    ingredients_path: Path = DATA_DIR / "ingredients.json"
    open_food_facts_base: str = "https://world.openfoodfacts.org/api/v2"
    cors_origins: list[str] = ["*"]
    jwt_secret: str = "dev-change-me-halal-detector"
    jwt_algorithm: str = "HS256"
    # Optional cloud AI key — when absent, heuristic explanations are used.
    openai_api_key: str | None = None
    firebase_project_id: str | None = None
    rate_limit: str = "60/minute"


@lru_cache
def get_settings() -> Settings:
    return Settings()
