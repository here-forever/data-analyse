from dataclasses import dataclass

from app.audit.service import AuditService
from app.core.errors import AppError
from app.core.ids import new_id
from app.datasets.materializer import POSTGRES_IDENTIFIER_LIMIT, SYSTEM_ROW_ID
from app.datasets.repository import DatasetRepository
from app.datasets.schemas import DatasetCreateRequest
from app.imports.parser import coerce_value
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
        audit: AuditService | None = None,
    ) -> None:
        self.repository = repository
        self.imports = imports
        self.audit = audit
        self._datasets: dict[str, Dataset] = {}

    def reset(self) -> None:
        self._datasets = {}

    def list_datasets(self, project_id: str) -> list[Dataset]:
        if self.repository is None:
            return [
                dataset for dataset in self._datasets.values() if dataset.project_id == project_id
            ]
        return [
            self._model_to_dataset(model) for model in self.repository.list_datasets(project_id)
        ]

    def get_dataset(self, dataset_id: str) -> Dataset:
        if self.repository is None:
            dataset = self._datasets.get(dataset_id)
            if dataset is None:
                raise AppError(
                    message="Dataset not found", code="dataset_not_found", status_code=404
                )
            return dataset

        model = self.repository.get_dataset(dataset_id)
        if model is None:
            raise AppError(message="Dataset not found", code="dataset_not_found", status_code=404)
        return self._model_to_dataset(model)

    def preview_dataset_rows(
        self,
        *,
        dataset_id: str,
        page: int,
        page_size: int,
    ) -> tuple[Dataset, list[dict[str, object | None]]]:
        self._validate_pagination(page=page, page_size=page_size)
        dataset = self.get_dataset(dataset_id)

        if self.repository is None:
            return dataset, []

        table_map = self.repository.get_table_map(dataset_id)
        if table_map is None:
            raise AppError(
                message="Dataset table mapping not found",
                code="dataset_table_map_not_found",
                status_code=404,
            )

        rows = self.repository.preview_rows(
            table_name=table_map.physical_table_name,
            fields=dataset.fields,
            page=page,
            page_size=page_size,
        )
        return dataset, rows

    def create_dataset(self, payload: DatasetCreateRequest) -> Dataset:
        preview = self.imports.get_preview(payload.preview_id)
        if preview is None or preview.project_id != payload.project_id:
            raise AppError(message="Preview not found", code="preview_not_found", status_code=404)
        self._validate_fields(payload.fields)

        dataset_id = new_id("dataset")
        if self.repository is None:
            dataset_id = f"dataset_{len(self._datasets) + 1}"
        physical_table_name = build_physical_table_name(dataset_id)
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
            materialized_rows = self._build_materialized_rows(
                preview_id=preview.id,
                fields=payload.fields,
            )
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
                materialized_fields=payload.fields,
                materialized_rows=materialized_rows,
            )
            self._record_dataset_audit(dataset)
            return dataset

        self._datasets[dataset.id] = dataset
        return dataset

    def _model_to_dataset(self, model: DatasetModel) -> Dataset:
        fields = [
            ImportFieldPreview(
                name=field.name,
                inferred_type=field.data_type,
                nullable=field.nullable,
                order=field.order,
            )
            for field in self.repository.list_fields(model.id)
        ]
        table_map = self.repository.get_table_map(model.id)
        if table_map is None:
            raise AppError(
                message="Dataset table mapping not found",
                code="dataset_table_map_not_found",
                status_code=404,
            )
        return Dataset(
            id=model.id,
            project_id=model.project_id,
            name=model.name,
            source_preview_id=model.source_preview_id or "",
            physical_table_name=table_map.physical_table_name,
            row_count=model.row_count,
            fields=fields,
        )

    def _validate_pagination(self, *, page: int, page_size: int) -> None:
        if page < 1:
            raise AppError(
                message="Page must be greater than 0", code="invalid_page", status_code=400
            )
        if page_size < 1 or page_size > 200:
            raise AppError(
                message="Page size must be between 1 and 200",
                code="invalid_page_size",
                status_code=400,
            )

    def _validate_fields(self, fields: list[ImportFieldPreview]) -> None:
        names = [field.name for field in fields]
        if any(not name.strip() for name in names):
            raise AppError(
                message="Dataset field names cannot be empty",
                code="invalid_dataset_fields",
                status_code=400,
            )
        if SYSTEM_ROW_ID in names:
            raise AppError(
                message=f"{SYSTEM_ROW_ID} is reserved for dataset row identity",
                code="reserved_dataset_field_name",
                status_code=400,
            )
        if any(len(name.encode("utf-8")) > POSTGRES_IDENTIFIER_LIMIT for name in names):
            raise AppError(
                message="Dataset field names must fit PostgreSQL identifier length",
                code="dataset_field_name_too_long",
                status_code=400,
            )
        if len(names) != len(set(names)):
            raise AppError(
                message="Dataset field names must be unique",
                code="duplicate_dataset_fields",
                status_code=400,
            )

    def _build_materialized_rows(
        self,
        *,
        preview_id: str,
        fields: list[ImportFieldPreview],
    ) -> list[dict[str, object | None]]:
        parsed_file = self.imports.parse_preview_source(preview_id)
        source_fields_by_order = {field.order: field for field in parsed_file.fields}
        materialized_rows: list[dict[str, object | None]] = []

        for target_field in fields:
            if target_field.order not in source_fields_by_order:
                raise AppError(
                    message="Dataset field order does not match source preview",
                    code="invalid_dataset_field_order",
                    status_code=400,
                )

        for row in parsed_file.rows:
            materialized_row: dict[str, object | None] = {}
            for target_field in fields:
                source_field = source_fields_by_order[target_field.order]
                materialized_row[target_field.name] = coerce_value(
                    row.get(source_field.name),
                    target_field.inferred_type,
                )
            materialized_rows.append(materialized_row)

        return materialized_rows

    def _record_dataset_audit(self, dataset: Dataset) -> None:
        if self.audit is None:
            return

        self.audit.record_operation(
            action="dataset.created",
            project_id=dataset.project_id,
            resource_type="dataset",
            resource_id=dataset.id,
            detail={
                "name": dataset.name,
                "source_preview_id": dataset.source_preview_id,
                "physical_table_name": dataset.physical_table_name,
                "row_count": dataset.row_count,
                "field_count": len(dataset.fields),
                "materialized": True,
            },
        )
        self.audit.record_lineage(
            project_id=dataset.project_id,
            source_type="file_import_preview",
            source_id=dataset.source_preview_id,
            target_type="dataset",
            target_id=dataset.id,
            transform_type="dataset_creation",
            transform_id=dataset.id,
        )


dataset_service = DatasetService()


def build_physical_table_name(dataset_id: str) -> str:
    return f"ds_{dataset_id.removeprefix('dataset_')[:24]}"
