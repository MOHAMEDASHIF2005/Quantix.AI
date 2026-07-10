"""
Forecasting Engine
==================

This module implements the demand-forecasting core of Quantix AI.

Design rationale:
  A production inventory platform cannot depend on an LLM to "guess"
  numeric demand — that is unreliable and unauditable. Instead we use
  well-established statistical forecasting (Holt's linear exponential
  smoothing with automatic seasonality detection), and reserve
  generative AI for what it's actually good at: turning the *outputs*
  of a deterministic model into a clear, human narrative
  (see `insights_engine.py` / `explainability_engine.py`).

Method selection:
  - >= 8 periods of history -> Holt's double exponential smoothing
    (level + trend), with additive weekly seasonality applied if
    autocorrelation at the seasonal lag is significant.
  - < 8 periods -> weighted moving average fallback (still fully
    functional, just lower confidence).

All forecasts include a confidence interval derived from in-sample
residual standard deviation, widening with each future step (a
standard random-walk-forecast-error assumption).
"""
from __future__ import annotations

from dataclasses import dataclass, field
import math

import numpy as np

from app.schemas.forecast import ForecastPoint, ForecastResponse, SeasonalityInfo, TrendInfo

SEASONAL_LAG = 4  # weeks; captures monthly-ish cyclicality in weekly data
MIN_PERIODS_FOR_HOLT = 8
FORECAST_HORIZON = 8  # weeks ahead


@dataclass
class DemandSeries:
    values: list[float]
    labels: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.labels:
            self.labels = [f"P{i+1}" for i in range(len(self.values))]


def _holt_linear(values: np.ndarray, alpha: float = 0.35, beta: float = 0.15):
    """Holt's double exponential smoothing (level + trend).

    Returns fitted values, final level, final trend, and residuals —
    used both for point forecasts and for empirical error bands.
    """
    n = len(values)
    level = values[0]
    trend = values[1] - values[0] if n > 1 else 0.0
    fitted = np.zeros(n)
    fitted[0] = level

    for t in range(1, n):
        prev_level = level
        level = alpha * values[t] + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
        fitted[t] = level + trend

    residuals = values - fitted
    return fitted, level, trend, residuals


def _detect_seasonality(values: np.ndarray, lag: int = SEASONAL_LAG) -> SeasonalityInfo:
    n = len(values)
    if n < lag * 2:
        return SeasonalityInfo(detected=False, strength=0.0, pattern="insufficient-history")

    mean = values.mean()
    denom = np.sum((values - mean) ** 2)
    if denom == 0:
        return SeasonalityInfo(detected=False, strength=0.0, pattern="flat-series")

    numer = np.sum((values[lag:] - mean) * (values[:-lag] - mean))
    autocorr = numer / denom
    strength = max(0.0, min(1.0, autocorr))
    detected = strength > 0.35
    pattern = "cyclical-4-period" if detected else "none"
    return SeasonalityInfo(detected=detected, strength=round(float(strength), 3), pattern=pattern)


def _seasonal_indices(values: np.ndarray, lag: int) -> np.ndarray:
    """Average ratio-to-moving-average per seasonal phase, clipped to
    a sane band so a single outlier period can't distort forecasts."""
    n = len(values)
    if n < lag * 2:
        return np.ones(lag)
    overall_mean = values.mean() or 1.0
    indices = np.ones(lag)
    for phase in range(lag):
        phase_vals = values[phase::lag]
        if len(phase_vals) > 0 and overall_mean > 0:
            indices[phase] = np.clip(phase_vals.mean() / overall_mean, 0.5, 1.6)
    # normalize so indices average to 1.0 (preserve overall level)
    indices = indices / indices.mean()
    return indices


def _trend_info(trend_per_period: float, values: np.ndarray) -> TrendInfo:
    mean_level = max(values.mean(), 1e-6)
    normalized = trend_per_period / mean_level
    strength = float(min(1.0, abs(normalized) * 10))
    if normalized > 0.02:
        direction = "rising"
    elif normalized < -0.02:
        direction = "falling"
    else:
        direction = "stable"
    return TrendInfo(direction=direction, slope_per_period=round(float(trend_per_period), 3), strength=round(strength, 3))


def _moving_average_forecast(values: np.ndarray, window: int = 4):
    window = min(window, len(values))
    weights = np.arange(1, window + 1)
    ma = np.average(values[-window:], weights=weights)
    trend = 0.0
    if len(values) >= 2:
        trend = (values[-1] - values[0]) / max(len(values) - 1, 1)
    residuals = values - np.mean(values)
    return ma, trend, residuals


def generate_forecast(sku: str, product_id: int, demand_units: list[int], category: str = "General") -> ForecastResponse:
    if not demand_units:
        demand_units = [0]

    values = np.array(demand_units, dtype=float)
    n = len(values)
    mean_demand = float(values.mean()) if n else 0.0
    std_demand = float(values.std(ddof=0)) if n > 1 else 0.0
    cv = (std_demand / mean_demand) if mean_demand > 0 else 0.0

    seasonality = _detect_seasonality(values)

    if n >= MIN_PERIODS_FOR_HOLT:
        method = "holt-double-exponential-smoothing"
        deseasonalized = values.copy()
        seasonal_idx = np.ones(SEASONAL_LAG)
        if seasonality.detected:
            seasonal_idx = _seasonal_indices(values, SEASONAL_LAG)
            deseasonalized = values / seasonal_idx[np.arange(n) % SEASONAL_LAG]

        fitted, level, trend, residuals = _holt_linear(deseasonalized)
        resid_std = float(np.std(residuals)) if n > 2 else std_demand
        trend_info = _trend_info(trend, values)

        points: list[ForecastPoint] = []
        for h in range(1, FORECAST_HORIZON + 1):
            base = level + trend * h
            if seasonality.detected:
                phase = (n + h - 1) % SEASONAL_LAG
                base *= seasonal_idx[phase]
            base = max(0.0, base)
            # error band widens with sqrt(horizon) — standard for
            # accumulated forecast uncertainty in exponential smoothing
            band = resid_std * math.sqrt(h) * 1.28  # ~80% interval
            points.append(
                ForecastPoint(
                    period_index=h,
                    period_label=f"Week +{h}",
                    expected_demand=round(base, 1),
                    lower_bound=round(max(0.0, base - band), 1),
                    upper_bound=round(base + band, 1),
                )
            )
        confidence = max(0.35, min(0.97, 1 - min(cv, 1.2) * 0.55 - (0.1 if n < 12 else 0)))
    else:
        method = "weighted-moving-average"
        ma, trend, residuals = _moving_average_forecast(values)
        resid_std = float(np.std(residuals)) if n > 1 else max(mean_demand * 0.25, 1.0)
        trend_info = _trend_info(trend, values)
        points = []
        for h in range(1, FORECAST_HORIZON + 1):
            base = max(0.0, ma + trend * h * 0.5)
            band = resid_std * math.sqrt(h) * 1.4
            points.append(
                ForecastPoint(
                    period_index=h,
                    period_label=f"Week +{h}",
                    expected_demand=round(base, 1),
                    lower_bound=round(max(0.0, base - band), 1),
                    upper_bound=round(base + band, 1),
                )
            )
        confidence = max(0.25, min(0.75, 0.6 - min(cv, 1.0) * 0.3))

    # Apply festival multipliers if applicable
    from app.core.festivals import FESTIVALS
    from datetime import datetime, timedelta
    
    now = datetime.utcnow().date()
    influenced_by_festival = None
    festival_multiplier = None
    
    for pt in points:
        pt_date = now + timedelta(weeks=pt.period_index - 1)
        for fest in FESTIVALS:
            fest_date = datetime.strptime(fest["date"], "%Y-%m-%d").date()
            if pt_date <= fest_date < pt_date + timedelta(days=7):
                mult = fest["multipliers"].get(category, fest["multipliers"].get("General", 1.0))
                pt.expected_demand = round(pt.expected_demand * mult, 1)
                pt.lower_bound = round(pt.lower_bound * mult, 1)
                pt.upper_bound = round(pt.upper_bound * mult, 1)
                influenced_by_festival = fest["name"]
                festival_multiplier = mult

    return ForecastResponse(
        product_id=product_id,
        sku=sku,
        method=method,
        history_periods_used=n,
        volatility_cv=round(cv, 3),
        trend=trend_info,
        seasonality=seasonality,
        forecast=points,
        model_confidence=round(confidence, 3),
        influenced_by_festival=influenced_by_festival,
        festival_multiplier=festival_multiplier,
    )
