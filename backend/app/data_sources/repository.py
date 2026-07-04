from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.data_source import ExternalDatabaseConnection as ExternalDatabaseConnectionModel


class DataSourceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save_connection(
        self,
        connection: ExternalDatabaseConnectionModel,
    ) -> ExternalDatabaseConnectionModel:
        self.session.add(connection)
        self.session.commit()
        self.session.refresh(connection)
        return connection

    def update_connection(
        self,
        connection: ExternalDatabaseConnectionModel,
    ) -> ExternalDatabaseConnectionModel:
        self.session.add(connection)
        self.session.commit()
        self.session.refresh(connection)
        return connection

    def get_connection(self, connection_id: str) -> ExternalDatabaseConnectionModel | None:
        return self.session.get(ExternalDatabaseConnectionModel, connection_id)

    def get_connection_by_name(
        self,
        *,
        project_id: str,
        name: str,
    ) -> ExternalDatabaseConnectionModel | None:
        return self.session.scalar(
            select(ExternalDatabaseConnectionModel).where(
                ExternalDatabaseConnectionModel.project_id == project_id,
                ExternalDatabaseConnectionModel.name == name,
            )
        )

    def list_connections(self, project_id: str) -> list[ExternalDatabaseConnectionModel]:
        return list(
            self.session.scalars(
                select(ExternalDatabaseConnectionModel)
                .where(ExternalDatabaseConnectionModel.project_id == project_id)
                .order_by(ExternalDatabaseConnectionModel.created_at.desc())
            )
        )
