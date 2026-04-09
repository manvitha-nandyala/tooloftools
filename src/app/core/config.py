from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Tool & Agent Platform"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    database_url: str = (
        "postgresql+asyncpg://tooloftools:tooloftools@localhost:5432/tooloftools"
    )
    database_echo: bool = False

    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # Pagination defaults
    default_page_size: int = 20
    max_page_size: int = 100

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
