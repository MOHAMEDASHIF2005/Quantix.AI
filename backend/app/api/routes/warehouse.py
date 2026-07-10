from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List, Dict

from app.db.database import get_db
from app.db.models import Product
from app.schemas.warehouse import ShelfHealth, ShelfProduct
from app.api.routes.recommendations import build_for_product

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])

@router.get("/heatmap", response_model=List[ShelfHealth])
def get_warehouse_heatmap(db: Session = Depends(get_db)):
    products = db.execute(select(Product)).scalars().all()
    
    shelves_dict: Dict[str, List[Product]] = {}
    for p in products:
        shelf = p.warehouse_shelf or "A-1"
        if shelf not in shelves_dict:
            shelves_dict[shelf] = []
        shelves_dict[shelf].append(p)
        
    results: List[ShelfHealth] = []
    
    for shelf_name, shelf_products in sorted(shelves_dict.items()):
        prod_details = []
        shelf_stock = 0
        shelf_capacity = 0
        shelf_health = "green"
        
        for p in shelf_products:
            rec = build_for_product(p)
            p_urgency = rec.urgency
            p_action = rec.action
            
            prod_details.append(
                ShelfProduct(
                    sku=p.sku,
                    name=p.name,
                    category=p.category,
                    current_stock=p.current_stock,
                    urgency=p_urgency,
                    action=p_action
                )
            )
            
            shelf_stock += p.current_stock
            shelf_capacity += max(500, p.current_stock * 2)
            
            if p_urgency in ("critical", "high"):
                shelf_health = "red"
            elif p_urgency == "medium" or p_action == "REDUCE_STOCK":
                if shelf_health != "red":
                    shelf_health = "amber"
                    
        utilization = (shelf_stock / shelf_capacity * 100.0) if shelf_capacity > 0 else 0.0
        zone = shelf_name.split("-")[0] if "-" in shelf_name else "MAIN"
        
        results.append(
            ShelfHealth(
                shelf=shelf_name,
                zone=zone,
                health=shelf_health,
                current_stock=shelf_stock,
                capacity=shelf_capacity,
                utilization=round(utilization, 2),
                products=prod_details
            )
        )
        
    return results
