from typing import Literal

from pydantic import BaseModel

FieldType = Literal["integer", "decimal", "date", "datetime", "boolean", "text"]


class ImportFieldPreview(BaseModel):
    name: str
    inferred_type: FieldType
    nullable: bool
    order: int


class FilePreviewResponse(BaseModel):
    id: str
    project_id: str
    file_name: str
    file_type: str
    row_count: int
    fields: list[ImportFieldPreview]
    sample_rows: list[dict[str, object | None]]
