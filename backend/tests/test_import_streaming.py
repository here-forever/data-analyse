from app.datasets.materializer import iter_batches
from app.imports.parser import iter_typed_tabular_rows
from app.imports.schemas import ImportFieldPreview


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
