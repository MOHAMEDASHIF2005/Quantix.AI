import io
import json

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Dataset, Product
from app.schemas.dataset import DatasetCommitResponse, DatasetSummary
from app.services import dataset_service

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=DatasetSummary, status_code=status.HTTP_201_CREATED)
async def upload_dataset(file: UploadFile, db: Session = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    raw_bytes = await file.read()
    try:
        result = dataset_service.validate_and_clean(file.filename, raw_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    dataset = Dataset(
        filename=file.filename,
        row_count=result["row_count"],
        column_count=result["column_count"],
        duplicate_rows_removed=result["duplicate_rows_removed"],
        missing_cells_filled=result["missing_cells_filled"],
        columns_json=json.dumps(result["columns"]),
        preview_json=json.dumps(result["preview"]),
        warnings_json=json.dumps(result["warnings"]),
        cleaned_csv=result["dataframe"].to_csv(index=False),
        status="validated",
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return _to_summary(dataset)


@router.get("", response_model=list[DatasetSummary])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.execute(select(Dataset).order_by(Dataset.uploaded_at.desc())).scalars().all()
    return [_to_summary(d) for d in datasets]


@router.get("/{dataset_id}", response_model=DatasetSummary)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return _to_summary(dataset)


@router.post("/{dataset_id}/commit", response_model=DatasetCommitResponse)
def commit_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status == "committed":
        raise HTTPException(status_code=409, detail="Dataset already committed")

    df = pd.read_csv(io.StringIO(dataset.cleaned_csv))
    try:
        mapped_rows = dataset_service.map_rows_to_products(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    created = 0
    for row in mapped_rows:
        existing = db.execute(select(Product).where(Product.sku == row["sku"])).scalar_one_or_none()
        if existing:
            existing.current_stock = row["current_stock"]
            existing.unit_cost = row["unit_cost"] or existing.unit_cost
            existing.unit_price = row["unit_price"] or existing.unit_price
        else:
            db.add(Product(**row))
            created += 1

    dataset.status = "committed"
    dataset.products_created = created
    db.commit()

    return DatasetCommitResponse(
        id=dataset.id,
        status=dataset.status,
        products_created=created,
        message=f"Committed {len(mapped_rows)} rows — {created} new products created, "
        f"{len(mapped_rows) - created} existing products updated.",
    )


def _to_summary(dataset: Dataset) -> DatasetSummary:
    return DatasetSummary(
        id=dataset.id,
        filename=dataset.filename,
        uploaded_at=dataset.uploaded_at,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        duplicate_rows_removed=dataset.duplicate_rows_removed,
        missing_cells_filled=dataset.missing_cells_filled,
        columns=json.loads(dataset.columns_json),
        preview=json.loads(dataset.preview_json),
        warnings=json.loads(dataset.warnings_json),
        status=dataset.status,
        products_created=dataset.products_created,
    )
