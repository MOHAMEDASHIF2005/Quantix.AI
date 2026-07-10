from pydantic import BaseModel
from typing import Optional, List

class SimulationRequest(BaseModel):
    scenario: str
    demand_delta: float  # e.g., 0.50 for +50%, -0.20 for -20%
    category: Optional[str] = None
    event_tag: Optional[str] = None

class SKUComparison(BaseModel):
    sku: str
    name: str
    category: str
    current_stock: int
    
    before_demand: float
    before_revenue: float
    before_profit: float
    before_stockout: bool
    
    after_demand: float
    after_revenue: float
    after_profit: float
    after_stockout: bool

class SimulationResponse(BaseModel):
    scenario: str
    demand_delta: float
    category_affected: Optional[str]
    total_skus_affected: int
    
    before_total_revenue: float
    before_total_profit: float
    before_avg_utilization: float
    
    after_total_revenue: float
    after_total_profit: float
    after_avg_utilization: float
    
    sku_breakdown: List[SKUComparison]
    summary_narrative: str
