from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_product_or_404
from app.db.database import get_db
from app.db.models import Product
from app.schemas.forecast import ForecastResponse
from app.services.forecasting_engine import generate_forecast

router = APIRouter(prefix="/forecasts", tags=["Forecasts"])


@router.get("/{product_id}", response_model=ForecastResponse)
def get_forecast(product: Product = Depends(get_product_or_404), db: Session = Depends(get_db)):
    demand = [r.units_sold for r in product.demand_records]
    return generate_forecast(sku=product.sku, product_id=product.id, demand_units=demand, category=product.category)
