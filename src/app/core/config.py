from typing import Annotated

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings


def _normalize_postgres_async_url(v: object) -> object:
    """
    Railway/Heroku often set DATABASE_URL as postgres:// or postgresql://.
    async SQLAlchemy needs postgresql+asyncpg:// for asyncpg.
    """
    if not isinstance(v, str):
        return v
    s = v.strip()
    if not s:
        raise ValueError(
            "DATABASE_URL is empty. In Railway, link the Postgres service and reference its "
            "DATABASE_URL, or set DATABASE_URL explicitly."
        )
    if "+asyncpg" in s or "+psycopg" in s:
        return s
    if s.startswith("postgres://"):
        return "postgresql+asyncpg://" + s[len("postgres://") :]
    if s.startswith("postgresql://"):
        return "postgresql+asyncpg://" + s[len("postgresql://") :]
    return s


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

    # Public self-service registration (always creates consumer; role in body is ignored).
    register_allowed: bool = Field(default=True, validation_alias="REGISTER_ALLOWED")
    password_login_enabled: bool = Field(default=True, validation_alias="PASSWORD_LOGIN_ENABLED")

    # Break-glass admin from env (upsert on startup). Secrets only via environment / platform.
    bootstrap_admin_enabled: bool = Field(default=False, validation_alias="BOOTSTRAP_ADMIN_ENABLED")
    bootstrap_admin_username: str | None = Field(default=None, validation_alias="BOOTSTRAP_ADMIN_USERNAME")
    bootstrap_admin_password: str | None = Field(default=None, validation_alias="BOOTSTRAP_ADMIN_PASSWORD")

    # OIDC (e.g. Azure AD / corporate IdP). Set issuer; discovery loads endpoints.
    oidc_enabled: bool = Field(default=False, validation_alias="OIDC_ENABLED")
    oidc_issuer: str | None = Field(default=None, validation_alias="OIDC_ISSUER")
    oidc_client_id: str | None = Field(default=None, validation_alias="OIDC_CLIENT_ID")
    oidc_client_secret: str | None = Field(default=None, validation_alias="OIDC_CLIENT_SECRET")
    oidc_redirect_uri: str | None = Field(default=None, validation_alias="OIDC_REDIRECT_URI")
    oidc_scopes: str = Field(default="openid email profile", validation_alias="OIDC_SCOPES")
    oidc_default_role: str = Field(default="consumer", validation_alias="OIDC_DEFAULT_ROLE")
    # After OIDC, redirect browser here (e.g. https://app.example.com). Defaults to request host.
    public_app_url: str | None = Field(default=None, validation_alias="PUBLIC_APP_URL")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
