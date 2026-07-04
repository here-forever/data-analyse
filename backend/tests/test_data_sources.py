from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes.data_sources import get_data_source_service
from app.audit.repository import AuditRepository
from app.audit.service import AuditService
from app.auth.repository import AuthRepository
from app.auth.service import AuthService
from app.core.database import Base, get_db_session, import_models
from app.core.errors import AppError
from app.data_sources.connectors import (
    ConnectionTestResult,
    ExternalDatabaseConnectionConfig,
    build_connect_args,
    build_sqlalchemy_url,
)
from app.data_sources.repository import DataSourceRepository
from app.data_sources.schemas import ExternalDatabaseConnectionCreateRequest
from app.data_sources.service import DataSourceService, decode_secret
from app.models.audit import OperationLog as OperationLogModel
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService


class FakeTester:
    def __init__(self, result: ConnectionTestResult | None = None) -> None:
        self.result = result or ConnectionTestResult(ok=True, message="fake read-only ok")
        self.configs: list[ExternalDatabaseConnectionConfig] = []

    def test_connection(
        self,
        config: ExternalDatabaseConnectionConfig,
    ) -> ConnectionTestResult:
        self.configs.append(config)
        return self.result


def login(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )

    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_project(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        "/api/projects",
        headers=headers,
        json={"name": "Data Source Project", "description": None},
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_test_session() -> Session:
    import_models()
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return session_factory()


def create_project_in_session(session: Session) -> tuple[str, str]:
    auth = AuthService(AuthRepository(session))
    owner = auth.get_or_create_default_admin()
    project = ProjectService(ProjectRepository(session), auth).create_project(
        name="External Source",
        description=None,
        owner=owner,
    )
    return project.id, owner.id


def test_external_database_connection_api_create_list_and_test(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    tester = FakeTester()

    create_response = client.post(
        "/api/data-sources/external-databases",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Warehouse",
            "database_type": "postgresql",
            "host": "warehouse.local",
            "database_name": "analytics",
            "username": "readonly_user",
            "password": "secret-password",
        },
    )

    assert create_response.status_code == 201
    connection = create_response.json()
    assert connection["id"].startswith("src_")
    assert connection["project_id"] == project_id
    assert connection["database_type"] == "postgresql"
    assert connection["port"] == 5432
    assert connection["read_only"] is True
    assert connection["status"] == "untested"
    assert "password" not in connection

    list_response = client.get(
        "/api/data-sources/external-databases",
        headers=headers,
        params={"project_id": project_id},
    )
    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == connection["id"]

    def override_get_data_source_service():
        session = next(client.app.dependency_overrides[get_db_session]())
        try:
            yield DataSourceService(
                DataSourceRepository(session),
                tester=tester,
                audit=AuditService(AuditRepository(session), actor_id="usr_admin"),
            )
        finally:
            session.close()

    client.app.dependency_overrides[get_data_source_service] = override_get_data_source_service
    test_response = client.post(
        f"/api/data-sources/external-databases/{connection['id']}/test",
        headers=headers,
    )
    client.app.dependency_overrides.pop(get_data_source_service, None)

    assert test_response.status_code == 200
    test_payload = test_response.json()
    assert test_payload["ok"] is True
    assert test_payload["connection"]["status"] == "available"
    assert test_payload["connection"]["last_error"] is None
    assert tester.configs[0].database_type == "postgresql"
    assert tester.configs[0].password == "secret-password"


def test_external_database_connections_are_project_scoped_and_read_only(
    client: TestClient,
) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    other_project_id = create_project(client, headers)

    first_response = client.post(
        "/api/data-sources/external-databases",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Warehouse",
            "database_type": "mysql",
            "host": "mysql.local",
            "database_name": "orders",
            "username": "readonly_user",
            "password": "secret-password",
            "read_only": True,
        },
    )
    assert first_response.status_code == 201
    assert first_response.json()["port"] == 3306

    duplicate_response = client.post(
        "/api/data-sources/external-databases",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Warehouse",
            "database_type": "mysql",
            "host": "mysql.local",
            "database_name": "orders",
            "username": "readonly_user",
            "password": "secret-password",
        },
    )
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["error"]["code"] == "external_connection_name_conflict"

    unsafe_response = client.post(
        "/api/data-sources/external-databases",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Unsafe",
            "database_type": "postgresql",
            "host": "warehouse.local",
            "database_name": "analytics",
            "username": "writer",
            "password": "secret-password",
            "read_only": False,
        },
    )
    assert unsafe_response.status_code == 400
    assert unsafe_response.json()["error"]["code"] == "external_connection_must_be_read_only"

    other_response = client.post(
        "/api/data-sources/external-databases",
        headers=headers,
        json={
            "project_id": other_project_id,
            "name": "Warehouse",
            "database_type": "mysql",
            "host": "mysql.local",
            "database_name": "orders",
            "username": "readonly_user",
            "password": "secret-password",
        },
    )
    assert other_response.status_code == 201

    list_response = client.get(
        "/api/data-sources/external-databases",
        headers=headers,
        params={"project_id": project_id},
    )
    assert list_response.status_code == 200
    assert {item["project_id"] for item in list_response.json()["items"]} == {project_id}


def test_data_source_service_tests_connection_with_saved_secret_and_audit() -> None:
    session = create_test_session()
    project_id, actor_id = create_project_in_session(session)
    tester = FakeTester()
    service = DataSourceService(
        DataSourceRepository(session),
        tester=tester,
        audit=AuditService(AuditRepository(session), actor_id=actor_id),
    )

    connection = service.create_connection(
        ExternalDatabaseConnectionCreateRequest(
            project_id=project_id,
            name="Warehouse",
            database_type="postgresql",
            host="warehouse.local",
            database_name="analytics",
            username="readonly_user",
            password="secret-password",
        )
    )
    assert decode_secret(connection.password_secret) == "secret-password"

    tested_connection, result = service.test_connection(connection.id)

    assert result.ok is True
    assert tested_connection.status == "available"
    assert tested_connection.last_error is None
    assert tester.configs == [
        ExternalDatabaseConnectionConfig(
            database_type="postgresql",
            host="warehouse.local",
            port=5432,
            database_name="analytics",
            username="readonly_user",
            password="secret-password",
        )
    ]

    logs = list(session.scalars(select(OperationLogModel).order_by(OperationLogModel.created_at)))
    assert {log.action for log in logs} >= {
        "data_source.external_database_created",
        "data_source.external_database_tested",
    }


def test_data_source_service_records_failed_connection_test() -> None:
    session = create_test_session()
    project_id, _actor_id = create_project_in_session(session)
    service = DataSourceService(
        DataSourceRepository(session),
        tester=FakeTester(ConnectionTestResult(ok=False, message="network timeout")),
    )
    connection = service.create_connection(
        ExternalDatabaseConnectionCreateRequest(
            project_id=project_id,
            name="Warehouse",
            database_type="mysql",
            host="mysql.local",
            database_name="analytics",
            username="readonly_user",
            password="secret-password",
        )
    )

    tested_connection, result = service.test_connection(connection.id)

    assert result.ok is False
    assert tested_connection.status == "failed"
    assert tested_connection.last_error == "network timeout"

    try:
        service.get_connection("src_missing")
    except AppError as exc:
        assert exc.code == "external_connection_not_found"
    else:
        raise AssertionError("Expected missing connection to raise AppError")


def test_external_database_connector_builds_urls_and_timeouts() -> None:
    postgres_config = ExternalDatabaseConnectionConfig(
        database_type="postgresql",
        host="db.local",
        port=5432,
        database_name="analytics db",
        username="read only",
        password="secret/pass",
    )
    mysql_config = ExternalDatabaseConnectionConfig(
        database_type="mysql",
        host="mysql.local",
        port=3306,
        database_name="orders",
        username="readonly",
        password="secret",
    )

    assert (
        build_sqlalchemy_url(postgres_config)
        == "postgresql+psycopg://read+only:secret%2Fpass@db.local:5432/analytics+db"
    )
    assert build_connect_args(postgres_config) == {"connect_timeout": 5}
    assert build_sqlalchemy_url(mysql_config) == (
        "mysql+pymysql://readonly:secret@mysql.local:3306/orders"
    )
    assert build_connect_args(mysql_config) == {
        "connect_timeout": 5,
        "read_timeout": 5,
        "write_timeout": 5,
    }
