from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_product_or_404
from app.db.database import get_db
from app.db.models import Product, Supplier
from app.schemas.product import ProductCreate, ProductDetail, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductRead])
def list_products(category: str | None = None, search: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Product)
    if category:
        stmt = stmt.where(Product.category == category)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(Product.name.ilike(like) | Product.sku.ilike(like))
    return db.execute(stmt.order_by(Product.name)).scalars().all()


@router.get("/{product_id}", response_model=ProductDetail)
def get_product(product: Product = Depends(get_product_or_404)):
    return product


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Product).where(Product.sku == payload.sku)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"SKU '{payload.sku}' already exists")
    if payload.supplier_id is not None and not db.get(Supplier, payload.supplier_id):
        raise HTTPException(status_code=400, detail="Invalid supplier_id")

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(payload: ProductUpdate, product: Product = Depends(get_product_or_404), db: Session = Depends(get_db)):
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field_name, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product: Product = Depends(get_product_or_404), db: Session = Depends(get_db)):
    db.delete(product)
    db.commit()
    return None
