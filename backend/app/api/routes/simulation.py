from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db.models import Product
from app.schemas.simulation import SimulationRequest, SimulationResponse, SKUComparison
from app.services.forecasting_engine import generate_forecast

router = APIRouter(prefix="/simulate", tags=["Simulation"])

@router.post("", response_model=SimulationResponse)
def run_simulation(req: SimulationRequest, db: Session = Depends(get_db)):
    query = select(Product)
    if req.category:
        query = query.where(Product.category == req.category)
    products = db.execute(query).scalars().all()
    
    sku_breakdown: List[SKUComparison] = []
    
    before_rev = 0.0
    before_prof = 0.0
    before_stock_total = 0
    
    after_rev = 0.0
    after_prof = 0.0
    after_stock_total = 0
    
    total_capacity = 0
    
    before_stockouts_count = 0
    after_stockouts_count = 0
    
    multiplier = 1.0 + req.demand_delta
    
    for p in products:
        demand = [r.units_sold for r in p.demand_records]
        
        # Before scenario (base)
        fc_before = generate_forecast(sku=p.sku, product_id=p.id, demand_units=demand, category=p.category)
        total_demand_before = sum(pt.expected_demand for pt in fc_before.forecast)
        p_before_rev = total_demand_before * p.unit_price
        p_before_prof = total_demand_before * (p.unit_price - p.unit_cost)
        p_before_stockout = p.current_stock < total_demand_before
        
        # After scenario (simulated)
        adjusted_demand = [int(u * multiplier) for u in demand]
        fc_after = generate_forecast(sku=p.sku, product_id=p.id, demand_units=adjusted_demand, category=p.category)
        total_demand_after = sum(pt.expected_demand for pt in fc_after.forecast)
        p_after_rev = total_demand_after * p.unit_price
        p_after_prof = total_demand_after * (p.unit_price - p.unit_cost)
        p_after_stockout = p.current_stock < total_demand_after
        
        # Capacity logic
        p_capacity = max(500, p.current_stock * 2)
        total_capacity += p_capacity
        
        p_stock_before = max(0, p.current_stock - int(total_demand_before))
        p_stock_after = max(0, p.current_stock - int(total_demand_after))
        
        before_stock_total += p_stock_before
        after_stock_total += p_stock_after
        
        if p_before_stockout:
            before_stockouts_count += 1
        if p_after_stockout:
            after_stockouts_count += 1
            
        before_rev += p_before_rev
        before_prof += p_before_prof
        
        after_rev += p_after_rev
        after_prof += p_after_prof
        
        sku_breakdown.append(
            SKUComparison(
                sku=p.sku,
                name=p.name,
                category=p.category,
                current_stock=p.current_stock,
                before_demand=round(total_demand_before, 1),
                before_revenue=round(p_before_rev, 2),
                before_profit=round(p_before_prof, 2),
                before_stockout=p_before_stockout,
                after_demand=round(total_demand_after, 1),
                after_revenue=round(p_after_rev, 2),
                after_profit=round(p_after_prof, 2),
                after_stockout=p_after_stockout
            )
        )
        
    before_util = (before_stock_total / total_capacity * 100.0) if total_capacity > 0 else 0.0
    after_util = (after_stock_total / total_capacity * 100.0) if total_capacity > 0 else 0.0
    
    # Generate plain-language summary narrative
    dir_str = "increase" if req.demand_delta >= 0 else "decrease"
    pct_str = f"{abs(req.demand_delta * 100.0):.0f}%"
    cat_str = f" for {req.category}" if req.category else " across all categories"
    event_str = f" due to {req.event_tag}" if req.event_tag else ""
    
    rev_diff = after_rev - before_rev
    rev_pct = (rev_diff / before_rev * 100.0) if before_rev > 0 else 0.0
    
    narrative = (
        f"A simulated {pct_str} demand {dir_str}{cat_str}{event_str} is projected to "
        f"{'increase' if rev_diff >= 0 else 'decrease'} revenue by {abs(rev_pct):.1f}% "
        f"(${abs(rev_diff):,.2f}) and change profit by ${after_prof - before_prof:+,.2f} over the 8-week horizon. "
        f"Stockout risk rises from {before_stockouts_count} to {after_stockouts_count} affected SKUs. "
        f"Projected warehouse capacity utilization drops from {before_util:.1f}% to {after_util:.1f}% "
        f"due to accelerated depletion of stock."
    )
    
    return SimulationResponse(
        scenario=req.scenario,
        demand_delta=req.demand_delta,
        category_affected=req.category,
        total_skus_affected=len(products),
        before_total_revenue=round(before_rev, 2),
        before_total_profit=round(before_prof, 2),
        before_avg_utilization=round(before_util, 2),
        after_total_revenue=round(after_rev, 2),
        after_total_profit=round(after_prof, 2),
        after_avg_utilization=round(after_util, 2),
        sku_breakdown=sku_breakdown,
        summary_narrative=narrative
    )
