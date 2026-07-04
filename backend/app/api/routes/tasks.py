from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.core.database import get_db_session
from app.tasks.repository import TaskRepository
from app.tasks.schemas import TaskListResponse, TaskRetryResponse
from app.tasks.service import TaskService, to_task_response

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(
    session: Annotated[Session, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskService:
    return TaskService(TaskRepository(session), initiator_id=current_user.id)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    tasks: Annotated[TaskService, Depends(get_task_service)],
    project_id: str | None = None,
) -> TaskListResponse:
    return TaskListResponse(items=[to_task_response(task) for task in tasks.list_tasks(project_id)])


@router.post("/{task_id}/retry", response_model=TaskRetryResponse)
def retry_task(
    task_id: str,
    tasks: Annotated[TaskService, Depends(get_task_service)],
) -> TaskRetryResponse:
    original_task, retry_task = tasks.request_retry(task_id)
    return TaskRetryResponse(
        original_task=to_task_response(original_task),
        retry_task=to_task_response(retry_task),
    )
