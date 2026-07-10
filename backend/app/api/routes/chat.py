from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.dashboard import get_dashboard
from app.db.database import get_db
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    grounded: bool
    mode: str


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    dashboard = get_dashboard(db=db)
    result = await chat_service.answer(payload.message, dashboard)
    return ChatResponse(**result)
