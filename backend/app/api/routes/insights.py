from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes.dashboard import get_dashboard
from app.db.database import get_db
from app.services.insights_engine import generate_executive_narrative

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/executive-summary")
async def executive_summary(db: Session = Depends(get_db)):
    dashboard = get_dashboard(db=db)
    narrative = await generate_executive_narrative(dashboard)
    return {"narrative": narrative}
