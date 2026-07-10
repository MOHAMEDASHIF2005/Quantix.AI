from pydantic import BaseModel
from typing import List

class ShelfProduct(BaseModel):
    sku: str
    name: str
    category: str
    current_stock: int
    urgency: str  # critical / high / medium / low
    action: str

class ShelfHealth(BaseModel):
    shelf: str
    zone: str
    health: str  # red / amber / green
    current_stock: int
    capacity: int
    utilization: float  # percent
    products: List[ShelfProduct]
