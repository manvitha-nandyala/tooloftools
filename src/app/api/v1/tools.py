import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.deps import require_role
from src.app.core.config import settings
from src.app.core.database import get_db
from src.app.models.user import Role, User
from src.app.schemas.tool import ToolCreate, ToolListResponse, ToolResponse, ToolUpdate
from src.app.services.registry_service import RegistryService
from src.app.services.schema_validator import validate_data_against_schema, validate_json_schema

router = APIRouter(prefix="/api/v1/tools", tags=["tools"])


def _paginated(items: list[ToolResponse], total: int, page: int, size: int) -> ToolListResponse:
    return ToolListResponse(
        items=items, total=total, page=page, size=size, pages=math.ceil(total / size) if size else 0
    )


# --- Read endpoints (any authenticated or anonymous) ---


@router.get("", response_model=ToolListResponse)
async def list_tools(
    page: int = Query(1, ge=1),
    size: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    category: str | None = None,
    tags: str | None = Query(None, description="Comma-separated tags"),
    db: AsyncSession = Depends(get_db),
) -> ToolListResponse:
    svc = RegistryService(db)
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    tools, total = await svc.list_tools(page=page, size=size, category=category, tags=tag_list)
    return _paginated([ToolResponse.from_model(t) for t in tools], total, page, size)


@router.get("/search", response_model=ToolListResponse)
async def search_tools(
    query: str = Query(..., min_length=1),
    category: str | None = None,
    tags: str | None = Query(None, description="Comma-separated tags"),
    page: int = Query(1, ge=1),
    size: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db),
) -> ToolListResponse:
    svc = RegistryService(db)
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    tools, total = await svc.search_tools(
        query_str=query, category=category, tags=tag_list, page=page, size=size
    )
    return _paginated([ToolResponse.from_model(t) for t in tools], total, page, size)


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(tool_id: str, db: AsyncSession = Depends(get_db)) -> ToolResponse:
    svc = RegistryService(db)
    tool = await svc.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolResponse.from_model(tool)


@router.get("/{tool_id}/schema")
async def get_tool_schema(tool_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    svc = RegistryService(db)
    tool = await svc.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return {"input_schema": tool.input_schema, "output_schema": tool.output_schema}


# --- Write endpoints (role-gated) ---


@router.post("", response_model=ToolResponse, status_code=201)
async def create_tool(
    payload: ToolCreate,
    _user: User = Depends(require_role(Role.ADMIN, Role.DEVELOPER)),
    db: AsyncSession = Depends(get_db),
) -> ToolResponse:
    validate_json_schema(payload.input_schema, label="input_schema")
    if payload.output_schema:
        validate_json_schema(payload.output_schema, label="output_schema")
    svc = RegistryService(db)
    existing = await svc.get_tool(payload.id)
    if existing:
        raise HTTPException(status_code=409, detail="Tool with this ID already exists")
    tool = await svc.create_tool(payload)
    return ToolResponse.from_model(tool)


@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: str,
    payload: ToolUpdate,
    _user: User = Depends(require_role(Role.ADMIN, Role.DEVELOPER)),
    db: AsyncSession = Depends(get_db),
) -> ToolResponse:
    if payload.input_schema is not None:
        validate_json_schema(payload.input_schema, label="input_schema")
    if payload.output_schema is not None:
        validate_json_schema(payload.output_schema, label="output_schema")
    svc = RegistryService(db)
    tool = await svc.update_tool(tool_id, payload)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolResponse.from_model(tool)


@router.post("/{tool_id}/validate")
async def validate_tool_input(
    tool_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Validate arbitrary input data against a tool's registered input_schema."""
    svc = RegistryService(db)
    tool = await svc.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    validate_data_against_schema(payload, tool.input_schema, label=f"{tool_id} input")
    return {"valid": True}


@router.delete("/{tool_id}", response_model=ToolResponse)
async def delete_tool(
    tool_id: str,
    _user: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ToolResponse:
    svc = RegistryService(db)
    tool = await svc.deactivate_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return ToolResponse.from_model(tool)
