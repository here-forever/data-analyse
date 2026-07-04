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
    ExternalQueryResult,
    ExternalTable,
    ExternalTableColumn,
    build_connect_args,
    build_sqlalchemy_url,
)
from app.data_sources.repository import DataSourceRepository
from app.data_sources.schemas import (
    ExternalDatabaseConnectionCreateRequest,
    ExternalSqlImportRequest,
    ExternalTableImportRequest,
)
from app.data_sources.service import DataSourceService, decode_secret
from app.datasets.repository import DatasetRepository
from app.datasets.service import DatasetService
from app.imports.schemas import ImportFieldPreview
from app.models.audit import LineageEdge as LineageEdgeModel
from app.models.audit import OperationLog as OperationLogModel
from app.models.task import Task as TaskModel
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService
from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService


class FakeTester:
    def __init__(self, result: ConnectionTestResult | None = None) -> None:
        self.result = result or ConnectionTestResult(ok=True, message="fake read-only ok")
        self.configs: list[ExternalDatabaseConnectionConfig] = []
        self.inspect_configs: list[ExternalDatabaseConnectionConfig] = []
        self.table_reads: list[tuple[ExternalDatabaseConnectionConfig, str, str, int]] = []
        self.sql_reads: list[tuple[ExternalDatabaseConnectionConfig, str, int]] = []

    def test_connection(
        self,
        config: ExternalDatabaseConnectionConfig,
    ) -> ConnectionTestResult:
        self.configs.append(config)
        return self.result

    def inspect_schema(self, config: ExternalDatabaseConnectionConfig) -> list[ExternalTable]:
        self.inspect_configs.append(config)
        return [
            ExternalTable(
                schema_name="public",
                table_name="orders",
                columns=[
                    ExternalTableColumn(
                        name="customer",
                        data_type="TEXT",
                        inferred_type="text",
                        nullable=False,
                        order=0,
                    ),
                    ExternalTableColumn(
                        name="amount",
                        data_type="NUMERIC",
                        inferred_type="decimal",
                        nullable=False,
                        order=1,
                    ),
                ],
            )
        ]

    def read_table(
        self,
        config: ExternalDatabaseConnectionConfig,
        *,
        schema_name: str,
        table_name: str,
        limit: int,
    ) -> ExternalQueryResult:
        self.table_reads.append((config, schema_name, table_name, limit))
        return ExternalQueryResult(
            fields=[
                ImportFieldPreview(
                    name="customer",
                    inferred_type="text",
                    nullable=False,
                    order=0,
                ),
                ImportFieldPreview(
                    name="amount",
                    inferred_type="decimal",
                    nullable=False,
                    order=1,
                ),
            ],
            rows=[
                {"customer": "Ada", "amount": 19.5},
                {"customer": "Lin", "amount": 42.0},
            ],
        )

    def run_read_only_sql(
        self,
        config: ExternalDatabaseConnectionConfig,
        *,
        sql: str,
        limit: int,
    ) -> ExternalQueryResult:
        self.sql_reads.append((config, sql, limit))
        return ExternalQueryResult(
            fields=[
                ImportFieldPreview(
                    name="region",
                    inferred_type="text",
                    nullable=False,
                    order=0,
                ),
                ImportFieldPreview(
                    name="total_amount",
                    inferred_type="decimal",
                    nullable=False,
                    order=1,
                ),
            ],
            rows=[{"region": "West", "total_amount": 61.5}],
        )


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


def test_external_database_api_discovers_schema_and_imports_datasets(
    client: TestClient,
) -> None:
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
    connection_id = create_response.json()["id"]

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
    schema_response = client.get(
        f"/api/data-sources/external-databases/{connection_id}/schema",
        headers=headers,
    )
    table_import_response = client.post(
        f"/api/data-sources/external-databases/{connection_id}/import-table",
        headers=headers,
        json={
            "project_id": project_id,
            "dataset_name": "External Orders",
            "schema_name": "public",
            "table_name": "orders",
            "limit": 100,
        },
    )
    sql_import_response = client.post(
        f"/api/data-sources/external-databases/{connection_id}/import-sql",
        headers=headers,
        json={
            "project_id": project_id,
            "dataset_name": "External SQL Orders",
            "sql": "SELECT customer, amount FROM orders",
            "limit": 100,
        },
    )
    unsafe_sql_response = client.post(
        f"/api/data-sources/external-databases/{connection_id}/import-sql",
        headers=headers,
        json={
            "project_id": project_id,
            "dataset_name": "Unsafe",
            "sql": "DELETE FROM orders",
            "limit": 100,
        },
    )
    client.app.dependency_overrides.pop(get_data_source_service, None)

    assert schema_response.status_code == 200
    schema_payload = schema_response.json()
    assert schema_payload["tables"][0]["schema_name"] == "public"
    assert schema_payload["tables"][0]["columns"][0]["name"] == "customer"

    assert table_import_response.status_code == 201
    table_dataset = table_import_response.json()["dataset"]
    assert table_dataset["name"] == "External Orders"
    assert table_dataset["row_count"] == 2

    assert sql_import_response.status_code == 201
    sql_dataset = sql_import_response.json()["dataset"]
    assert sql_dataset["name"] == "External SQL Orders"
    assert sql_dataset["row_count"] == 1

    preview_response = client.get(
        f"/api/datasets/{table_dataset['id']}/preview",
        headers=headers,
        params={"page": 1, "page_size": 10},
    )
    assert preview_response.status_code == 200
    assert preview_response.json()["rows"][0]["customer"] == "Ada"
    assert unsafe_sql_response.status_code == 400
    assert unsafe_sql_response.json()["error"]["code"] == "sql_not_read_only"


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


def test_data_source_service_discovers_schema_and_imports_external_table() -> None:
    session = create_test_session()
    project_id, actor_id = create_project_in_session(session)
    tester = FakeTester()
    audit = AuditService(AuditRepository(session), actor_id=actor_id)
    service = DataSourceService(
        DataSourceRepository(session),
        tester=tester,
        audit=audit,
    )
    datasets = DatasetService(
        DatasetRepository(session),
        audit=audit,
        tasks=TaskService(TaskRepository(session), initiator_id=actor_id),
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

    inspected_connection, tables = service.inspect_external_schema(connection.id)
    result = service.import_external_table(
        connection.id,
        ExternalTableImportRequest(
            project_id=project_id,
            dataset_name="External Orders",
            schema_name="public",
            table_name="orders",
            limit=500,
        ),
        datasets,
    )

    assert inspected_connection.id == connection.id
    assert tables[0].table_name == "orders"
    assert tester.inspect_configs[0].password == "secret-password"
    assert tester.table_reads[0][1:] == ("public", "orders", 500)
    assert result.source_type == "external_table"
    assert result.dataset.name == "External Orders"
    assert result.dataset.row_count == 2

    dataset, rows = datasets.list_dataset_rows(result.dataset.id)
    assert dataset.fields[0].name == "customer"
    assert rows[0]["customer"] == "Ada"

    tasks = list(session.scalars(select(TaskModel).order_by(TaskModel.created_at)))
    assert any(
        task.task_type == "external_table_import"
        and task.status == "success"
        and task.related_resource_id == result.dataset.id
        for task in tasks
    )
    logs = list(session.scalars(select(OperationLogModel).order_by(OperationLogModel.created_at)))
    assert {log.action for log in logs} >= {
        "data_source.external_schema_inspected",
        "data_source.external_table_imported",
        "dataset.created",
    }
    lineage_edges = list(session.scalars(select(LineageEdgeModel)))
    assert any(
        edge.source_type == "external_database_table"
        and edge.source_id == f"{connection.id}:public.orders"
        and edge.target_id == result.dataset.id
        for edge in lineage_edges
    )


def test_data_source_service_imports_external_read_only_sql() -> None:
    session = create_test_session()
    project_id, actor_id = create_project_in_session(session)
    tester = FakeTester()
    audit = AuditService(AuditRepository(session), actor_id=actor_id)
    service = DataSourceService(
        DataSourceRepository(session),
        tester=tester,
        audit=audit,
    )
    datasets = DatasetService(
        DatasetRepository(session),
        audit=audit,
        tasks=TaskService(TaskRepository(session), initiator_id=actor_id),
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

    result = service.import_external_sql(
        connection.id,
        ExternalSqlImportRequest(
            project_id=project_id,
            dataset_name="Regional Sales",
            sql="SELECT region, SUM(amount) AS total_amount FROM orders GROUP BY region",
            limit=100,
        ),
        datasets,
    )

    assert tester.sql_reads[0][1:] == (
        "SELECT region, SUM(amount) AS total_amount FROM orders GROUP BY region",
        100,
    )
    assert result.source_type == "external_sql"
    assert result.dataset.name == "Regional Sales"
    dataset, rows = datasets.list_dataset_rows(result.dataset.id)
    assert dataset.row_count == 1
    assert rows[0]["region"] == "West"

    lineage_edges = list(session.scalars(select(LineageEdgeModel)))
    assert any(
        edge.source_type == "external_database_sql"
        and edge.target_id == result.dataset.id
        and edge.transform_type == "external_sql_import"
        for edge in lineage_edges
    )


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
