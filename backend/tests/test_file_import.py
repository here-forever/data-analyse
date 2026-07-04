from io import BytesIO

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import get_db_session


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
        json={"name": "Import Project", "description": None},
    )

    assert response.status_code == 201
    return response.json()["id"]


def test_csv_upload_creates_preview_and_dataset(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)

    upload_response = client.post(
        "/api/imports/file-previews",
        headers=headers,
        data={"project_id": project_id},
        files={
            "file": (
                "sales.csv",
                b"order_id,amount,order_date\n1,19.5,2026-01-01\n2,42.0,2026-01-02\n",
                "text/csv",
            )
        },
    )

    assert upload_response.status_code == 201
    preview = upload_response.json()
    assert preview["file_name"] == "sales.csv"
    assert preview["row_count"] == 2
    assert preview["fields"] == [
        {"name": "order_id", "inferred_type": "integer", "nullable": False, "order": 0},
        {"name": "amount", "inferred_type": "decimal", "nullable": False, "order": 1},
        {"name": "order_date", "inferred_type": "date", "nullable": False, "order": 2},
    ]
    assert preview["sample_rows"][0]["amount"] == 19.5

    dataset_response = client.post(
        "/api/datasets",
        headers=headers,
        json={
            "project_id": project_id,
            "preview_id": preview["id"],
            "name": "Sales Orders",
            "fields": preview["fields"],
        },
    )

    assert dataset_response.status_code == 201
    dataset = dataset_response.json()
    assert dataset["name"] == "Sales Orders"
    assert dataset["source_preview_id"] == preview["id"]
    assert dataset["physical_table_name"].startswith("ds_")

    session = next(client.app.dependency_overrides[get_db_session]())
    try:
        rows = session.execute(
            text(f'SELECT order_id, amount, order_date FROM "{dataset["physical_table_name"]}"')
        ).all()
    finally:
        session.close()

    assert len(rows) == 2
    assert rows[0].order_id == 1
    assert rows[0].amount == 19.5

    list_response = client.get(
        "/api/datasets",
        headers=headers,
        params={"project_id": project_id},
    )
    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == dataset["id"]

    detail_response = client.get(f"/api/datasets/{dataset['id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["fields"] == preview["fields"]

    preview_response = client.get(
        f"/api/datasets/{dataset['id']}/preview",
        headers=headers,
        params={"page": 1, "page_size": 1},
    )
    assert preview_response.status_code == 200
    preview_page = preview_response.json()
    assert preview_page["total_rows"] == 2
    assert preview_page["page"] == 1
    assert preview_page["page_size"] == 1
    assert len(preview_page["rows"]) == 1
    assert preview_page["rows"][0]["_das_row_id"] == 1
    assert preview_page["rows"][0]["order_date"] == "2026-01-01"

    second_page_response = client.get(
        f"/api/datasets/{dataset['id']}/preview",
        headers=headers,
        params={"page": 2, "page_size": 1},
    )
    assert second_page_response.status_code == 200
    assert second_page_response.json()["rows"][0]["order_id"] == 2

    invalid_page_size_response = client.get(
        f"/api/datasets/{dataset['id']}/preview",
        headers=headers,
        params={"page": 1, "page_size": 500},
    )
    assert invalid_page_size_response.status_code == 400
    assert invalid_page_size_response.json()["error"]["code"] == "invalid_page_size"


def test_excel_upload_creates_preview(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    workbook = BytesIO()

    from openpyxl import Workbook

    sheet = Workbook()
    active = sheet.active
    active.append(["customer", "score"])
    active.append(["Ada", 98])
    active.append(["Lin", 87])
    sheet.save(workbook)
    workbook.seek(0)

    response = client.post(
        "/api/imports/file-previews",
        headers=headers,
        data={"project_id": project_id},
        files={
            "file": (
                "scores.xlsx",
                workbook.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 201
    assert response.json()["fields"][1] == {
        "name": "score",
        "inferred_type": "integer",
        "nullable": False,
        "order": 1,
    }


def test_unsupported_file_type_is_rejected(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)

    response = client.post(
        "/api/imports/file-previews",
        headers=headers,
        data={"project_id": project_id},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "unsupported_file_type"
