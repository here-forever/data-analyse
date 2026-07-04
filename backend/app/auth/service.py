from dataclasses import dataclass

from app.core.errors import AppError


@dataclass(frozen=True)
class User:
    id: str
    email: str
    display_name: str
    password: str
    is_active: bool = True
    is_platform_admin: bool = False


class AuthService:
    def __init__(self) -> None:
        self._users_by_email: dict[str, User] = {}
        self._tokens: dict[str, str] = {}
        self.reset()

    def reset(self) -> None:
        self._users_by_email = {
            "admin@example.com": User(
                id="usr_admin",
                email="admin@example.com",
                display_name="System Administrator",
                password="admin123",
                is_platform_admin=True,
            )
        }
        self._tokens: dict[str, str] = {}

    def authenticate(self, email: str, password: str) -> str:
        user = self._users_by_email.get(email.lower())
        if user is None or user.password != password or not user.is_active:
            raise AppError(
                message="Invalid email or password",
                code="invalid_credentials",
                status_code=401,
            )

        token = f"local-dev-token-{user.id}"
        self._tokens[token] = user.id
        return token

    def get_user_by_token(self, token: str) -> User:
        user_id = self._tokens.get(token)
        if user_id is None:
            raise AppError(
                message="Authentication is required",
                code="not_authenticated",
                status_code=401,
            )

        return self.get_user_by_id(user_id)

    def get_user_by_id(self, user_id: str) -> User:
        for user in self._users_by_email.values():
            if user.id == user_id:
                return user

        raise AppError(message="User not found", code="user_not_found", status_code=404)

    def ensure_user(self, email: str) -> User:
        normalized_email = email.lower()
        user = self._users_by_email.get(normalized_email)
        if user is not None:
            return user

        user = User(
            id=f"usr_{len(self._users_by_email) + 1}",
            email=normalized_email,
            display_name=normalized_email.split("@")[0].replace(".", " ").title(),
            password="",
        )
        self._users_by_email[normalized_email] = user
        return user


auth_service = AuthService()
