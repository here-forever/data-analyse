from base64 import b64decode, b64encode
from dataclasses import dataclass
from datetime import datetime

from app.audit.service import AuditService
from app.core.errors import AppError
from app.core.ids import new_id
from app.data_sources.connectors import (
    ConnectionTestResult,
    ExternalDatabaseConnectionConfig,
    ExternalDatabaseTester,
)
from app.data_sources.repository import DataSourceRepository
from app.data_sources.schemas import (
    DatabaseType,
    ExternalDatabaseConnectionCreateRequest,
    ExternalDatabaseConnectionResponse,
)
from app.models.data_source import ExternalDatabaseConnection as ExternalDatabaseConnectionModel

DEFAULT_PORTS: dict[DatabaseType, int] = {
    "mysql": 3306,
    "postgresql": 5432,
}


@dataclass(frozen=True)
class ExternalDatabaseConnection:
    id: str
    project_id: str
    name: str
    database_type: DatabaseType
    host: str
    port: int
    database_name: str
    username: str
    password_secret: str
    read_only: bool
    status: str
    last_error: str | None
    created_at: datetime
    updated_at: datetime


class DataSourceService:
    def __init__(
        self,
        repository: DataSourceRepository | None = None,
        tester: ExternalDatabaseTester | None = None,
        audit: AuditService | None = None,
    ) -> None:
        self.repository = repository
        self.tester = tester or ExternalDatabaseTester()
        self.audit = audit
        self._connections: dict[str, ExternalDatabaseConnection] = {}

    def reset(self) -> None:
        self._connections = {}

    def create_connection(
        self,
        payload: ExternalDatabaseConnectionCreateRequest,
    ) -> ExternalDatabaseConnection:
        if not payload.read_only:
            raise AppError(
                "External database connections must be read-only in the first stage",
                "external_connection_must_be_read_only",
                400,
            )

        port = payload.port or DEFAULT_PORTS[payload.database_type]
        connection_id = (
            new_id("src") if self.repository is not None else f"src_{len(self._connections) + 1}"
        )
        connection = ExternalDatabaseConnection(
            id=connection_id,
            project_id=payload.project_id,
            name=payload.name.strip(),
            database_type=payload.database_type,
            host=payload.host.strip(),
            port=port,
            database_name=payload.database_name.strip(),
            username=payload.username.strip(),
            password_secret=encode_secret(payload.password),
            read_only=True,
            status="untested",
            last_error=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        if self.repository is not None:
            if (
                self.repository.get_connection_by_name(
                    project_id=connection.project_id,
                    name=connection.name,
                )
                is not None
            ):
                raise AppError(
                    "External database connection name already exists in this project",
                    "external_connection_name_conflict",
                    409,
                )
            saved = model_to_connection(
                self.repository.save_connection(
                    ExternalDatabaseConnectionModel(
                        id=connection.id,
                        project_id=connection.project_id,
                        name=connection.name,
                        database_type=connection.database_type,
                        host=connection.host,
                        port=connection.port,
                        database_name=connection.database_name,
                        username=connection.username,
                        password_secret=connection.password_secret,
                        read_only=connection.read_only,
                        status=connection.status,
                        last_error=connection.last_error,
                    )
                )
            )
            self._record_created(saved)
            return saved

        existing = next(
            (
                item
                for item in self._connections.values()
                if item.project_id == connection.project_id and item.name == connection.name
            ),
            None,
        )
        if existing is not None:
            raise AppError(
                "External database connection name already exists in this project",
                "external_connection_name_conflict",
                409,
            )
        self._connections[connection.id] = connection
        return connection

    def list_connections(self, project_id: str) -> list[ExternalDatabaseConnection]:
        if self.repository is not None:
            return [
                model_to_connection(connection)
                for connection in self.repository.list_connections(project_id)
            ]

        return [
            connection
            for connection in self._connections.values()
            if connection.project_id == project_id
        ]

    def test_connection(
        self, connection_id: str
    ) -> tuple[ExternalDatabaseConnection, ConnectionTestResult]:
        connection = self.get_connection(connection_id)
        try:
            result = self.tester.test_connection(
                ExternalDatabaseConnectionConfig(
                    database_type=connection.database_type,
                    host=connection.host,
                    port=connection.port,
                    database_name=connection.database_name,
                    username=connection.username,
                    password=decode_secret(connection.password_secret),
                )
            )
        except Exception as error:
            result = ConnectionTestResult(
                ok=False,
                message=str(error) or error.__class__.__name__,
            )

        updated = self._update_test_status(connection, result)
        self._record_test(updated, result)
        return updated, result

    def get_connection(self, connection_id: str) -> ExternalDatabaseConnection:
        if self.repository is not None:
            connection = self.repository.get_connection(connection_id)
            if connection is None:
                raise AppError(
                    "External database connection not found", "external_connection_not_found", 404
                )
            return model_to_connection(connection)

        connection = self._connections.get(connection_id)
        if connection is None:
            raise AppError(
                "External database connection not found", "external_connection_not_found", 404
            )
        return connection

    def _update_test_status(
        self,
        connection: ExternalDatabaseConnection,
        result: ConnectionTestResult,
    ) -> ExternalDatabaseConnection:
        status = "available" if result.ok else "failed"
        last_error = None if result.ok else result.message

        if self.repository is not None:
            model = self.repository.get_connection(connection.id)
            if model is None:
                raise AppError(
                    "External database connection not found", "external_connection_not_found", 404
                )
            model.status = status
            model.last_error = last_error
            return model_to_connection(self.repository.update_connection(model))

        updated = ExternalDatabaseConnection(
            id=connection.id,
            project_id=connection.project_id,
            name=connection.name,
            database_type=connection.database_type,
            host=connection.host,
            port=connection.port,
            database_name=connection.database_name,
            username=connection.username,
            password_secret=connection.password_secret,
            read_only=connection.read_only,
            status=status,
            last_error=last_error,
            created_at=connection.created_at,
            updated_at=datetime.now(),
        )
        self._connections[updated.id] = updated
        return updated

    def _record_created(self, connection: ExternalDatabaseConnection) -> None:
        if self.audit is None:
            return

        self.audit.record_operation(
            action="data_source.external_database_created",
            project_id=connection.project_id,
            resource_type="external_database_connection",
            resource_id=connection.id,
            detail={
                "database_type": connection.database_type,
                "host": connection.host,
                "port": connection.port,
                "database_name": connection.database_name,
                "read_only": connection.read_only,
            },
        )

    def _record_test(
        self,
        connection: ExternalDatabaseConnection,
        result: ConnectionTestResult,
    ) -> None:
        if self.audit is None:
            return

        self.audit.record_operation(
            action="data_source.external_database_tested",
            project_id=connection.project_id,
            resource_type="external_database_connection",
            resource_id=connection.id,
            detail={
                "ok": result.ok,
                "message": result.message,
                "status": connection.status,
            },
        )


def model_to_connection(
    connection: ExternalDatabaseConnectionModel,
) -> ExternalDatabaseConnection:
    return ExternalDatabaseConnection(
        id=connection.id,
        project_id=connection.project_id,
        name=connection.name,
        database_type=connection.database_type,
        host=connection.host,
        port=connection.port,
        database_name=connection.database_name,
        username=connection.username,
        password_secret=connection.password_secret,
        read_only=connection.read_only,
        status=connection.status,
        last_error=connection.last_error,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


def to_external_database_connection_response(
    connection: ExternalDatabaseConnection,
) -> ExternalDatabaseConnectionResponse:
    return ExternalDatabaseConnectionResponse(
        id=connection.id,
        project_id=connection.project_id,
        name=connection.name,
        database_type=connection.database_type,
        host=connection.host,
        port=connection.port,
        database_name=connection.database_name,
        username=connection.username,
        read_only=connection.read_only,
        status=connection.status,
        last_error=connection.last_error,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


def encode_secret(value: str) -> str:
    return b64encode(value.encode("utf-8")).decode("ascii")


def decode_secret(value: str) -> str:
    return b64decode(value.encode("ascii")).decode("utf-8")


data_source_service = DataSourceService()
