from sqlalchemy.orm import Session

from app.datasets.materializer import DatasetMaterializer
from app.imports.schemas import ImportFieldPreview
from app.models.dataset import Dataset as DatasetModel
from app.models.dataset import DatasetField as DatasetFieldModel
from app.models.dataset import DatasetTableMap as DatasetTableMapModel


class DatasetRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save_dataset(
        self,
        *,
        dataset: DatasetModel,
        fields: list[DatasetFieldModel],
        table_map: DatasetTableMapModel,
        materialized_fields: list[ImportFieldPreview] | None = None,
        materialized_rows: list[dict[str, object | None]] | None = None,
    ) -> DatasetModel:
        try:
            self.session.add(dataset)
            self.session.add_all(fields)
            self.session.add(table_map)
            self.session.flush()

            if materialized_fields is not None and materialized_rows is not None:
                DatasetMaterializer(self.session).create_table(
                    table_name=table_map.physical_table_name,
                    fields=materialized_fields,
                    rows=materialized_rows,
                )

            self.session.commit()
            self.session.refresh(dataset)
            return dataset
        except Exception:
            self.session.rollback()
            raise
