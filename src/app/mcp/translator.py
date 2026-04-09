"""Translate internal tool registry entries into MCP-compatible tool definitions."""

from mcp import Tool as MCPTool

from src.app.models.tool import Tool


def registry_tool_to_mcp(tool: Tool) -> MCPTool:
    """Convert a registry Tool model to an MCP Tool definition."""
    return MCPTool(
        name=tool.id,
        description=tool.description or tool.name,
        inputSchema=tool.input_schema,
    )
