import pytest
from fastapi.testclient import TestClient

from app.auth.service import auth_service
from app.main import create_app
from app.permissions.service import permission_service
from app.projects.service import project_service


@pytest.fixture(autouse=True)
def reset_development_services() -> None:
    auth_service.reset()
    project_service.reset()
    permission_service.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
