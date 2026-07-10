"""
Recommendation Engine
======================

Translates a demand forecast + current inventory position into a
concrete, actionable purchasing decision, using classical inventory
science:

  Safety Stock   = Z * sigma_demand * sqrt(lead_time_weeks)
  Reorder Point  = (avg_weekly_demand * lead_time_weeks) + Safety Stock
  EOQ (Wilson)   = sqrt( (2 * Annual Demand * Ordering Cost) / Holding Cost )

This is the layer a 20-year inventory manager's intuition maps onto:
"how much buffer do I need given how volatile and how long the
resupply pipeline is, and what's the most economical order size."
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

import numpy as np

from app.core.config import settings
from app.schemas.forecast import ForecastResponse
from app.schemas.recommendation import RecommendationFactor, RecommendationResponse


def _classify_urgency(days_of_stock: float, lead_time_days: int) -> tuple[str, str]:
    """Returns (urgency, action)."""
    buffer_days = lead_time_days * 1.15
    if days_of_stock <= lead_time_days * 0.5:
        return "critical", "REORDER_NOW"
    if days_of_stock <= buffer_days:
        return "high", "REORDER_NOW"
    if days_of_stock <= buffer_days * 2:
        return "medium", "MONITOR"
    if days_of_stock >= buffer_days * 5:
        return "low", "REDUCE_STOCK"
    return "low", "HEALTHY"


def build_recommendation(
    *,
    product_id: int,
    sku: str,
    product_name: str,
    current_stock: int,
    unit_cost: float,
    lead_time_days: int,
    supplier_reliability: float,
    shelf_life_days: int | None,
    demand_history: list[int],
    forecast: ForecastResponse,
    reorder_point_override: float | None = None,
) -> RecommendationResponse:
    lead_time_weeks = max(lead_time_days / 7.0, 0.5)
    values = np.array(demand_history, dtype=float) if demand_history else np.array([0.0])
    avg_weekly_demand = float(values[-8:].mean()) if len(values) else 0.0
    std_weekly_demand = float(values[-8:].std(ddof=0)) if len(values) > 1 else avg_weekly_demand * 0.3

    forecasted_weekly_demand = (
        sum(p.expected_demand for p in forecast.forecast[:1]) if forecast.forecast else avg_weekly_demand
    )

    # Reliability discount widens the effective safety buffer for
    # unreliable suppliers — a real inventory manager hedges harder
    # against suppliers who are late or inconsistent.
    reliability_penalty = 1.0 + max(0.0, (0.98 - supplier_reliability)) * 2.5
    z = settings.DEFAULT_SERVICE_LEVEL_Z * reliability_penalty

    safety_stock = z * std_weekly_demand * math.sqrt(lead_time_weeks)
    reorder_point = (
        reorder_point_override
        if reorder_point_override is not None
        else (avg_weekly_demand * lead_time_weeks) + safety_stock
    )

    annual_demand = max(avg_weekly_demand * 52, 1.0)
    holding_cost_per_unit = max(unit_cost * settings.DEFAULT_HOLDING_COST_RATE, 0.01)
    eoq = math.sqrt((2 * annual_demand * settings.DEFAULT_ORDERING_COST) / holding_cost_per_unit)
    eoq = max(1, round(eoq))

    daily_demand = max(forecasted_weekly_demand / 7.0, 0.01)
    days_of_stock = current_stock / daily_demand

    # Perishability: cap useful stock horizon at shelf life so we don't
    # recommend hoarding fast-expiring goods.
    effective_shelf_days = shelf_life_days if shelf_life_days else float("inf")

    urgency, action = _classify_urgency(days_of_stock, lead_time_days)

    if shelf_life_days and days_of_stock > shelf_life_days * 0.85 and current_stock > reorder_point:
        action = "REDUCE_STOCK"
        urgency = "medium" if urgency == "low" else urgency

    gap_to_reorder_point = max(0.0, reorder_point - current_stock)
    if action == "REORDER_NOW":
        recommended_qty = max(eoq, round(gap_to_reorder_point + avg_weekly_demand * lead_time_weeks))
    elif action == "MONITOR":
        recommended_qty = max(0, round(gap_to_reorder_point))
    else:
        recommended_qty = 0

    stockout_date = None
    if daily_demand > 0 and action in ("REORDER_NOW", "MONITOR"):
        stockout_date = (datetime.utcnow() + timedelta(days=days_of_stock)).date().isoformat()

    # --- Explainability factors ---
    factors: list[RecommendationFactor] = []

    factors.append(
        RecommendationFactor(
            label="Forecasted demand trend",
            value=f"{forecast.trend.direction} ({forecast.trend.slope_per_period:+.1f} units/week)",
            impact="increases_risk" if forecast.trend.direction == "rising" else (
                "decreases_risk" if forecast.trend.direction == "falling" else "neutral"
            ),
            detail=(
                f"Demand has been {forecast.trend.direction} over the observed history, "
                f"with trend strength {forecast.trend.strength:.2f} (0-1 scale)."
            ),
        )
    )

    factors.append(
        RecommendationFactor(
            label="Demand volatility",
            value=f"CV = {forecast.volatility_cv:.2f}",
            impact="increases_risk" if forecast.volatility_cv > 0.4 else "neutral",
            detail=(
                "High week-to-week variability forces a larger safety-stock buffer."
                if forecast.volatility_cv > 0.4
                else "Demand is relatively stable, allowing a leaner safety-stock buffer."
            ),
        )
    )

    factors.append(
        RecommendationFactor(
            label="Supplier lead time & reliability",
            value=f"{lead_time_days}d lead time, {supplier_reliability*100:.0f}% reliability",
            impact="increases_risk" if lead_time_days > 10 or supplier_reliability < 0.9 else "neutral",
            detail=(
                f"Replenishment takes {lead_time_days} days. "
                + (
                    "Below-average supplier reliability increases the recommended buffer."
                    if supplier_reliability < 0.9
                    else "Supplier reliability is strong, keeping the buffer efficient."
                )
            ),
        )
    )

    if forecast.seasonality.detected:
        factors.append(
            RecommendationFactor(
                label="Seasonality",
                value=f"Cyclical pattern (strength {forecast.seasonality.strength:.2f})",
                impact="increases_risk",
                detail="A recurring demand cycle was detected; the forecast adjusts order timing to anticipate the next peak.",
            )
        )

    if shelf_life_days:
        factors.append(
            RecommendationFactor(
                label="Shelf life / perishability",
                value=f"{shelf_life_days} days",
                impact="increases_risk" if action == "REDUCE_STOCK" else "neutral",
                detail=(
                    "Current stock covers more time than the product's shelf life allows — "
                    "over-ordering risks spoilage/write-off."
                    if action == "REDUCE_STOCK"
                    else "Stock coverage is within safe shelf-life limits."
                ),
            )
        )

    factors.append(
        RecommendationFactor(
            label="Current coverage",
            value=f"{days_of_stock:.1f} days of stock remaining",
            impact="increases_risk" if urgency in ("critical", "high") else "neutral",
            detail=f"At the forecasted daily demand of {daily_demand:.1f} units, current stock will be exhausted in {days_of_stock:.1f} days.",
        )
    )

    summary = _build_summary(
        action=action,
        urgency=urgency,
        sku=sku,
        days_of_stock=days_of_stock,
        recommended_qty=recommended_qty,
        lead_time_days=lead_time_days,
    )

    return RecommendationResponse(
        product_id=product_id,
        sku=sku,
        product_name=product_name,
        action=action,
        urgency=urgency,
        current_stock=current_stock,
        forecasted_weekly_demand=round(forecasted_weekly_demand, 1),
        days_of_stock_remaining=round(days_of_stock, 1),
        reorder_point=round(reorder_point, 1),
        safety_stock=round(safety_stock, 1),
        economic_order_qty=int(eoq),
        recommended_order_qty=int(recommended_qty),
        estimated_stockout_date=stockout_date,
        confidence=forecast.model_confidence,
        factors=factors,
        summary=summary,
        generated_at=datetime.utcnow(),
    )


def _build_summary(*, action: str, urgency: str, sku: str, days_of_stock: float, recommended_qty: int, lead_time_days: int) -> str:
    if action == "REORDER_NOW":
        return (
            f"Order {recommended_qty} units of {sku} now. At current demand, stock runs out in "
            f"{days_of_stock:.0f} days — tighter than the {lead_time_days}-day supplier lead time."
        )
    if action == "MONITOR":
        return (
            f"{sku} is approaching its reorder point ({days_of_stock:.0f} days of cover left). "
            f"No action required yet; recommend placing a PO for {recommended_qty} units within the next cycle."
        )
    if action == "REDUCE_STOCK":
        return (
            f"{sku} is overstocked relative to demand and/or shelf life. Pause reordering and consider "
            f"a promotion to move existing inventory before it ties up further capital."
        )
    return f"{sku} inventory is healthy with {days_of_stock:.0f} days of coverage. No action needed."
