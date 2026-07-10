"""
Dataset ingestion engine
========================

Takes a raw uploaded CSV/Excel file and turns it into:
  1. A validation report (missing values, duplicate rows, column types).
  2. An automatically cleaned DataFrame (duplicates dropped, missing
     values imputed with a defensible default so downstream forecasting
     never chokes on NaNs).
  3. A JSON-safe preview (first 10 rows) for the frontend.

This mirrors the "How Quantix AI works" pipeline: upload -> validate ->
clean -> analyze. The AI/forecasting layer never sees raw, dirty data.
"""
from __future__ import annotations

import io
from typing import Any

import pandas as pd

REQUIRED_ANY_OF = ["sku", "name"]  # dataset must identify products somehow


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [
        str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns
    ]
    return df


def _json_safe(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if hasattr(value, "item"):  # numpy scalar
        return value.item()
    return value


def parse_file(filename: str, raw_bytes: bytes) -> pd.DataFrame:
    lower = filename.lower()
    buffer = io.BytesIO(raw_bytes)
    if lower.endswith(".csv"):
        return pd.read_csv(buffer)
    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        return pd.read_excel(buffer)
    raise ValueError("Unsupported file type — please upload a .csv or .xlsx file")


def validate_and_clean(filename: str, raw_bytes: bytes) -> dict:
    df = parse_file(filename, raw_bytes)
    if df.empty:
        raise ValueError("The uploaded file has no rows")

    df = _normalize_columns(df)
    original_rows = len(df)

    # --- 1. Missing value report (before cleaning) ---
    warnings: list[dict] = []
    missing_counts = df.isna().sum()
    for col, count in missing_counts.items():
        if count > 0:
            warnings.append({"column": col, "issue": "missing_values", "count": int(count)})

    # --- 2. Duplicate rows ---
    duplicate_mask = df.duplicated()
    duplicates_removed = int(duplicate_mask.sum())
    df = df[~duplicate_mask].reset_index(drop=True)

    # --- 3. Automatic cleaning: impute missing values ---
    missing_cells_filled = 0
    for col in df.columns:
        col_missing = df[col].isna().sum()
        if col_missing == 0:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            fill_value = df[col].median()
            if pd.isna(fill_value):
                fill_value = 0
        else:
            fill_value = "Unknown"
        df[col] = df[col].fillna(fill_value)
        missing_cells_filled += int(col_missing)

    preview_rows = [
        {col: _json_safe(row[col]) for col in df.columns} for _, row in df.head(10).iterrows()
    ]

    return {
        "dataframe": df,
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": list(df.columns),
        "duplicate_rows_removed": duplicates_removed,
        "missing_cells_filled": missing_cells_filled,
        "preview": preview_rows,
        "warnings": warnings,
        "original_row_count": original_rows,
    }


def map_rows_to_products(df: pd.DataFrame) -> list[dict]:
    """
    Best-effort column mapping from an arbitrary uploaded dataset to the
    Product shape. Only maps columns that are actually present — the
    caller decides what to do with rows missing required fields.
    """
    column_aliases = {
        "sku": ["sku", "product_id", "item_code", "code"],
        "name": ["name", "product_name", "item_name", "product"],
        "category": ["category", "type", "product_category"],
        "current_stock": ["current_stock", "stock", "quantity", "qty", "on_hand"],
        "unit_cost": ["unit_cost", "cost", "cost_price"],
        "unit_price": ["unit_price", "price", "selling_price"],
    }

    resolved: dict[str, str] = {}
    for target, aliases in column_aliases.items():
        for alias in aliases:
            if alias in df.columns:
                resolved[target] = alias
                break

    if "sku" not in resolved and "name" not in resolved:
        raise ValueError(
            "Couldn't find a product identifier column (expected one of: sku, name, product_name)"
        )

    products = []
    for _, row in df.iterrows():
        sku = str(row[resolved["sku"]]) if "sku" in resolved else str(row[resolved["name"]])[:64]
        products.append(
            {
                "sku": sku,
                "name": str(row[resolved["name"]]) if "name" in resolved else sku,
                "category": str(row[resolved["category"]]) if "category" in resolved else "General",
                "current_stock": int(float(row[resolved["current_stock"]])) if "current_stock" in resolved else 0,
                "unit_cost": float(row[resolved["unit_cost"]]) if "unit_cost" in resolved else 0.0,
                "unit_price": float(row[resolved["unit_price"]]) if "unit_price" in resolved else 0.0,
            }
        )
    return products
