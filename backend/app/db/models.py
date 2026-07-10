"""
Core domain models.

Design notes:
- `Product` is the aggregate root for inventory decisions.
- `DemandRecord` stores the historical time series used for forecasting
  (one row per period, currently weekly granularity).
- `RecommendationLog` persists every AI-generated recommendation so the
  platform has an auditable decision trail (critical for an "explainable
  AI" product — decisions must be reproducible after the fact).
"""
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=7)
    reliability_score: Mapped[float] = mapped_column(Float, default=0.95)  # 0-1

    products: Mapped[list["Product"]] = relationship(back_populates="supplier")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General")

    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)

    current_stock: Mapped[int] = mapped_column(Integer, default=0)
    reorder_point_override: Mapped[float | None] = mapped_column(Float, nullable=True)

    shelf_life_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = non-perishable
    warehouse_location: Mapped[str] = mapped_column(String(80), default="MAIN")
    warehouse_shelf: Mapped[str | None] = mapped_column(String(20), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    supplier: Mapped["Supplier"] = relationship(back_populates="products")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    demand_records: Mapped[list["DemandRecord"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="DemandRecord.period_start"
    )
    recommendations: Mapped[list["RecommendationLog"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class DemandRecord(Base):
    """One historical period (weekly) of observed demand for a product."""

    __tablename__ = "demand_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    period_start: Mapped[datetime] = mapped_column(DateTime, index=True)
    units_sold: Mapped[int] = mapped_column(Integer, default=0)
    stockout_occurred: Mapped[bool] = mapped_column(Integer, default=0)  # 0/1 flag

    product: Mapped["Product"] = relationship(back_populates="demand_records")


class RecommendationLog(Base):
    """
    Auditable record of every recommendation the engine produced.

    Persisting these (rather than computing on the fly only) is what
    makes the platform "explainable" in a durable, defensible way —
    a business user can always trace back *why* a PO of X units was
    suggested on a given date.
    """

    __tablename__ = "recommendation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    action: Mapped[str] = mapped_column(String(40))  # REORDER_NOW / MONITOR / REDUCE_STOCK / HEALTHY
    urgency: Mapped[str] = mapped_column(String(20))  # critical / high / medium / low
    recommended_order_qty: Mapped[int] = mapped_column(Integer, default=0)
    forecasted_weekly_demand: Mapped[float] = mapped_column(Float, default=0.0)
    days_of_stock_remaining: Mapped[float] = mapped_column(Float, default=0.0)
    reasoning: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    product: Mapped["Product"] = relationship(back_populates="recommendations")


class Dataset(Base):
    """
    An uploaded inventory/sales file (CSV or Excel), plus a durable record
    of what validation and automatic cleaning was performed on it. Kept
    even after commit so every AI recommendation can eventually be traced
    back to the raw file it was derived from.
    """

    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_rows_removed: Mapped[int] = mapped_column(Integer, default=0)
    missing_cells_filled: Mapped[int] = mapped_column(Integer, default=0)

    columns_json: Mapped[str] = mapped_column(Text, default="[]")
    preview_json: Mapped[str] = mapped_column(Text, default="[]")
    warnings_json: Mapped[str] = mapped_column(Text, default="[]")

    status: Mapped[str] = mapped_column(String(20), default="validated")  # validated / committed
    products_created: Mapped[int] = mapped_column(Integer, default=0)
    cleaned_csv: Mapped[str] = mapped_column(Text, default="")
