from dataclasses import dataclass
from urllib.parse import quote_plus

from sqlalchemy import create_engine, text

from app.data_sources.schemas import DatabaseType


@dataclass(frozen=True)
class ExternalDatabaseConnectionConfig:
    database_type: DatabaseType
    host: str
    port: int
    database_name: str
    username: str
    password: str


@dataclass(frozen=True)
class ConnectionTestResult:
    ok: bool
    message: str


class ExternalDatabaseTester:
    def test_connection(self, config: ExternalDatabaseConnectionConfig) -> ConnectionTestResult:
        engine = create_engine(
            build_sqlalchemy_url(config),
            connect_args=build_connect_args(config),
            pool_pre_ping=True,
        )
        try:
            with engine.connect() as connection:
                if config.database_type == "mysql":
                    connection.execute(text("SET SESSION TRANSACTION READ ONLY"))
                connection.execute(text("SELECT 1"))
        finally:
            engine.dispose()

        return ConnectionTestResult(ok=True, message="Read-only connection test succeeded")


def build_sqlalchemy_url(config: ExternalDatabaseConnectionConfig) -> str:
    username = quote_plus(config.username)
    password = quote_plus(config.password)
    host = config.host.strip()
    database_name = quote_plus(config.database_name)

    if config.database_type == "postgresql":
        return f"postgresql+psycopg://{username}:{password}@{host}:{config.port}/{database_name}"
    if config.database_type == "mysql":
        return f"mysql+pymysql://{username}:{password}@{host}:{config.port}/{database_name}"

    raise ValueError(f"Unsupported database type: {config.database_type}")


def build_connect_args(config: ExternalDatabaseConnectionConfig) -> dict[str, int]:
    if config.database_type == "postgresql":
        return {"connect_timeout": 5}
    if config.database_type == "mysql":
        return {"connect_timeout": 5, "read_timeout": 5, "write_timeout": 5}

    return {}
