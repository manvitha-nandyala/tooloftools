from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.deps import require_role
from src.app.core.database import get_db
from src.app.mcp.invocation_gateway import invoke_tool
from src.app.models.user import Role, User
from src.app.services.registry_service import RegistryService

router = APIRouter(prefix="/api/v1/mcp", tags=["mcp"])


class McpCallRequest(BaseModel):
    tool_id: str
    arguments: dict


@router.post("/call")
async def call_tool_via_http(
    payload: McpCallRequest,
    _user: User = Depends(require_role(Role.ADMIN, Role.DEVELOPER, Role.CONSUMER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    svc = RegistryService(db)
    tool = await svc.get_tool(payload.tool_id)
    if not tool or not tool.active:
        raise HTTPException(status_code=404, detail="Tool not found")
    return await invoke_tool(tool, payload.arguments)

