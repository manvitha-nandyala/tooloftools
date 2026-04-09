from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.app.core.database import Base


class Role(StrEnum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    CONSUMER = "consumer"


class AuthProvider(StrEnum):
    PASSWORD = "password"
    OIDC = "oidc"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default=Role.CONSUMER)
    team: Mapped[str | None] = mapped_column(String(255))
    auth_provider: Mapped[str] = mapped_column(
        String(32), nullable=False, default=AuthProvider.PASSWORD.value
    )
    external_sub: Mapped[str | None] = mapped_column(String(512), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class APIKey(Base):
    __tablename__ = "api_keys"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
