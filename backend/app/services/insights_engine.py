"""
Insights Engine
================

Generates an executive-level narrative from the deterministic outputs
of the forecasting + recommendation engines.

Two modes:
  1. LLM mode (if ANTHROPIC_API_KEY is configured): sends the
     structured KPI/recommendation data to Claude and asks for a
     concise, decision-oriented narrative in the voice of a veteran
     inventory manager. The model never invents numbers — it is only
     asked to interpret numbers we already computed.
  2. Deterministic fallback: template-based narrative so the product
     is fully functional (and demoable) with zero external
     dependencies or API keys.
"""
from __future__ import annotations

import json
import traceback

import google.generativeai as genai
import httpx

from app.core.config import settings
from app.schemas.recommendation import DashboardResponse

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-6"


async def generate_executive_narrative(dashboard: DashboardResponse) -> str:
    if settings.GEMINI_API_KEY:
        try:
            return await _generate_via_gemini(dashboard)
        except Exception as e:
            print(f"Error generating insights via Gemini: {e}")
            traceback.print_exc()
    if settings.ANTHROPIC_API_KEY:
        try:
            return await _generate_via_claude(dashboard)
        except Exception as e:
            print(f"Error generating insights via Claude: {e}")
            traceback.print_exc()
    return _deterministic_narrative(dashboard)


async def _generate_via_gemini(dashboard: DashboardResponse) -> str:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    system_instruction = (
        "You are a 20-year veteran inventory and supply chain manager writing a "
        "3-4 sentence executive briefing for a business owner. Use only the "
        "structured data provided — never invent numbers. Be direct, specific, "
        "and action-oriented. No preamble, no markdown headers."
    )
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_instruction
    )
    prompt = json.dumps(dashboard.model_dump(mode="json"))
    response = await model.generate_content_async(prompt)
    return response.text.strip()


async def _generate_via_claude(dashboard: DashboardResponse) -> str:
    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 400,
        "system": (
            "You are a 20-year veteran inventory and supply chain manager writing a "
            "3-4 sentence executive briefing for a business owner. Use only the "
            "structured data provided — never invent numbers. Be direct, specific, "
            "and action-oriented. No preamble, no markdown headers."
        ),
        "messages": [
            {
                "role": "user",
                "content": json.dumps(dashboard.model_dump(mode="json")),
            }
        ],
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "content-type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        text_blocks = [b["text"] for b in data.get("content", []) if b.get("type") == "text"]
        return " ".join(text_blocks).strip() or _deterministic_narrative_from_dict(payload)


def _deterministic_narrative(dashboard: DashboardResponse) -> str:
    k = dashboard.kpis
    lines = []
    if k.critical_skus > 0:
        lines.append(
            f"{k.critical_skus} SKU{'s are' if k.critical_skus != 1 else ' is'} at critical risk of stocking out "
            f"before replenishment arrives, putting an estimated {k.projected_stockout_value_at_risk:,.0f} in "
            f"revenue-at-risk on the line."
        )
    elif k.at_risk_skus > 0:
        lines.append(
            f"{k.at_risk_skus} SKUs need attention this week, though none are yet at critical risk."
        )
    else:
        lines.append("Inventory health is strong across the catalog — no SKUs currently need urgent action.")

    if k.overstocked_skus > 0:
        lines.append(
            f"{k.overstocked_skus} SKUs are overstocked relative to demand; consider promotions or paused "
            f"reordering to free up working capital."
        )

    lines.append(
        f"Overall forecast confidence sits at {k.avg_forecast_confidence*100:.0f}%, based on {k.total_skus} "
        f"tracked SKUs worth {k.inventory_value:,.0f} in current inventory value."
    )
    return " ".join(lines)


def _deterministic_narrative_from_dict(_: dict) -> str:
    return "Executive summary unavailable — showing computed KPIs only."
