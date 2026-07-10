from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from collections import defaultdict
from typing import List

from app.db.database import get_db
from app.db.models import Product
from app.schemas.revenue import RevenuePredictionResponse, SKURevenuePrediction, CategoryRevenuePrediction
from app.services.forecasting_engine import generate_forecast

router = APIRouter(prefix="/revenue", tags=["Revenue"])

@router.get("/predict", response_model=RevenuePredictionResponse)
def get_revenue_predictions(db: Session = Depends(get_db)):
    products = db.execute(select(Product)).scalars().all()
    
    sku_predictions: List[SKURevenuePrediction] = []
    cat_map = defaultdict(lambda: {"skus": 0, "revenue": 0.0, "cost": 0.0, "profit": 0.0})
    
    total_rev = 0.0
    total_cost = 0.0
    total_prof = 0.0
    
    for p in products:
        demand = [r.units_sold for r in p.demand_records]
        forecast = generate_forecast(sku=p.sku, product_id=p.id, demand_units=demand, category=p.category)
        
        expected_units = sum(pt.expected_demand for pt in forecast.forecast)
        
        p_revenue = expected_units * p.unit_price
        p_cost = expected_units * p.unit_cost
        p_profit = p_revenue - p_cost
        
        p_margin = (p_profit / p_revenue * 100.0) if p_revenue > 0 else 0.0
        p_roi = (p_profit / p_cost * 100.0) if p_cost > 0 else 0.0
        
        total_rev += p_revenue
        total_cost += p_cost
        total_prof += p_profit
        
        cat_map[p.category]["skus"] += 1
        cat_map[p.category]["revenue"] += p_revenue
        cat_map[p.category]["cost"] += p_cost
        cat_map[p.category]["profit"] += p_profit
        
        sku_predictions.append(
            SKURevenuePrediction(
                sku=p.sku,
                name=p.name,
                category=p.category,
                predicted_demand=round(expected_units, 1),
                predicted_revenue=round(p_revenue, 2),
                predicted_profit=round(p_profit, 2),
                margin=round(p_margin, 2),
                roi=round(p_roi, 2)
            )
        )
        
    category_predictions: List[CategoryRevenuePrediction] = []
    for cat, metrics in cat_map.items():
        cat_rev = metrics["revenue"]
        cat_cost = metrics["cost"]
        cat_prof = metrics["profit"]
        
        cat_margin = (cat_prof / cat_rev * 100.0) if cat_rev > 0 else 0.0
        cat_roi = (cat_prof / cat_cost * 100.0) if cat_cost > 0 else 0.0
        
        category_predictions.append(
            CategoryRevenuePrediction(
                category=cat,
                sku_count=metrics["skus"],
                predicted_revenue=round(cat_rev, 2),
                predicted_profit=round(cat_prof, 2),
                avg_margin=round(cat_margin, 2),
                avg_roi=round(cat_roi, 2)
            )
        )
        
    global_margin = (total_prof / total_rev * 100.0) if total_rev > 0 else 0.0
    global_roi = (total_prof / total_cost * 100.0) if total_cost > 0 else 0.0
    
    return RevenuePredictionResponse(
        total_revenue=round(total_rev, 2),
        total_profit=round(total_prof, 2),
        avg_margin=round(global_margin, 2),
        avg_roi=round(global_roi, 2),
        sku_predictions=sku_predictions,
        category_predictions=category_predictions
    )
