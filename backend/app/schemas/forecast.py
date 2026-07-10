from pydantic import BaseModel, ConfigDict
from typing import Optional


class ForecastPoint(BaseModel):
    period_index: int
    period_label: str
    expected_demand: float
    lower_bound: float
    upper_bound: float


class SeasonalityInfo(BaseModel):
    detected: bool
    strength: float  # 0-1
    pattern: str  # e.g. "weekly-cyclical", "none"


class TrendInfo(BaseModel):
    direction: str  # rising / falling / stable
    slope_per_period: float
    strength: float  # 0-1, normalized magnitude


class ForecastResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    product_id: int
    sku: str
    method: str
    history_periods_used: int
    volatility_cv: float  # coefficient of variation of demand
    trend: TrendInfo
    seasonality: SeasonalityInfo
    forecast: list[ForecastPoint]
    model_confidence: float  # 0-1, overall confidence in the forecast
    influenced_by_festival: Optional[str] = None
    festival_multiplier: Optional[float] = None
