from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.audit.repository import AuditRepository
from app.audit.service import AuditService
from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.core.database import get_db_session
from app.datasets.repository import DatasetRepository
from app.datasets.schemas import DatasetCreateRequest, DatasetResponse
from app.datasets.service import Dataset, DatasetService
from app.imports.repository import ImportRepository
from app.imports.service import ImportService

router = APIRouter(prefix="/datasets", tags=["datasets"])


def get_dataset_service(
    session: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DatasetService:
    imports = ImportService(ImportRepository(session))
    audit = AuditService(AuditRepository(session), actor_id=current_user.id)
    return DatasetService(DatasetRepository(session), imports, audit=audit)


def to_dataset_response(dataset: Dataset) -> DatasetResponse:
    return DatasetResponse(
        id=dataset.id,
        project_id=dataset.project_id,
        name=dataset.name,
        source_preview_id=dataset.source_preview_id,
        physical_table_name=dataset.physical_table_name,
        row_count=dataset.row_count,
        fields=dataset.fields,
    )


@router.post("", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def create_dataset(
    payload: DatasetCreateRequest,
    datasets: Annotated[DatasetService, Depends(get_dataset_service)],
) -> DatasetResponse:
    dataset = datasets.create_dataset(payload)
    return to_dataset_response(dataset)
