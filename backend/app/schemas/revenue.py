from pydantic import BaseModel
from typing import List

class SKURevenuePrediction(BaseModel):
    sku: str
    name: str
    category: str
    predicted_demand: float
    predicted_revenue: float
    predicted_profit: float
    margin: float  # percent
    roi: float  # percent

class CategoryRevenuePrediction(BaseModel):
    category: str
    sku_count: int
    predicted_revenue: float
    predicted_profit: float
    avg_margin: float  # percent
    avg_roi: float  # percent

class RevenuePredictionResponse(BaseModel):
    total_revenue: float
    total_profit: float
    avg_margin: float
    avg_roi: float
    sku_predictions: List[SKURevenuePrediction]
    category_predictions: List[CategoryRevenuePrediction]
