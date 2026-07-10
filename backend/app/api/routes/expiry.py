from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Product

router = APIRouter(prefix="/expiry", tags=["Expiry"])

class ExpiryItem(BaseModel):
    id: int
    sku: str
    name: str
    category: str
    current_stock: int
    expiry_date: str
    days_until_expiry: int
    unit_price: float

class ActionRequest(BaseModel):
    action: str  # discount / transfer

class ActionResponse(BaseModel):
    status: str
    message: str

@router.get("", response_model=List[ExpiryItem])
def get_expiring_products(
    days: int = Query(default=30, description="Filter: items expiring within N days"),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    limit_date = now + timedelta(days=days)
    
    query = select(Product).where(
        Product.expiry_date.isnot(None),
        Product.expiry_date >= now,
        Product.expiry_date <= limit_date
    ).order_by(Product.expiry_date.asc())
    
    products = db.execute(query).scalars().all()
    
    results = []
    for p in products:
        days_left = (p.expiry_date - now).days
        results.append(
            ExpiryItem(
                id=p.id,
                sku=p.sku,
                name=p.name,
                category=p.category,
                current_stock=p.current_stock,
                expiry_date=p.expiry_date.date().isoformat(),
                days_until_expiry=max(0, days_left),
                unit_price=p.unit_price
            )
        )
    return results

@router.post("/{product_id}/action", response_model=ActionResponse)
def handle_expiry_action(
    product_id: int,
    req: ActionRequest,
    db: Session = Depends(get_db)
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    action = req.action.lower()
    if action not in ("discount", "transfer"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action. Must be 'discount' or 'transfer'")
        
    if action == "discount":
        product.unit_price = round(product.unit_price * 0.8, 2)
        db.commit()
        return ActionResponse(
            status="success",
            message=f"20% discount applied to {product.sku}. New price: ${product.unit_price:.2f}"
        )
    elif action == "transfer":
        transferred = product.current_stock
        product.current_stock = 0
        db.commit()
        return ActionResponse(
            status="success",
            message=f"Transferred {transferred} units of {product.sku} to Nearby Branch (Zone X)."
        )
