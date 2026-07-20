import os
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.audit.repository import AuditRepository
from app.audit.service import AuditService
from app.auth.repository import AuthRepository
from app.auth.service import AuthService
from app.core.config import get_settings
from app.core.database import Base, import_models
from app.data_sources.connectors import (
    ExternalDatabaseConnectionConfig,
    ExternalDatabaseTester,
)
from app.datasets.repository import DatasetRepository
from app.datasets.service import DatasetService
from app.imports.schemas import ImportFieldPreview
from app.models.audit import LineageEdge, OperationLog
from app.models.dataset import Dataset as DatasetModel
from app.models.task import Task as TaskModel
from app.projects.repository import ProjectRepository
from app.projects.service import ProjectService
from app.tasks.repository import TaskRepository
from app.tasks.service import Task, TaskService

TEST_DATABASE_URL = os.getenv("DAS_TEST_POSTGRES_URL")
TEST_DATABASE_NAME = os.getenv("DAS_TEST_POSTGRES_DATABASE")

pytestmark = pytest.mark.skipif(
    not (TEST_DATABASE_URL or TEST_DATABASE_NAME),
    reason=(
        "Set DAS_TEST_POSTGRES_URL or DAS_TEST_POSTGRES_DATABASE to run PostgreSQL "
        "import integration tests"
    ),
)


class ObservingTaskService(TaskService):
    def __init__(
        self,
        repository: TaskRepository,
        *,
        session_factory: sessionmaker[Session],
        project_id: str,
        initiator_id: str,
    ) -> None:
        super().__init__(repository, initiator_id=initiator_id)
        self.session_factory = session_factory
        self.project_id = project_id
        self.observations: list[tuple[int, int, int, set[str]]] = []

    def report_progress(self, task_id: str, progress: int) -> Task:
        task = super().report_progress(task_id, progress)
        with self.session_factory() as observer:
            persisted_task = observer.get(TaskModel, task_id)
            assert persisted_task is not None
            dataset_count = observer.scalar(
                select(func.count())
                .select_from(DatasetModel)
                .where(DatasetModel.project_id == self.project_id)
            )
            table_names = set(inspect(observer.get_bind()).get_table_names())
        self.observations.append(
            (progress, persisted_task.progress, dataset_count or 0, table_names)
        )
        return task


def test_postgres_stream_progress_visibility_and_failure_rollback() -> None:
    test_database_url = resolve_test_database_url()
    engine = create_engine(test_database_url, pool_pre_ping=True)
    import_models()
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    with session_factory() as session:
        auth = AuthService(AuthRepository(session))
        owner = auth.get_or_create_default_admin()
        project = ProjectService(ProjectRepository(session), auth).create_project(
            name="PostgreSQL import reliability",
            description=None,
            owner=owner,
        )
        audit = AuditService(AuditRepository(session), actor_id=owner.id)
        tasks = ObservingTaskService(
            TaskRepository(session),
            session_factory=session_factory,
            project_id=project.id,
            initiator_id=owner.id,
        )
        datasets = DatasetService(
            DatasetRepository(session),
            audit=audit,
            tasks=tasks,
        )
        fields = [
            ImportFieldPreview(
                name="value",
                inferred_type="integer",
                nullable=False,
                order=0,
            )
        ]

        dataset = datasets.create_materialized_dataset_from_rows(
            project_id=project.id,
            name="Successful streaming import",
            fields=fields,
            rows=({"value": value} for value in range(2001)),
            source_type="external_database_table",
            source_id="postgres_probe.success_rows",
            transform_type="external_table_import",
            task_type="external_table_import",
            expected_row_count=2001,
        )

        assert dataset.row_count == 2001
        assert [item[0] for item in tasks.observations] == [62, 89, 90]
        assert all(reported == persisted for reported, persisted, _, _ in tasks.observations)
        assert all(dataset_count == 0 for _, _, dataset_count, _ in tasks.observations)
        assert all(
            dataset.physical_table_name not in table_names
            for _, _, _, table_names in tasks.observations
        )

        source_table = "postgres_cursor_probe"
        with engine.begin() as connection:
            connection.execute(text(f'DROP TABLE IF EXISTS "{source_table}"'))
            connection.execute(
                text(f'CREATE TABLE "{source_table}" (value INTEGER NOT NULL, label TEXT NOT NULL)')
            )
            connection.execute(
                text(
                    f'INSERT INTO "{source_table}" (value, label) '
                    "SELECT value, 'row-' || value FROM generate_series(1, 2501) AS value"
                )
            )

        database_url = make_url(test_database_url)
        config = ExternalDatabaseConnectionConfig(
            database_type="postgresql",
            host=database_url.host or "127.0.0.1",
            port=database_url.port or 5432,
            database_name=database_url.database or "",
            username=database_url.username or "",
            password=database_url.password or "",
        )
        with ExternalDatabaseTester().stream_table(
            config,
            schema_name="public",
            table_name=source_table,
            limit=2501,
            batch_size=257,
        ) as stream:
            streamed_rows = list(stream.rows)

        assert len(streamed_rows) == 2501
        assert streamed_rows[0] == {"value": 1, "label": "row-1"}
        assert streamed_rows[-1] == {"value": 2501, "label": "row-2501"}

        tables_before_failure = set(inspect(engine).get_table_names())
        audit_count_before = session.scalar(select(func.count()).select_from(OperationLog))
        lineage_count_before = session.scalar(select(func.count()).select_from(LineageEdge))

        with pytest.raises(RuntimeError, match="source cursor interrupted"):
            datasets.create_materialized_dataset_from_rows(
                project_id=project.id,
                name="Interrupted streaming import",
                fields=fields,
                rows=interrupted_rows(),
                source_type="external_database_table",
                source_id="postgres_probe.interrupted_rows",
                transform_type="external_table_import",
                task_type="external_table_import",
                expected_row_count=2000,
            )

        assert set(inspect(engine).get_table_names()) == tables_before_failure
        assert (
            session.scalar(
                select(DatasetModel).where(
                    DatasetModel.project_id == project.id,
                    DatasetModel.name == "Interrupted streaming import",
                )
            )
            is None
        )
        assert session.scalar(select(func.count()).select_from(OperationLog)) == audit_count_before
        assert session.scalar(select(func.count()).select_from(LineageEdge)) == lineage_count_before

        failed_task = next(
            task
            for task in tasks.list_tasks(project.id)
            if task.name == "Materializing dataset: Interrupted streaming import"
        )
        assert failed_task.status == "retryable"
        assert failed_task.progress == 100

    engine.dispose()


def resolve_test_database_url() -> str:
    if TEST_DATABASE_URL:
        return TEST_DATABASE_URL
    if TEST_DATABASE_NAME:
        return (
            make_url(get_settings().database_url)
            .set(database=TEST_DATABASE_NAME)
            .render_as_string(hide_password=False)
        )
    raise AssertionError("PostgreSQL integration test database is not configured")


def interrupted_rows() -> Iterator[dict[str, object | None]]:
    for value in range(1000):
        yield {"value": value}
    raise RuntimeError("source cursor interrupted after first batch")
