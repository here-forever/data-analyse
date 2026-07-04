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
    ExternalDatabaseSchemaResponse,
    ExternalDatasetImportResponse,
    ExternalSqlImportRequest,
    ExternalTableImportRequest,
)
from app.data_sources.service import (
    DataSourceService,
    external_table_to_response,
    to_external_database_connection_response,
)
from app.datasets.repository import DatasetRepository
from app.datasets.service import DatasetService
from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService

router = APIRouter(prefix="/data-sources", tags=["data-sources"])


def get_data_source_service(
    session: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DataSourceService:
    return DataSourceService(
        DataSourceRepository(session),
        audit=AuditService(AuditRepository(session), actor_id=current_user.id),
    )


def get_dataset_service(
    session: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DatasetService:
    audit = AuditService(AuditRepository(session), actor_id=current_user.id)
    tasks = TaskService(TaskRepository(session), initiator_id=current_user.id)
    return DatasetService(DatasetRepository(session), audit=audit, tasks=tasks)


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


@router.get(
    "/external-databases/{connection_id}/schema",
    response_model=ExternalDatabaseSchemaResponse,
)
def inspect_external_database_schema(
    connection_id: str,
    data_sources: Annotated[DataSourceService, Depends(get_data_source_service)],
) -> ExternalDatabaseSchemaResponse:
    connection, tables = data_sources.inspect_external_schema(connection_id)
    return ExternalDatabaseSchemaResponse(
        connection=to_external_database_connection_response(connection),
        tables=[external_table_to_response(table) for table in tables],
    )


@router.post(
    "/external-databases/{connection_id}/import-table",
    response_model=ExternalDatasetImportResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_external_database_table(
    connection_id: str,
    payload: ExternalTableImportRequest,
    data_sources: Annotated[DataSourceService, Depends(get_data_source_service)],
    datasets: Annotated[DatasetService, Depends(get_dataset_service)],
) -> ExternalDatasetImportResponse:
    return data_sources.import_external_table(connection_id, payload, datasets)


@router.post(
    "/external-databases/{connection_id}/import-sql",
    response_model=ExternalDatasetImportResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_external_database_sql(
    connection_id: str,
    payload: ExternalSqlImportRequest,
    data_sources: Annotated[DataSourceService, Depends(get_data_source_service)],
    datasets: Annotated[DatasetService, Depends(get_dataset_service)],
) -> ExternalDatasetImportResponse:
    return data_sources.import_external_sql(connection_id, payload, datasets)
