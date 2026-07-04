from sqlalchemy.orm import Session

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
    ) -> DatasetModel:
        self.session.add(dataset)
        self.session.add_all(fields)
        self.session.add(table_map)
        self.session.commit()
        self.session.refresh(dataset)
        return dataset
