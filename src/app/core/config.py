from typing import Annotated

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings


def _normalize_postgres_async_url(v: object) -> object:
    """Railway/Heroku often provide postgresql://; SQLAlchemy async needs +asyncpg."""
    if isinstance(v, str) and v.startswith("postgresql://") and "+asyncpg" not in v:
        return v.replace("postgresql://", "postgresql+asyncpg://", 1)
    return v


class Settings(BaseSettings):
    app_name: str = "Tool & Agent Platform"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    database_url: Annotated[
        str,
        BeforeValidator(_normalize_postgres_async_url),
    ] = "postgresql+asyncpg://tooloftools:tooloftools@localhost:5432/tooloftools"
    database_echo: bool = False

    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # Pagination defaults
    default_page_size: int = 20
    max_page_size: int = 100

    # Absolute path to Vite `dist/` (e.g. Docker). If unset, uses repo `frontend/dist`.
    frontend_dist: str | None = Field(default=None, validation_alias="FRONTEND_DIST")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
