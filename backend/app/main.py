"""
Quantix AI — API entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

Docs available at /docs (Swagger) and /redoc.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, dashboard, datasets, forecasts, insights, products, recommendations, simulation, warehouse, expiry, revenue
from app.core.config import settings
from app.db.database import Base, engine
from app.db.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_if_empty()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Explainable AI Inventory Decision Platform — Predict. Optimize. Never Run Out.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(forecasts.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(insights.router, prefix=settings.API_V1_PREFIX)
app.include_router(datasets.router, prefix=settings.API_V1_PREFIX)
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(simulation.router, prefix=settings.API_V1_PREFIX)
app.include_router(warehouse.router, prefix=settings.API_V1_PREFIX)
app.include_router(expiry.router, prefix=settings.API_V1_PREFIX)
app.include_router(revenue.router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME, "environment": settings.ENVIRONMENT}


@app.get("/", tags=["System"])
def root():
    return {
        "message": "Quantix AI API — Predict. Optimize. Never Run Out.",
        "docs": "/docs",
    }
