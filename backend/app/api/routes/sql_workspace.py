from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.audit.repository import AuditRepository
from app.audit.service import AuditService
from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.core.database import get_db_session
from app.datasets.repository import DatasetRepository
from app.datasets.service import DatasetService
from app.sql_workspace.schemas import (
    SqlRunRequest,
    SqlRunResponse,
    SqlWorkspaceMetadataResponse,
)
from app.sql_workspace.service import SqlWorkspaceService

router = APIRouter(prefix="/sql", tags=["sql"])


def get_sql_workspace_service(
    session: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SqlWorkspaceService:
    audit = AuditService(AuditRepository(session), actor_id=current_user.id)
    datasets = DatasetService(DatasetRepository(session), audit=audit)
    return SqlWorkspaceService(session=session, datasets=datasets, audit=audit)


@router.get("/metadata", response_model=SqlWorkspaceMetadataResponse)
def get_sql_metadata(
    project_id: str,
    sql_workspace: Annotated[SqlWorkspaceService, Depends(get_sql_workspace_service)],
) -> SqlWorkspaceMetadataResponse:
    return sql_workspace.metadata(project_id)


@router.post("/run", response_model=SqlRunResponse)
def run_sql(
    payload: SqlRunRequest,
    sql_workspace: Annotated[SqlWorkspaceService, Depends(get_sql_workspace_service)],
) -> SqlRunResponse:
    return sql_workspace.run(payload)
