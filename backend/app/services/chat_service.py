"""
Chat Engine
===========

Powers the "Ask Quantix" assistant widget. Every answer is grounded in
the same structured data the dashboard and recommendation engine already
computed for the current inventory — the model is never asked to invent
a stock number, only to explain or summarize numbers we pass in.

Mirrors the two-mode pattern used by insights_engine.py:
  1. Claude (if ANTHROPIC_API_KEY is set) — natural, conversational answers.
  2. Deterministic fallback — keyword-matched answers built from the same
     live data, so the assistant is fully functional with zero API keys.
"""
from __future__ import annotations

import json
import traceback

import google.generativeai as genai
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.recommendation import DashboardResponse

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = (
    "You are the Quantix AI assistant, embedded in an inventory decision dashboard. "
    "You answer questions about the business's live stock, forecasts, and reorder "
    "recommendations. You are only given a JSON snapshot of the current dashboard "
    "state — use only that data, never invent SKUs, quantities, or supplier details "
    "that aren't present. If the answer isn't in the data, say so plainly. Keep "
    "answers to 2-4 sentences, direct and specific, no markdown headers."
)


async def answer(question: str, dashboard: DashboardResponse) -> dict:
    if settings.GEMINI_API_KEY:
        try:
            text = await _answer_via_gemini(question, dashboard)
            return {"answer": text, "grounded": True, "mode": "gemini"}
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            traceback.print_exc()
    if settings.ANTHROPIC_API_KEY:
        try:
            text = await _answer_via_claude(question, dashboard)
            return {"answer": text, "grounded": True, "mode": "claude"}
        except Exception as e:
            print(f"Error calling Claude: {e}")
            traceback.print_exc()
    return {"answer": _deterministic_answer(question, dashboard), "grounded": True, "mode": "fallback"}


async def _answer_via_gemini(question: str, dashboard: DashboardResponse) -> str:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT
    )
    prompt = (
        f"Dashboard snapshot:\n{json.dumps(dashboard.model_dump(mode='json'))}\n\n"
        f"Question: {question}"
    )
    response = await model.generate_content_async(prompt)
    return response.text


async def _answer_via_claude(question: str, dashboard: DashboardResponse) -> str:
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Dashboard snapshot:\n{json.dumps(dashboard.model_dump(mode='json'))}\n\n"
                    f"Question: {question}"
                ),
            }
        ],
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return "".join(block.get("text", "") for block in data.get("content", []))


def _deterministic_answer(question: str, dashboard: DashboardResponse) -> str:
    q = question.lower()
    critical = [r for r in dashboard.top_urgent if r.urgency == "critical"]

    if any(w in q for w in ["critical", "urgent", "danger", "risk"]):
        if not critical:
            return "Nothing is critical right now — every SKU is above its safety stock threshold."
        names = ", ".join(f"{r.product_name} ({r.sku})" for r in critical[:5])
        return (
            f"{len(critical)} SKU(s) are critical: {names}. Each is projected to run out "
            f"before its supplier can restock — check Recommendations for the full reasoning."
        )

    if any(w in q for w in ["value", "worth", "inventory value"]):
        return f"Total inventory value is currently ₹{dashboard.kpis.inventory_value:,.0f} across {dashboard.kpis.total_skus} SKUs."

    if any(w in q for w in ["confidence", "accurate", "how sure"]):
        return f"The forecasting model's average confidence across all SKUs is {dashboard.kpis.avg_forecast_confidence * 100:.0f}%."

    if any(w in q for w in ["overstock", "excess", "too much"]):
        return f"{dashboard.kpis.overstocked_skus} SKU(s) are currently overstocked relative to demand — see the Recommendations page to review reduce-stock suggestions."

    if any(w in q for w in ["upload", "dataset", "csv", "excel"]):
        return "Head to the Upload Dataset page — drop in a CSV or Excel file and I'll validate, clean, and let you commit it straight into inventory."

    if dashboard.top_urgent:
        top = dashboard.top_urgent[0]
        return (
            f"Here's what stands out right now: {top.product_name} ({top.sku}) is {top.urgency}, "
            f"with {top.days_of_stock_remaining:.1f} days of stock left. Ask me about 'critical items', "
            f"'inventory value', or 'overstock' for more."
        )
    return "I don't have enough live data yet to answer that — try uploading a dataset first."
