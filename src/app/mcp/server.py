"""MCP server that dynamically exposes tools from the registry."""

from __future__ import annotations

import json

import structlog
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from mcp.types import Tool as MCPTool
from sqlalchemy import select
from starlette.applications import Starlette
from starlette.routing import Mount, Route

from src.app.core.database import async_session_factory
from src.app.models.tool import Tool
from src.app.mcp.translator import registry_tool_to_mcp

logger = structlog.get_logger("mcp")

server = Server(name="ToolOfTools MCP Server")


@server.list_tools()
async def handle_list_tools() -> list[MCPTool]:
    """Return all active tools from the registry as MCP tool definitions."""
    async with async_session_factory() as session:
        result = await session.execute(select(Tool).where(Tool.active.is_(True)))
        tools = result.scalars().all()
    mcp_tools = [registry_tool_to_mcp(t) for t in tools]
    await logger.ainfo("mcp.list_tools", count=len(mcp_tools))
    return mcp_tools


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[dict]:
    """
    Look up the tool by registry ID, validate input,
    and forward the call to the invocation gateway.
    """
    async with async_session_factory() as session:
        result = await session.execute(select(Tool).where(Tool.id == name, Tool.active.is_(True)))
        tool = result.scalar_one_or_none()

    if not tool:
        return [{"type": "text", "text": json.dumps({"error": f"Tool '{name}' not found or inactive"})}]

    await logger.ainfo("mcp.call_tool", tool_id=name)

    from src.app.mcp.invocation_gateway import invoke_tool

    response = await invoke_tool(tool, arguments)
    return [{"type": "text", "text": json.dumps(response)}]


# SSE transport for MCP clients
sse_transport = SseServerTransport("/messages/")


async def handle_sse(request):
    async with sse_transport.connect_sse(
        request.scope, request.receive, request._send
    ) as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


mcp_app = Starlette(
    routes=[
        Route("/sse", endpoint=handle_sse),
        Mount("/messages/", app=sse_transport.handle_post_message),
    ],
)
