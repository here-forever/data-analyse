from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.projects.schemas import (
    ProjectCreateRequest,
    ProjectMemberCreateRequest,
    ProjectMemberResponse,
    ProjectResponse,
)
from app.projects.service import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> ProjectResponse:
    project = project_service.create_project(
        name=payload.name,
        description=payload.description,
        owner=current_user,
    )
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        role="owner",
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ProjectResponse]:
    return [
        ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_id=project.owner_id,
            role=role,
        )
        for project, role in project_service.list_projects_for_user(current_user)
    ]


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project_member(
    project_id: str,
    payload: ProjectMemberCreateRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
) -> ProjectMemberResponse:
    user, role = project_service.add_member(
        project_id=project_id,
        email=payload.email,
        role=payload.role,
    )
    return ProjectMemberResponse(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=role,
    )


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
def list_project_members(
    project_id: str,
    _current_user: Annotated[User, Depends(get_current_user)],
) -> list[ProjectMemberResponse]:
    return [
        ProjectMemberResponse(
            user_id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=role,
        )
        for user, role in project_service.list_members(project_id)
    ]
