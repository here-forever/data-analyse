from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.data_sources.connectors import iter_external_result_rows
from app.datasets.materializer import DatasetMaterializer, iter_batches
from app.datasets.service import build_materialization_progress_callback
from app.imports.parser import iter_typed_tabular_rows
from app.imports.schemas import ImportFieldPreview
from app.tasks.service import TaskService


def test_iter_typed_tabular_rows_reads_retained_csv_without_full_row_list(tmp_path) -> None:
    source_path = tmp_path / "sales.csv"
    source_path.write_bytes(
        b"order_id,amount\n1,19.5\n2,42.0\n3,\n",
    )

    fields = [
        ImportFieldPreview(
            name="order_id",
            inferred_type="integer",
            nullable=False,
            order=0,
        ),
        ImportFieldPreview(
            name="amount",
            inferred_type="decimal",
            nullable=True,
            order=1,
        ),
    ]

    rows = list(iter_typed_tabular_rows("sales.csv", source_path, fields))

    assert rows == [
        {"order_id": 1, "amount": 19.5},
        {"order_id": 2, "amount": 42.0},
        {"order_id": 3, "amount": None},
    ]


def test_iter_batches_keeps_insert_payloads_bounded() -> None:
    rows = ({"value": value} for value in range(5))

    batches = list(iter_batches(rows, batch_size=2))

    assert batches == [
        [{"value": 0}, {"value": 1}],
        [{"value": 2}, {"value": 3}],
        [{"value": 4}],
    ]


def test_materializer_reports_real_inserted_row_counts_per_batch() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    session = Session(engine)
    fields = [
        ImportFieldPreview(
            name="value",
            inferred_type="integer",
            nullable=False,
            order=0,
        )
    ]
    reported_rows: list[int] = []

    inserted_rows = DatasetMaterializer(session).create_table(
        table_name="ds_progress_test",
        fields=fields,
        rows=({"value": value} for value in range(2001)),
        on_batch_inserted=reported_rows.append,
    )

    assert inserted_rows == 2001
    assert reported_rows == [1000, 2000, 2001]


def test_materialization_progress_is_monotonic_and_bounded() -> None:
    tasks = TaskService(initiator_id="usr_test")
    task = tasks.start_task(
        project_id="prj_test",
        name="Streaming import",
        task_type="external_table_import",
        progress=35,
    )
    callback = build_materialization_progress_callback(
        tasks=tasks,
        task_id=task.id,
        expected_row_count=2001,
        start_progress=35,
        end_progress=90,
    )

    assert callback is not None
    callback(1000)
    assert tasks.get_task(task.id).progress == 62
    callback(1000)
    assert tasks.get_task(task.id).progress == 62
    callback(2000)
    assert tasks.get_task(task.id).progress == 89
    callback(2001)
    callback(3000)
    assert tasks.get_task(task.id).progress == 90


def test_external_result_iterator_uses_bounded_fetchmany_batches() -> None:
    result = FakeCursorResult([{"value": value} for value in range(5)])

    rows = list(iter_external_result_rows(result, batch_size=2))

    assert rows == [{"value": value} for value in range(5)]
    assert result.fetch_sizes == [2, 2, 2, 2]


class FakeCursorRow:
    def __init__(self, row: dict[str, object | None]) -> None:
        self._mapping = row


class FakeCursorResult:
    def __init__(self, rows: list[dict[str, object | None]]) -> None:
        self.rows = rows
        self.offset = 0
        self.fetch_sizes: list[int] = []

    def fetchmany(self, size: int) -> list[FakeCursorRow]:
        self.fetch_sizes.append(size)
        batch = self.rows[self.offset : self.offset + size]
        self.offset += len(batch)
        return [FakeCursorRow(row) for row in batch]
