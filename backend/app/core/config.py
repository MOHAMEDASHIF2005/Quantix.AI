"""
Application configuration.

Centralized settings loaded from environment variables. Using
pydantic-settings ensures type validation and a single source of
truth for configuration across the whole backend.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Quantix AI"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "sqlite:///./quantix.db"

    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://quantix-ai-frontend.onrender.com"

    # --- Inventory science defaults (overridable per-product) ---
    DEFAULT_SERVICE_LEVEL_Z: float = 1.65  # ~95% service level
    DEFAULT_HOLDING_COST_RATE: float = 0.22  # % of unit cost per year
    DEFAULT_ORDERING_COST: float = 45.0  # currency units per PO

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
