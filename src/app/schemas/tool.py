from datetime import datetime

from pydantic import BaseModel, Field


class ToolCreate(BaseModel):
    id: str = Field(..., pattern=r"^[a-z0-9]+\.[a-z0-9_-]+$", examples=["scheduling.create_meeting"])
    name: str = Field(..., max_length=255)
    description: str | None = None
    category: str | None = Field(None, max_length=100)
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$", examples=["1.0.0"])
    tool_type: str = Field(..., examples=["REST_API", "gRPC", "workflow", "agent"])
    input_schema: dict
    output_schema: dict | None = None
    metadata_: dict | None = Field(None, alias="metadata")
    endpoint: str | None = Field(None, max_length=500)
    tags: list[str] | None = None
    owner: str | None = Field(None, max_length=255)
    documentation_url: str | None = Field(None, max_length=500)
    auth_config: dict | None = None
    rate_limit: dict | None = None

    model_config = {"populate_by_name": True}


class ToolUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    category: str | None = Field(None, max_length=100)
    version: str | None = Field(None, pattern=r"^\d+\.\d+\.\d+$")
    tool_type: str | None = None
    input_schema: dict | None = None
    output_schema: dict | None = None
    metadata_: dict | None = Field(None, alias="metadata")
    endpoint: str | None = Field(None, max_length=500)
    tags: list[str] | None = None
    active: bool | None = None
    owner: str | None = Field(None, max_length=255)
    documentation_url: str | None = Field(None, max_length=500)
    auth_config: dict | None = None
    rate_limit: dict | None = None

    model_config = {"populate_by_name": True}


class ToolResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    category: str | None = None
    version: str
    tool_type: str
    input_schema: dict
    output_schema: dict | None = None
    metadata: dict | None = None
    endpoint: str | None = None
    tags: list[str] | None = None
    active: bool
    owner: str | None = None
    documentation_url: str | None = None
    auth_config: dict | None = None
    rate_limit: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, tool: object) -> "ToolResponse":
        """Map SQLAlchemy model (which uses metadata_) to response (which uses metadata)."""
        from src.app.models.tool import Tool as ToolModel

        assert isinstance(tool, ToolModel)
        return cls(
            id=tool.id,
            name=tool.name,
            description=tool.description,
            category=tool.category,
            version=tool.version,
            tool_type=tool.tool_type,
            input_schema=tool.input_schema,
            output_schema=tool.output_schema,
            metadata=tool.metadata_,
            endpoint=tool.endpoint,
            tags=tool.tags,
            active=tool.active,
            owner=tool.owner,
            documentation_url=tool.documentation_url,
            auth_config=tool.auth_config,
            rate_limit=tool.rate_limit,
            created_at=tool.created_at,
            updated_at=tool.updated_at,
        )


class ToolListResponse(BaseModel):
    items: list[ToolResponse]
    total: int
    page: int
    size: int
    pages: int
