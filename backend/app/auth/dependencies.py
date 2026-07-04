from typing import Annotated

from fastapi import Header

from app.auth.service import User, auth_service
from app.core.errors import AppError


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> User:
    if authorization is None or not authorization.lower().startswith("bearer "):
        raise AppError(
            message="Authentication is required",
            code="not_authenticated",
            status_code=401,
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise AppError(
            message="Authentication is required",
            code="not_authenticated",
            status_code=401,
        )

    return auth_service.get_user_by_token(token)
