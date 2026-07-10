from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_product_or_404
from app.db.database import get_db
from app.db.models import Product, RecommendationLog
from app.schemas.recommendation import RecommendationResponse
from app.services.forecasting_engine import generate_forecast
from app.services.recommendation_engine import build_recommendation

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def build_for_product(product: Product) -> RecommendationResponse:
    demand = [r.units_sold for r in product.demand_records]
    forecast = generate_forecast(sku=product.sku, product_id=product.id, demand_units=demand, category=product.category)
    lead_time = product.supplier.lead_time_days if product.supplier else 10
    reliability = product.supplier.reliability_score if product.supplier else 0.9

    return build_recommendation(
        product_id=product.id,
        sku=product.sku,
        product_name=product.name,
        current_stock=product.current_stock,
        unit_cost=product.unit_cost,
        lead_time_days=lead_time,
        supplier_reliability=reliability,
        shelf_life_days=product.shelf_life_days,
        demand_history=demand,
        forecast=forecast,
        reorder_point_override=product.reorder_point_override,
    )


@router.get("", response_model=list[RecommendationResponse])
def list_recommendations(
    urgency: str | None = Query(default=None, description="Filter: critical, high, medium, low"),
    action: str | None = Query(default=None, description="Filter: REORDER_NOW, MONITOR, REDUCE_STOCK, HEALTHY"),
    persist: bool = Query(default=False, description="Persist results to the audit log"),
    db: Session = Depends(get_db),
):
    products = db.execute(select(Product)).scalars().all()
    results = [build_for_product(p) for p in products]

    if urgency:
        results = [r for r in results if r.urgency == urgency]
    if action:
        results = [r for r in results if r.action == action]

    urgency_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    results.sort(key=lambda r: (urgency_rank.get(r.urgency, 9), -r.recommended_order_qty))

    if persist:
        for r in results:
            db.add(
                RecommendationLog(
                    product_id=r.product_id,
                    action=r.action,
                    urgency=r.urgency,
                    recommended_order_qty=r.recommended_order_qty,
                    forecasted_weekly_demand=r.forecasted_weekly_demand,
                    days_of_stock_remaining=r.days_of_stock_remaining,
                    reasoning=r.summary,
                    confidence=r.confidence,
                )
            )
        db.commit()

    return results


@router.get("/{product_id}", response_model=RecommendationResponse)
def get_recommendation(product: Product = Depends(get_product_or_404)):
    return build_for_product(product)
