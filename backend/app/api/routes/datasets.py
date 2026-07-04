from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.datasets.schemas import DatasetCreateRequest, DatasetResponse
from app.datasets.service import Dataset, dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


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
    _current_user: Annotated[User, Depends(get_current_user)],
) -> DatasetResponse:
    dataset = dataset_service.create_dataset(payload)
    return to_dataset_response(dataset)
