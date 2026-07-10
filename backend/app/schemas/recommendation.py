from datetime import datetime

from pydantic import BaseModel


class RecommendationFactor(BaseModel):
    """A single named factor that contributed to the recommendation,
    with its directional impact — this is the atomic unit of
    'explainability' surfaced in the UI."""
    label: str
    value: str
    impact: str  # "increases_risk" | "decreases_risk" | "neutral"
    detail: str


class RecommendationResponse(BaseModel):
    product_id: int
    sku: str
    product_name: str
    action: str  # REORDER_NOW / MONITOR / REDUCE_STOCK / HEALTHY
    urgency: str  # critical / high / medium / low
    current_stock: int
    forecasted_weekly_demand: float
    days_of_stock_remaining: float
    reorder_point: float
    safety_stock: float
    economic_order_qty: int
    recommended_order_qty: int
    estimated_stockout_date: str | None
    confidence: float
    factors: list[RecommendationFactor]
    summary: str
    generated_at: datetime


class DashboardKPI(BaseModel):
    total_skus: int
    inventory_value: float
    at_risk_skus: int
    critical_skus: int
    overstocked_skus: int
    healthy_skus: int
    avg_forecast_confidence: float
    projected_stockout_value_at_risk: float


class CategoryBreakdown(BaseModel):
    category: str
    sku_count: int
    inventory_value: float
    at_risk_count: int


class DashboardResponse(BaseModel):
    kpis: DashboardKPI
    category_breakdown: list[CategoryBreakdown]
    top_urgent: list[RecommendationResponse]
