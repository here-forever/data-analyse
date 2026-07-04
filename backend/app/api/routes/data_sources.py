from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.audit.repository import AuditRepository
from app.audit.service import AuditService
from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.core.database import get_db_session
from app.data_sources.repository import DataSourceRepository
from app.data_sources.schemas import (
    ExternalDatabaseConnectionCreateRequest,
    ExternalDatabaseConnectionListResponse,
    ExternalDatabaseConnectionResponse,
    ExternalDatabaseConnectionTestResponse,
)
from app.data_sources.service import (
    DataSourceService,
    to_external_database_connection_response,
)

router = APIRouter(prefix="/data-sources", tags=["data-sources"])


def get_data_source_service(
    session: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DataSourceService:
    return DataSourceService(
        DataSourceRepository(session),
        audit=AuditService(AuditRepository(session), actor_id=current_user.id),
    )


@router.post(
    "/external-databases",
    response_model=ExternalDatabaseConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_external_database_connection(
    payload: ExternalDatabaseConnectionCreateRequest,
    data_sources: Annotated[DataSourceService, Depends(get_data_source_service)],
) -> ExternalDatabaseConnectionResponse:
    return to_external_database_connection_response(data_sources.create_connection(payload))


@router.get(
    "/external-databases",
    response_model=ExternalDatabaseConnectionListResponse,
)
def list_external_database_connections(
    project_id: str,
    data_sources: Annotated[DataSourceService, Depends(get_data_source_service)],
) -> ExternalDatabaseConnectionListResponse:
    return ExternalDatabaseConnectionListResponse(
        items=[
            to_external_database_connection_response(connection)
            for connection in data_sources.list_connections(project_id)
        ]
    )


@router.post(
    "/external-databases/{connection_id}/test",
    response_model=ExternalDatabaseConnectionTestResponse,
)
def test_external_database_connection(
    connection_id: str,
    data_sources: Annotated[DataSourceService, Depends(get_data_source_service)],
) -> ExternalDatabaseConnectionTestResponse:
    connection, result = data_sources.test_connection(connection_id)
    return ExternalDatabaseConnectionTestResponse(
        connection=to_external_database_connection_response(connection),
        ok=result.ok,
        message=result.message,
    )
