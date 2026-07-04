from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.auth.service import User
from app.permissions.schemas import (
    ResourcePermissionCreateRequest,
    ResourcePermissionResponse,
)
from app.permissions.service import ResourcePermission, permission_service

router = APIRouter(prefix="/permissions", tags=["permissions"])


def to_permission_response(permission: ResourcePermission) -> ResourcePermissionResponse:
    return ResourcePermissionResponse(
        id=permission.id,
        project_id=permission.project_id,
        resource_type=permission.resource_type,
        resource_id=permission.resource_id,
        principal_type=permission.principal_type,
        principal_id=permission.principal_id,
        actions=permission.actions,
    )


@router.post(
    "/resources",
    response_model=ResourcePermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_resource_permission(
    payload: ResourcePermissionCreateRequest,
    _current_user: Annotated[User, Depends(get_current_user)],
) -> ResourcePermissionResponse:
    permission = permission_service.create_resource_permission(
        project_id=payload.project_id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        principal_type=payload.principal_type,
        principal_id=payload.principal_id,
        actions=payload.actions,
    )
    return to_permission_response(permission)


@router.get("/resources", response_model=list[ResourcePermissionResponse])
def list_resource_permissions(
    _current_user: Annotated[User, Depends(get_current_user)],
    project_id: str = Query(),
) -> list[ResourcePermissionResponse]:
    return [
        to_permission_response(permission)
        for permission in permission_service.list_resource_permissions(project_id)
    ]
