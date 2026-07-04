from dataclasses import dataclass

from app.core.errors import AppError
from app.datasets.schemas import DatasetCreateRequest
from app.imports.schemas import ImportFieldPreview
from app.imports.service import import_service


@dataclass(frozen=True)
class Dataset:
    id: str
    project_id: str
    name: str
    source_preview_id: str
    physical_table_name: str
    row_count: int
    fields: list[ImportFieldPreview]


class DatasetService:
    def __init__(self) -> None:
        self._datasets: dict[str, Dataset] = {}

    def reset(self) -> None:
        self._datasets = {}

    def create_dataset(self, payload: DatasetCreateRequest) -> Dataset:
        preview = import_service.get_preview(payload.preview_id)
        if preview is None or preview.project_id != payload.project_id:
            raise AppError(message="Preview not found", code="preview_not_found", status_code=404)

        dataset_id = f"dataset_{len(self._datasets) + 1}"
        dataset = Dataset(
            id=dataset_id,
            project_id=payload.project_id,
            name=payload.name,
            source_preview_id=preview.id,
            physical_table_name=f"ds_{payload.project_id}_{dataset_id}",
            row_count=preview.row_count,
            fields=payload.fields,
        )
        self._datasets[dataset.id] = dataset
        return dataset


dataset_service = DatasetService()
