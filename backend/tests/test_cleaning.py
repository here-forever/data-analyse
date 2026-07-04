from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import get_db_session
from app.models.audit import LineageEdge as LineageEdgeModel
from app.models.audit import OperationLog as OperationLogModel


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
        json={"name": "Cleaning Project", "description": None},
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_dataset(client: TestClient, headers: dict[str, str], project_id: str) -> dict:
    upload_response = client.post(
        "/api/imports/file-previews",
        headers=headers,
        data={"project_id": project_id},
        files={
            "file": (
                "customers.csv",
                b"customer,region,amount\nAda,,19.5\nAda,,19.5\nLin,East,42.0\n",
                "text/csv",
            )
        },
    )
    assert upload_response.status_code == 201
    preview = upload_response.json()

    dataset_response = client.post(
        "/api/datasets",
        headers=headers,
        json={
            "project_id": project_id,
            "preview_id": preview["id"],
            "name": "Customers",
            "fields": preview["fields"],
        },
    )

    assert dataset_response.status_code == 201
    return dataset_response.json()


def test_create_cleaning_recipe_persists_steps_audit_and_lineage(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    dataset = create_dataset(client, headers, project_id)

    response = client.post(
        "/api/cleaning/recipes",
        headers=headers,
        json={
            "project_id": project_id,
            "source_dataset_id": dataset["id"],
            "name": "Clean customers",
            "description": "Normalize customer dataset",
            "steps": [
                {
                    "operation": "rename_field",
                    "order": 0,
                    "config": {"source_field": "amount", "target_field": "sales_amount"},
                },
                {
                    "operation": "fill_null",
                    "order": 1,
                    "config": {"field": "region", "value": "Unknown"},
                },
            ],
        },
    )

    assert response.status_code == 201
    recipe = response.json()
    assert recipe["name"] == "Clean customers"
    assert recipe["source_dataset_id"] == dataset["id"]
    assert [step["operation"] for step in recipe["steps"]] == ["rename_field", "fill_null"]

    list_response = client.get(
        "/api/cleaning/recipes",
        headers=headers,
        params={"project_id": project_id},
    )
    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == recipe["id"]

    detail_response = client.get(f"/api/cleaning/recipes/{recipe['id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["steps"][0]["config"]["target_field"] == "sales_amount"

    session = next(client.app.dependency_overrides[get_db_session]())
    try:
        operation_log = session.scalar(
            select(OperationLogModel).where(OperationLogModel.action == "cleaning.recipe_created")
        )
        lineage_edge = session.scalar(
            select(LineageEdgeModel).where(LineageEdgeModel.target_id == recipe["id"])
        )
    finally:
        session.close()

    assert operation_log is not None
    assert operation_log.resource_id == recipe["id"]
    assert operation_log.detail["source_dataset_id"] == dataset["id"]
    assert lineage_edge is not None
    assert lineage_edge.source_type == "dataset"
    assert lineage_edge.source_id == dataset["id"]
    assert lineage_edge.target_type == "cleaning_recipe"


def test_preview_cleaning_steps_against_materialized_dataset(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    dataset = create_dataset(client, headers, project_id)

    response = client.post(
        "/api/cleaning/preview",
        headers=headers,
        json={
            "project_id": project_id,
            "source_dataset_id": dataset["id"],
            "page": 1,
            "page_size": 20,
            "steps": [
                {
                    "operation": "fill_null",
                    "order": 0,
                    "config": {"field": "region", "value": "Unknown"},
                },
                {
                    "operation": "deduplicate",
                    "order": 1,
                    "config": {"fields": ["customer", "region", "amount"]},
                },
                {
                    "operation": "rename_field",
                    "order": 2,
                    "config": {"source_field": "amount", "target_field": "sales_amount"},
                },
            ],
        },
    )

    assert response.status_code == 200
    preview = response.json()
    assert preview["fields"] == ["_das_row_id", "customer", "region", "sales_amount"]
    assert preview["total_rows"] == 2
    assert preview["rows"][0]["region"] == "Unknown"
    assert preview["rows"][0]["sales_amount"] == 19.5
    assert "amount" not in preview["rows"][0]


def test_cleaning_preview_rejects_unknown_field(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    dataset = create_dataset(client, headers, project_id)

    response = client.post(
        "/api/cleaning/preview",
        headers=headers,
        json={
            "project_id": project_id,
            "source_dataset_id": dataset["id"],
            "steps": [
                {
                    "operation": "fill_null",
                    "order": 0,
                    "config": {"field": "missing_field", "value": "Unknown"},
                }
            ],
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_cleaning_step"
