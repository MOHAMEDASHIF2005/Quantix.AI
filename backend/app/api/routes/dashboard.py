from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.recommendations import build_for_product
from app.db.database import get_db
from app.db.models import Product
from app.schemas.recommendation import CategoryBreakdown, DashboardKPI, DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    products = db.execute(select(Product)).scalars().all()
    recs = [build_for_product(p) for p in products]
    product_by_id = {p.id: p for p in products}

    total_skus = len(products)
    inventory_value = sum(p.current_stock * p.unit_cost for p in products)

    critical = [r for r in recs if r.urgency == "critical"]
    high = [r for r in recs if r.urgency == "high"]
    at_risk = critical + high
    overstocked = [r for r in recs if r.action == "REDUCE_STOCK"]
    healthy = [r for r in recs if r.action == "HEALTHY"]

    avg_confidence = sum(r.confidence for r in recs) / total_skus if total_skus else 0.0

    stockout_value_at_risk = sum(
        product_by_id[r.product_id].unit_price * r.forecasted_weekly_demand * 2
        for r in at_risk
        if r.product_id in product_by_id
    )

    category_map: dict[str, dict] = defaultdict(lambda: {"sku_count": 0, "inventory_value": 0.0, "at_risk_count": 0})
    rec_by_product = {r.product_id: r for r in recs}
    for p in products:
        entry = category_map[p.category]
        entry["sku_count"] += 1
        entry["inventory_value"] += p.current_stock * p.unit_cost
        rec = rec_by_product.get(p.id)
        if rec and rec.urgency in ("critical", "high"):
            entry["at_risk_count"] += 1

    category_breakdown = [
        CategoryBreakdown(category=cat, sku_count=v["sku_count"], inventory_value=round(v["inventory_value"], 2), at_risk_count=v["at_risk_count"])
        for cat, v in sorted(category_map.items(), key=lambda kv: -kv[1]["inventory_value"])
    ]

    top_urgent = sorted(at_risk, key=lambda r: (r.urgency != "critical", -r.recommended_order_qty))[:8]

    kpis = DashboardKPI(
        total_skus=total_skus,
        inventory_value=round(inventory_value, 2),
        at_risk_skus=len(at_risk),
        critical_skus=len(critical),
        overstocked_skus=len(overstocked),
        healthy_skus=len(healthy),
        avg_forecast_confidence=round(avg_confidence, 3),
        projected_stockout_value_at_risk=round(stockout_value_at_risk, 2),
    )

    return DashboardResponse(kpis=kpis, category_breakdown=category_breakdown, top_urgent=top_urgent)
