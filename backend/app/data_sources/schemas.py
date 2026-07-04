from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.datasets.schemas import DatasetResponse

DatabaseType = Literal["postgresql", "mysql"]
ConnectionStatus = Literal["untested", "available", "failed"]


class ExternalDatabaseConnectionCreateRequest(BaseModel):
    project_id: str
    name: str = Field(min_length=1, max_length=120)
    database_type: DatabaseType
    host: str = Field(min_length=1, max_length=255)
    port: int | None = Field(default=None, ge=1, le=65535)
    database_name: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1)
    read_only: bool = True


class ExternalDatabaseConnectionResponse(BaseModel):
    id: str
    project_id: str
    name: str
    database_type: DatabaseType
    host: str
    port: int
    database_name: str
    username: str
    read_only: bool
    status: ConnectionStatus
    last_error: str | None
    created_at: datetime
    updated_at: datetime


class ExternalDatabaseConnectionListResponse(BaseModel):
    items: list[ExternalDatabaseConnectionResponse]


class ExternalDatabaseConnectionTestResponse(BaseModel):
    connection: ExternalDatabaseConnectionResponse
    ok: bool
    message: str


class ExternalTableColumnResponse(BaseModel):
    name: str
    data_type: str
    inferred_type: str
    nullable: bool
    order: int


class ExternalTableResponse(BaseModel):
    schema_name: str
    table_name: str
    columns: list[ExternalTableColumnResponse]


class ExternalDatabaseSchemaResponse(BaseModel):
    connection: ExternalDatabaseConnectionResponse
    tables: list[ExternalTableResponse]


class ExternalTableImportRequest(BaseModel):
    project_id: str
    dataset_name: str = Field(min_length=1, max_length=120)
    schema_name: str = ""
    table_name: str = Field(min_length=1, max_length=255)
    limit: int = Field(default=1000, ge=1, le=10000)


class ExternalSqlImportRequest(BaseModel):
    project_id: str
    dataset_name: str = Field(min_length=1, max_length=120)
    sql: str = Field(min_length=1)
    limit: int = Field(default=1000, ge=1, le=10000)


class ExternalDatasetImportResponse(BaseModel):
    dataset: DatasetResponse
    source_type: Literal["external_table", "external_sql"]
    row_count: int
