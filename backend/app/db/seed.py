"""
Seed data generator.

Generates a realistic 26-week demand history per product using a
base level + trend + seasonality + noise model, so the forecasting
engine has genuine patterns to detect (rather than pure random data).
Deliberately includes a spread of scenarios — a fast-mover about to
stock out, a slow-mover that's overstocked, a seasonal product, a
volatile product — so the dashboard tells an interesting story out
of the box.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select

from app.db.database import session_scope
from app.db.models import DemandRecord, Product, Supplier

random.seed(42)

WEEKS_OF_HISTORY = 26


def _generate_series(base: float, trend: float, seasonal_amp: float, noise_pct: float, weeks: int) -> list[int]:
    series = []
    for w in range(weeks):
        seasonal = 1 + seasonal_amp * (1 if (w % 4) in (0, 1) else -0.6)
        value = (base + trend * w) * seasonal
        noise = random.gauss(0, value * noise_pct)
        series.append(max(0, round(value + noise)))
    return series


SUPPLIERS = [
    {"name": "Pacific Rim Logistics", "lead_time_days": 21, "reliability_score": 0.86},
    {"name": "Northgate Distribution", "lead_time_days": 7, "reliability_score": 0.97},
    {"name": "Continental Supply Co.", "lead_time_days": 14, "reliability_score": 0.92},
    {"name": "QuickStock Wholesale", "lead_time_days": 4, "reliability_score": 0.99},
]

# (sku, name, category, unit_cost, unit_price, current_stock, shelf_life, supplier_idx, base, trend, seasonal_amp, noise_pct)
PRODUCTS = [
    ("SKU-1001", "Wireless Earbuds Pro", "Electronics", 32.0, 79.0, 45, None, 0, 120, 2.5, 0.08, 0.12),
    ("SKU-1002", "USB-C Fast Charger 65W", "Electronics", 8.5, 24.99, 620, None, 1, 90, 0.4, 0.05, 0.10),
    ("SKU-1003", "Bluetooth Speaker Mini", "Electronics", 14.0, 39.99, 30, None, 0, 65, -1.2, 0.10, 0.15),
    ("SKU-1004", "4K Webcam", "Electronics", 22.0, 54.99, 18, None, 2, 40, 1.8, 0.06, 0.18),
    ("SKU-2001", "Organic Whey Protein 2lb", "Nutrition", 11.0, 29.99, 420, 270, 1, 95, 1.5, 0.15, 0.14),
    ("SKU-2002", "Vitamin D3 Softgels", "Nutrition", 3.2, 12.99, 480, 540, 1, 70, 0.2, 0.04, 0.08),
    ("SKU-2003", "Electrolyte Powder Mix", "Nutrition", 5.5, 18.99, 25, 200, 3, 110, 3.5, 0.30, 0.22),
    ("SKU-3001", "Yoga Mat Premium", "Fitness", 9.0, 34.99, 260, None, 2, 42, 0.3, 0.07, 0.11),
    ("SKU-3002", "Adjustable Dumbbell Set", "Fitness", 65.0, 149.99, 8, None, 0, 15, 0.9, 0.05, 0.20),
    ("SKU-3003", "Resistance Bands Kit", "Fitness", 4.5, 16.99, 340, None, 3, 55, -0.5, 0.09, 0.13),
    ("SKU-4001", "Stainless Steel Water Bottle", "Home & Living", 6.0, 19.99, 340, None, 1, 80, 0.1, 0.06, 0.09),
    ("SKU-4002", "Ceramic Coffee Mug Set", "Home & Living", 7.5, 24.99, 12, None, 2, 38, -0.8, 0.12, 0.16),
    ("SKU-4003", "Aromatherapy Diffuser", "Home & Living", 13.0, 36.99, 90, None, 0, 48, 1.1, 0.20, 0.15),
    ("SKU-5001", "Skincare Vitamin C Serum", "Beauty", 6.8, 28.99, 22, 365, 1, 58, 2.2, 0.10, 0.17),
    ("SKU-5002", "Bamboo Toothbrush 4-pack", "Beauty", 2.1, 9.99, 610, None, 3, 100, 0.3, 0.05, 0.08),
]


def seed_if_empty() -> None:
    with session_scope() as db:
        existing = db.execute(select(Product).limit(1)).scalar_one_or_none()
        if existing:
            return

        suppliers = []
        for s in SUPPLIERS:
            supplier = Supplier(**s)
            db.add(supplier)
            suppliers.append(supplier)
        db.flush()

        start_date = datetime.utcnow() - timedelta(weeks=WEEKS_OF_HISTORY)

        for idx, (sku, name, category, cost, price, stock, shelf, sup_idx, base, trend, amp, noise) in enumerate(PRODUCTS):
            shelf_zones = {"Electronics": "A", "Nutrition": "B", "Fitness": "C", "Home & Living": "D", "Beauty": "E"}
            zone = shelf_zones.get(category, "F")
            shelf_location = f"{zone}-{(idx % 4) + 1}"
            
            expiry_dt = None
            if category == "Nutrition":
                if sku == "SKU-2003":
                    expiry_dt = datetime.utcnow() + timedelta(days=3)
                elif sku == "SKU-2001":
                    expiry_dt = datetime.utcnow() + timedelta(days=15)
                else:
                    expiry_dt = datetime.utcnow() + timedelta(days=45)
            elif category == "Beauty":
                if sku == "SKU-5001":
                    expiry_dt = datetime.utcnow() + timedelta(days=8)
                else:
                    expiry_dt = datetime.utcnow() + timedelta(days=90)
            
            product = Product(
                sku=sku,
                name=name,
                category=category,
                unit_cost=cost,
                unit_price=price,
                current_stock=stock,
                shelf_life_days=shelf,
                warehouse_location="MAIN",
                warehouse_shelf=shelf_location,
                expiry_date=expiry_dt,
                supplier_id=suppliers[sup_idx].id,
            )
            db.add(product)
            db.flush()

            series = _generate_series(base, trend, amp, noise, WEEKS_OF_HISTORY)
            for w, units in enumerate(series):
                db.add(
                    DemandRecord(
                        product_id=product.id,
                        period_start=start_date + timedelta(weeks=w),
                        units_sold=units,
                        stockout_occurred=False,
                    )
                )
