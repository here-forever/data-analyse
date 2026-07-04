from dataclasses import dataclass

from app.core.errors import AppError
from app.core.ids import new_id
from app.datasets.repository import DatasetRepository
from app.datasets.schemas import DatasetCreateRequest
from app.imports.schemas import ImportFieldPreview
from app.imports.service import ImportService, import_service
from app.models.dataset import Dataset as DatasetModel
from app.models.dataset import DatasetField as DatasetFieldModel
from app.models.dataset import DatasetTableMap as DatasetTableMapModel


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
    def __init__(
        self,
        repository: DatasetRepository | None = None,
        imports: ImportService = import_service,
    ) -> None:
        self.repository = repository
        self.imports = imports
        self._datasets: dict[str, Dataset] = {}

    def reset(self) -> None:
        self._datasets = {}

    def create_dataset(self, payload: DatasetCreateRequest) -> Dataset:
        preview = self.imports.get_preview(payload.preview_id)
        if preview is None or preview.project_id != payload.project_id:
            raise AppError(message="Preview not found", code="preview_not_found", status_code=404)

        dataset_id = new_id("dataset")
        if self.repository is None:
            dataset_id = f"dataset_{len(self._datasets) + 1}"
        physical_table_name = f"ds_{payload.project_id}_{dataset_id}"
        dataset = Dataset(
            id=dataset_id,
            project_id=payload.project_id,
            name=payload.name,
            source_preview_id=preview.id,
            physical_table_name=physical_table_name,
            row_count=preview.row_count,
            fields=payload.fields,
        )

        if self.repository is not None:
            self.repository.save_dataset(
                dataset=DatasetModel(
                    id=dataset.id,
                    project_id=dataset.project_id,
                    name=dataset.name,
                    description=None,
                    source_preview_id=dataset.source_preview_id,
                    row_count=dataset.row_count,
                ),
                fields=[
                    DatasetFieldModel(
                        id=new_id("field"),
                        dataset_id=dataset.id,
                        name=field.name,
                        data_type=field.inferred_type,
                        nullable=field.nullable,
                        order=field.order,
                        is_sensitive=False,
                        masking_strategy=None,
                    )
                    for field in payload.fields
                ],
                table_map=DatasetTableMapModel(
                    id=new_id("dtm"),
                    dataset_id=dataset.id,
                    physical_table_name=dataset.physical_table_name,
                ),
            )
            return dataset

        self._datasets[dataset.id] = dataset
        return dataset


dataset_service = DatasetService()
