# Quantix AI

**Predict. Optimize. Never Run Out.**

An explainable AI inventory decision platform. It does not just forecast demand — it converts forecasts into concrete purchasing decisions (what to order, how much, and why), with every recommendation traceable to the factors that produced it.

---

## 1. What this is (and isn't)

- **Is:** a decision-support system. Every SKU gets a demand forecast, a reorder recommendation, and a plain-English explanation of the contributing factors (trend, volatility, supplier reliability, seasonality, shelf life, current coverage). You can bring your own data via CSV/Excel upload, and ask the built-in AI assistant questions about your live inventory in plain language.
- **Isn't:** a generic CRUD inventory tracker or a black-box ML forecaster. The AI surfaces as recommendations, an executive narrative, and a grounded chat assistant — never invented numbers.

## 2. Architecture

```
quantix-ai/
├── backend/                 FastAPI service (Python 3.12)
│   └── app/
│       ├── core/            settings
│       ├── db/               SQLAlchemy models, session, seed data
│       ├── schemas/          Pydantic request/response contracts
│       ├── services/         the actual "AI" — forecasting, reorder logic, narrative, dataset cleaning, chat
│       └── api/routes/       thin HTTP layer, no business logic
└── frontend/                 React 18 + TypeScript + Vite + Tailwind + Framer Motion + react-three-fiber
    └── src/
        ├── api/               typed fetch client
        ├── components/        layout, 3D scene, chatbot widget, reusable UI primitives
        ├── charts/            recharts-based forecast/category visualizations
        └── pages/             Landing (3D hero), Dashboard, Inventory, Product Detail, Recommendations, Dataset Upload
```

**Design principle:** business logic lives entirely in `backend/app/services/`, decoupled from both the DB models and the HTTP layer. Swapping the forecasting algorithm, or replacing SQLite with Postgres, touches no route code.

### The five-engine core

| Engine | File | What it does |
|---|---|---|
| Forecasting | `services/forecasting_engine.py` | Holt's double exponential smoothing (level + trend) with automatic weekly-seasonality detection via autocorrelation. Falls back to weighted moving average for new SKUs with <8 weeks of history. Every forecast ships with an 80% confidence band. |
| Recommendation | `services/recommendation_engine.py` | Converts a forecast + current stock position into an action using classical inventory science: safety stock (service-level z-score × demand volatility × √lead time), reorder point, and Economic Order Quantity (Wilson formula). Supplier reliability and shelf life directly widen/narrow the buffer. |
| Insights | `services/insights_engine.py` | Turns the computed KPIs into an executive narrative. Uses Claude via the Anthropic API if `ANTHROPIC_API_KEY` is set (the model interprets numbers, never invents them); otherwise falls back to a deterministic template. |
| Dataset ingestion | `services/dataset_service.py` | Parses an uploaded CSV/Excel file with pandas, reports missing values and duplicate rows, automatically imputes/deduplicates, and maps recognizable columns onto the `Product` schema for commit. |
| Chat | `services/chat_service.py` | Powers the "Ask Quantix" assistant. Every answer is grounded in the same live dashboard JSON the UI renders — Claude (if configured) interprets it conversationally; otherwise a keyword-matched deterministic fallback answers from the same data. |

This split matters: forecasting and reorder math are deterministic and auditable (a business can trust and reproduce them), while the narrative and chat layers are where generative AI adds value — turning numbers into something a non-analyst can act on or ask about.

## 3. Quick start (local, no Docker)

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
On first run the SQLite database is created and auto-seeded with 15 realistic SKUs across 5 categories, each with 26 weeks of synthetic demand history (trend + seasonality + noise, so the forecasting engine has real patterns to find).

API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. The Vite dev server proxies `/api` to `localhost:8000` — no CORS setup needed locally.

## 4. Quick start (Docker)

```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/docs

## 5. Enabling AI-generated executive narratives

By default the dashboard's "AI executive briefing" uses a deterministic template (fully functional, no API key needed). To have Claude generate the narrative instead:

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
```
The model is given only the already-computed KPI JSON and instructed never to invent numbers — it interprets, it doesn't calculate.

## 6. Core workflow

1. **Seed / ingest data** — products + weekly demand history (`db/seed.py` for demo data; `POST /api/v1/products` for real onboarding).
2. **Forecast** — `GET /api/v1/forecasts/{product_id}` runs Holt's method + seasonality detection, returns an 8-week forecast with confidence bands.
3. **Recommend** — `GET /api/v1/recommendations/{product_id}` combines the forecast with stock position, supplier lead time/reliability, and shelf life to produce a reorder decision with a full factor breakdown.
4. **Aggregate** — `GET /api/v1/dashboard` rolls all SKUs up into portfolio-level KPIs (inventory value, at-risk SKUs, revenue-at-risk, category breakdown).
5. **Narrate** — `GET /api/v1/insights/executive-summary` turns the dashboard KPIs into a 3-4 sentence briefing.
6. **Audit** — `GET /api/v1/recommendations?persist=true` writes every recommendation to `recommendation_logs`, so decisions are reproducible after the fact.

## 7. API reference (selected)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/products` | List products (filter by `category`, `search`) |
| GET | `/api/v1/products/{id}` | Product detail + full demand history |
| POST | `/api/v1/products` | Create a product |
| PATCH | `/api/v1/products/{id}` | Update stock, pricing, overrides |
| GET | `/api/v1/forecasts/{id}` | Demand forecast with confidence bands |
| GET | `/api/v1/recommendations` | All recommendations (filter by `urgency`, `action`) |
| GET | `/api/v1/recommendations/{id}` | Single-product recommendation + explainability factors |
| GET | `/api/v1/dashboard` | Portfolio KPIs + category breakdown + top urgent items |
| GET | `/api/v1/insights/executive-summary` | AI-generated (or templated) narrative |
| POST | `/api/v1/datasets/upload` | Upload a CSV/Excel file — validates, cleans, returns a preview |
| POST | `/api/v1/datasets/{id}/commit` | Map a validated dataset's rows into live `Product` records |
| POST | `/api/v1/chat` | Ask the AI assistant a question, grounded in the live dashboard snapshot |

Full interactive schema at `/docs`.

## 8. Extending this into a full production system

This is a complete, working foundation — not a stub. To take it further:

- **Auth & multi-tenancy**: add JWT/session auth and a `tenant_id` on every table; the service layer already takes explicit parameters rather than reading globals, so this is a schema + dependency change, not a rewrite.
- **Postgres**: change `DATABASE_URL`; SQLAlchemy models are already dialect-agnostic.
- **Real data ingestion**: add a CSV/ERP import endpoint that populates `DemandRecord` — the forecasting engine already handles arbitrary-length history.
- **Background jobs**: move recommendation generation to a scheduled Celery/RQ job that persists to `RecommendationLog` nightly, with the API serving cached results instead of recomputing per-request.
- **Model upgrades**: `forecasting_engine.py` is intentionally isolated so Holt's method can be swapped for Prophet, a gradient-boosted model, or an ensemble without touching any route or schema.

## 9. Tech stack

**Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, NumPy, Pandas + openpyxl (dataset ingestion), SQLite (swappable to Postgres)
**Frontend:** React 18, TypeScript (strict), Vite, Tailwind CSS, Recharts, React Router, Framer Motion, react-three-fiber + drei (3D landing hero)
**Infra:** Docker, docker-compose

## 10. Landing page, dataset upload & AI chat

- **Landing page** (`/`) — a 3D animated hero (react-three-fiber) visualizing the AI's reasoning graph, plus a product overview. `/dashboard` is the actual control-room application.
- **Dataset upload** (`/upload`) — drag-and-drop a CSV or Excel file. The backend validates it (missing values, duplicate rows), cleans it automatically, and shows a preview before you commit the rows into live inventory.
- **AI assistant** — a floating chat widget available on every dashboard page. It answers from the same JSON the dashboard renders (via Claude if `ANTHROPIC_API_KEY` is set, otherwise a deterministic fallback), so it never invents a stock number.
