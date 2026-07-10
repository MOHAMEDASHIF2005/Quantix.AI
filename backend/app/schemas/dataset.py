from datetime import datetime

from pydantic import BaseModel


class DatasetWarning(BaseModel):
    column: str
    issue: str
    count: int


class DatasetSummary(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    row_count: int
    column_count: int
    duplicate_rows_removed: int
    missing_cells_filled: int
    columns: list[str]
    preview: list[dict]
    warnings: list[DatasetWarning]
    status: str
    products_created: int

    class Config:
        from_attributes = True


class DatasetCommitResponse(BaseModel):
    id: int
    status: str
    products_created: int
    message: str
