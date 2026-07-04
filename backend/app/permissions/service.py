from dataclasses import dataclass

from app.permissions.schemas import PrincipalType, ResourceAction, ResourceType


@dataclass(frozen=True)
class ResourcePermission:
    id: str
    project_id: str
    resource_type: ResourceType
    resource_id: str
    principal_type: PrincipalType
    principal_id: str
    actions: list[ResourceAction]


class PermissionService:
    def __init__(self) -> None:
        self._permissions: list[ResourcePermission] = []
        self.reset()

    def reset(self) -> None:
        self._permissions: list[ResourcePermission] = []

    def create_resource_permission(
        self,
        *,
        project_id: str,
        resource_type: ResourceType,
        resource_id: str,
        principal_type: PrincipalType,
        principal_id: str,
        actions: list[ResourceAction],
    ) -> ResourcePermission:
        permission = ResourcePermission(
            id=f"perm_{len(self._permissions) + 1}",
            project_id=project_id,
            resource_type=resource_type,
            resource_id=resource_id,
            principal_type=principal_type,
            principal_id=principal_id,
            actions=actions,
        )
        self._permissions.append(permission)
        return permission

    def list_resource_permissions(self, project_id: str) -> list[ResourcePermission]:
        return [
            permission for permission in self._permissions if permission.project_id == project_id
        ]


permission_service = PermissionService()
