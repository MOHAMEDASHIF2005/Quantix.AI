from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SupplierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    lead_time_days: int
    reliability_score: float


class ProductBase(BaseModel):
    sku: str = Field(..., max_length=64)
    name: str = Field(..., max_length=200)
    category: str = "General"
    unit_cost: float = Field(ge=0)
    unit_price: float = Field(ge=0)
    current_stock: int = Field(ge=0)
    shelf_life_days: int | None = None
    warehouse_location: str = "MAIN"
    supplier_id: int | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit_cost: float | None = None
    unit_price: float | None = None
    current_stock: int | None = None
    shelf_life_days: int | None = None
    warehouse_location: str | None = None
    reorder_point_override: float | None = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    supplier: SupplierRead | None = None


class DemandRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    period_start: datetime
    units_sold: int
    stockout_occurred: bool


class ProductDetail(ProductRead):
    demand_records: list[DemandRecordRead] = []
