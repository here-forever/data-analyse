from dataclasses import dataclass
from datetime import UTC, datetime

from app.core.ids import new_id
from app.models.task import Task as TaskModel
from app.tasks.repository import TaskRepository
from app.tasks.schemas import TaskResponse, TaskStatus


@dataclass(frozen=True)
class Task:
    id: str
    project_id: str | None
    initiator_id: str | None
    name: str
    task_type: str
    status: TaskStatus
    progress: int
    error_message: str | None
    related_resource_type: str | None
    related_resource_id: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskService:
    def __init__(
        self,
        repository: TaskRepository | None = None,
        initiator_id: str | None = None,
    ) -> None:
        self.repository = repository
        self.initiator_id = initiator_id
        self._tasks: dict[str, Task] = {}

    def reset(self) -> None:
        self._tasks = {}

    def record_success(
        self,
        *,
        project_id: str | None,
        name: str,
        task_type: str,
        related_resource_type: str | None = None,
        related_resource_id: str | None = None,
    ) -> Task:
        now = datetime.now(UTC)
        return self._save_task(
            Task(
                id=self._new_task_id(),
                project_id=project_id,
                initiator_id=self.initiator_id,
                name=name,
                task_type=task_type,
                status="success",
                progress=100,
                error_message=None,
                related_resource_type=related_resource_type,
                related_resource_id=related_resource_id,
                started_at=now,
                finished_at=now,
                created_at=now,
                updated_at=now,
            )
        )

    def record_failure(
        self,
        *,
        project_id: str | None,
        name: str,
        task_type: str,
        error_message: str,
        related_resource_type: str | None = None,
        related_resource_id: str | None = None,
    ) -> Task:
        now = datetime.now(UTC)
        return self._save_task(
            Task(
                id=self._new_task_id(),
                project_id=project_id,
                initiator_id=self.initiator_id,
                name=name,
                task_type=task_type,
                status="failed",
                progress=100,
                error_message=error_message,
                related_resource_type=related_resource_type,
                related_resource_id=related_resource_id,
                started_at=now,
                finished_at=now,
                created_at=now,
                updated_at=now,
            )
        )

    def list_tasks(self, project_id: str | None = None) -> list[Task]:
        if self.repository is not None:
            return [model_to_task(task) for task in self.repository.list_tasks(project_id)]

        tasks = list(self._tasks.values())
        if project_id:
            tasks = [task for task in tasks if task.project_id == project_id]
        return sorted(tasks, key=lambda task: task.created_at, reverse=True)

    def _new_task_id(self) -> str:
        if self.repository is not None:
            return new_id("task")
        return f"task_{len(self._tasks) + 1}"

    def _save_task(self, task: Task) -> Task:
        if self.repository is not None:
            return model_to_task(
                self.repository.save_task(
                    TaskModel(
                        id=task.id,
                        project_id=task.project_id,
                        initiator_id=task.initiator_id,
                        name=task.name,
                        task_type=task.task_type,
                        status=task.status,
                        progress=task.progress,
                        error_message=task.error_message,
                        related_resource_type=task.related_resource_type,
                        related_resource_id=task.related_resource_id,
                        started_at=task.started_at,
                        finished_at=task.finished_at,
                    )
                )
            )

        self._tasks[task.id] = task
        return task


def model_to_task(task: TaskModel) -> Task:
    return Task(
        id=task.id,
        project_id=task.project_id,
        initiator_id=task.initiator_id,
        name=task.name,
        task_type=task.task_type,
        status=task.status,
        progress=task.progress,
        error_message=task.error_message,
        related_resource_type=task.related_resource_type,
        related_resource_id=task.related_resource_id,
        started_at=task.started_at,
        finished_at=task.finished_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def to_task_response(task: Task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        initiator_id=task.initiator_id,
        name=task.name,
        task_type=task.task_type,
        status=task.status,
        progress=task.progress,
        error_message=task.error_message,
        related_resource_type=task.related_resource_type,
        related_resource_id=task.related_resource_id,
        started_at=task.started_at,
        finished_at=task.finished_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


task_service = TaskService()
