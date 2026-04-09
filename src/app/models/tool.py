from datetime import datetime

from sqlalchemy import Boolean, DateTime, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.app.core.database import Base

# Use JSON everywhere, but JSONB on PostgreSQL for indexing/query support
JsonType = JSON().with_variant(JSONB, "postgresql")


class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100), index=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    tool_type: Mapped[str] = mapped_column(String(50), nullable=False)
    input_schema: Mapped[dict] = mapped_column(JsonType, nullable=False)
    output_schema: Mapped[dict | None] = mapped_column(JsonType)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JsonType)
    endpoint: Mapped[str | None] = mapped_column(String(500))
    tags: Mapped[list | None] = mapped_column(JsonType)
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    owner: Mapped[str | None] = mapped_column(String(255))
    documentation_url: Mapped[str | None] = mapped_column(String(500))
    auth_config: Mapped[dict | None] = mapped_column(JsonType)
    rate_limit: Mapped[dict | None] = mapped_column(JsonType)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
