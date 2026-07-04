from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

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
