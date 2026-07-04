from dataclasses import dataclass

from app.auth.service import User, auth_service
from app.core.errors import AppError
from app.projects.schemas import ProjectRole


@dataclass(frozen=True)
class Project:
    id: str
    name: str
    description: str | None
    owner_id: str


@dataclass(frozen=True)
class ProjectMember:
    project_id: str
    user_id: str
    role: ProjectRole


class ProjectService:
    def __init__(self) -> None:
        self._projects: dict[str, Project] = {}
        self._members: list[ProjectMember] = []
        self.reset()

    def reset(self) -> None:
        self._projects: dict[str, Project] = {}
        self._members: list[ProjectMember] = []

    def create_project(self, *, name: str, description: str | None, owner: User) -> Project:
        project = Project(
            id=f"prj_{len(self._projects) + 1}",
            name=name,
            description=description,
            owner_id=owner.id,
        )
        self._projects[project.id] = project
        self._members.append(ProjectMember(project_id=project.id, user_id=owner.id, role="owner"))
        return project

    def list_projects_for_user(self, user: User) -> list[tuple[Project, ProjectRole]]:
        memberships = [member for member in self._members if member.user_id == user.id]
        return [
            (self._projects[member.project_id], member.role)
            for member in memberships
            if member.project_id in self._projects
        ]

    def get_project(self, project_id: str) -> Project:
        project = self._projects.get(project_id)
        if project is None:
            raise AppError(message="Project not found", code="project_not_found", status_code=404)
        return project

    def add_member(
        self, *, project_id: str, email: str, role: ProjectRole
    ) -> tuple[User, ProjectRole]:
        self.get_project(project_id)
        user = auth_service.ensure_user(email)

        existing = next(
            (
                member
                for member in self._members
                if member.project_id == project_id and member.user_id == user.id
            ),
            None,
        )
        if existing is not None:
            self._members.remove(existing)

        self._members.append(ProjectMember(project_id=project_id, user_id=user.id, role=role))
        return user, role

    def list_members(self, project_id: str) -> list[tuple[User, ProjectRole]]:
        self.get_project(project_id)
        members = [member for member in self._members if member.project_id == project_id]
        return [(auth_service.get_user_by_id(member.user_id), member.role) for member in members]


project_service = ProjectService()
