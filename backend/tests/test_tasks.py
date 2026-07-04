from fastapi.testclient import TestClient


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
        json={"name": "Task Center Project", "description": None},
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
                "orders.csv",
                b"customer,amount,region\nAda,19.5,West\nLin,42.0,East\n",
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
            "name": "Orders",
            "fields": preview["fields"],
        },
    )

    assert dataset_response.status_code == 201
    dataset = dataset_response.json()
    return {"preview": preview, "dataset": dataset}


def save_sql_data_view(
    client: TestClient,
    headers: dict[str, str],
    project_id: str,
    dataset_id: str,
) -> dict:
    response = client.post(
        "/api/sql/save-data-view",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "West Orders View",
            "description": "Reusable SQL materialization",
            "sql": f"SELECT customer, amount, region FROM {dataset_id} WHERE region = 'West'",
            "limit": 100,
        },
    )

    assert response.status_code == 200
    return response.json()


def execute_cleaning_recipe(
    client: TestClient,
    headers: dict[str, str],
    project_id: str,
    dataset_id: str,
) -> dict:
    recipe_response = client.post(
        "/api/cleaning/recipes",
        headers=headers,
        json={
            "project_id": project_id,
            "source_dataset_id": dataset_id,
            "name": "Clean orders",
            "description": None,
            "steps": [
                {
                    "operation": "fill_null",
                    "order": 0,
                    "config": {"field": "region", "value": "Unknown"},
                }
            ],
        },
    )
    assert recipe_response.status_code == 201
    recipe = recipe_response.json()

    execute_response = client.post(
        f"/api/cleaning/recipes/{recipe['id']}/execute",
        headers=headers,
        json={"output_name": "Orders Cleaned"},
    )

    assert execute_response.status_code == 200
    return execute_response.json()


def save_chart(
    client: TestClient,
    headers: dict[str, str],
    project_id: str,
    data_view_id: str,
) -> dict:
    response = client.post(
        "/api/charts",
        headers=headers,
        json={
            "project_id": project_id,
            "data_view_id": data_view_id,
            "name": "Revenue by Region",
            "chart_type": "bar",
            "config": {"dimension": "region", "metric": "amount"},
        },
    )

    assert response.status_code == 201
    return response.json()


def save_dashboard(
    client: TestClient,
    headers: dict[str, str],
    project_id: str,
    chart_id: str,
) -> dict:
    response = client.post(
        "/api/dashboards",
        headers=headers,
        json={
            "project_id": project_id,
            "name": "Operations Dashboard",
            "layout": {
                "mode": "dashboard",
                "items": [{"chart_id": chart_id, "x": 0, "y": 0, "w": 6, "h": 4}],
            },
        },
    )

    assert response.status_code == 201
    return response.json()


def test_task_center_lists_tasks_from_core_workflow(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    dataset_bundle = create_dataset(client, headers, project_id)
    preview = dataset_bundle["preview"]
    dataset = dataset_bundle["dataset"]
    cleaning_execution = execute_cleaning_recipe(
        client,
        headers,
        project_id,
        dataset["id"],
    )
    data_view = save_sql_data_view(client, headers, project_id, dataset["id"])
    chart = save_chart(client, headers, project_id, data_view["id"])
    dashboard = save_dashboard(client, headers, project_id, chart["id"])

    response = client.get(
        "/api/tasks",
        headers=headers,
        params={"project_id": project_id},
    )

    assert response.status_code == 200
    tasks = response.json()["items"]
    task_by_type = {task["task_type"]: task for task in tasks}

    assert {
        "file_preview_parse",
        "dataset_materialization",
        "cleaning_recipe_execution",
        "sql_data_view_materialization",
        "chart_save",
        "dashboard_save",
    }.issubset(task_by_type)

    assert task_by_type["file_preview_parse"]["related_resource_id"] == preview["id"]
    assert task_by_type["dataset_materialization"]["related_resource_id"] == dataset["id"]
    assert (
        task_by_type["cleaning_recipe_execution"]["related_resource_id"]
        == cleaning_execution["derived_dataset_id"]
    )
    assert task_by_type["sql_data_view_materialization"]["related_resource_id"] == data_view["id"]
    assert task_by_type["chart_save"]["related_resource_id"] == chart["id"]
    assert task_by_type["dashboard_save"]["related_resource_id"] == dashboard["id"]

    for task in task_by_type.values():
        assert task["project_id"] == project_id
        assert task["status"] == "success"
        assert task["progress"] == 100
        assert task["started_at"] is not None
        assert task["finished_at"] is not None


def test_task_center_can_filter_by_project(client: TestClient) -> None:
    headers = login(client)
    first_project_id = create_project(client, headers)
    second_project_id = create_project(client, headers)
    create_dataset(client, headers, first_project_id)
    second_bundle = create_dataset(client, headers, second_project_id)

    response = client.get(
        "/api/tasks",
        headers=headers,
        params={"project_id": second_project_id},
    )

    assert response.status_code == 200
    tasks = response.json()["items"]
    assert tasks
    assert {task["project_id"] for task in tasks} == {second_project_id}
    assert {task["related_resource_id"] for task in tasks} >= {
        second_bundle["preview"]["id"],
        second_bundle["dataset"]["id"],
    }


def test_failed_task_can_request_retry(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)

    failed_upload_response = client.post(
        "/api/imports/file-previews",
        headers=headers,
        data={"project_id": project_id},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert failed_upload_response.status_code == 400
    assert failed_upload_response.json()["error"]["code"] == "unsupported_file_type"

    list_response = client.get(
        "/api/tasks",
        headers=headers,
        params={"project_id": project_id},
    )
    assert list_response.status_code == 200
    failed_task = list_response.json()["items"][0]
    assert failed_task["task_type"] == "file_preview_parse"
    assert failed_task["status"] == "failed"
    assert failed_task["error_message"] == "Only CSV and Excel files are supported"

    retry_response = client.post(
        f"/api/tasks/{failed_task['id']}/retry",
        headers=headers,
    )
    assert retry_response.status_code == 200
    retry_payload = retry_response.json()
    assert retry_payload["original_task"]["id"] == failed_task["id"]
    assert retry_payload["original_task"]["status"] == "retryable"
    assert "Retry requested as" in retry_payload["original_task"]["error_message"]
    assert retry_payload["retry_task"]["status"] == "pending"
    assert retry_payload["retry_task"]["progress"] == 0
    assert retry_payload["retry_task"]["task_type"] == failed_task["task_type"]

    refreshed_response = client.get(
        "/api/tasks",
        headers=headers,
        params={"project_id": project_id},
    )
    assert refreshed_response.status_code == 200
    refreshed_tasks = refreshed_response.json()["items"]
    assert {task["status"] for task in refreshed_tasks} >= {"pending", "retryable"}


def test_successful_task_cannot_request_retry(client: TestClient) -> None:
    headers = login(client)
    project_id = create_project(client, headers)
    create_dataset(client, headers, project_id)

    list_response = client.get(
        "/api/tasks",
        headers=headers,
        params={"project_id": project_id},
    )
    assert list_response.status_code == 200
    success_task = next(
        task for task in list_response.json()["items"] if task["status"] == "success"
    )

    retry_response = client.post(
        f"/api/tasks/{success_task['id']}/retry",
        headers=headers,
    )

    assert retry_response.status_code == 400
    assert retry_response.json()["error"]["code"] == "task_not_retryable"
