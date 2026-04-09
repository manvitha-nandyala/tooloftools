"""Gateway that executes tool calls against downstream services.

Supports REST API tools with:
- Input validation against the tool's registered JSON Schema
- Configurable timeout and retries with exponential backoff
- Structured error normalization
- Basic rate-limit tracking (logged, not enforced at gateway level yet)
"""

from __future__ import annotations

import time

import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.app.models.tool import Tool
from src.app.middleware.metrics import TOOL_INVOCATION_COUNT, TOOL_INVOCATION_DURATION
from src.app.services.schema_validator import validate_data_against_schema

logger = structlog.get_logger("gateway")

DEFAULT_TIMEOUT_S = 30.0
MAX_RETRIES = 3

_http_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=httpx.Timeout(DEFAULT_TIMEOUT_S))
    return _http_client


def _build_headers(tool: Tool) -> dict[str, str]:
    """Build request headers from the tool's auth_config."""
    headers: dict[str, str] = {"Content-Type": "application/json"}
    auth = tool.auth_config or {}
    auth_type = auth.get("type", "").lower()

    if auth_type == "api_key":
        header_name = auth.get("header", "Authorization")
        prefix = auth.get("prefix", "")
        key = auth.get("key", "")
        headers[header_name] = f"{prefix} {key}".strip() if prefix else key
    elif auth_type in ("oauth2", "bearer"):
        token = auth.get("token", "")
        headers["Authorization"] = f"Bearer {token}"

    return headers


async def _do_request(tool: Tool, payload: dict) -> httpx.Response:
    """Execute the HTTP call. Wrapped by tenacity for retries."""
    client = _get_client()
    headers = _build_headers(tool)

    sla_ms = (tool.metadata_ or {}).get("sla_ms")
    timeout = (sla_ms / 1000 * 2) if sla_ms else DEFAULT_TIMEOUT_S

    method = (tool.metadata_ or {}).get("http_method", "POST").upper()

    if method == "GET":
        return await client.get(
            str(tool.endpoint), params=payload, headers=headers, timeout=timeout
        )
    return await client.post(
        str(tool.endpoint), json=payload, headers=headers, timeout=timeout
    )


@retry(
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    stop=stop_after_attempt(MAX_RETRIES),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    reraise=True,
)
async def _request_with_retry(tool: Tool, payload: dict) -> httpx.Response:
    return await _do_request(tool, payload)


async def invoke_tool(tool: Tool, arguments: dict) -> dict:
    """
    Validate input, call the downstream tool, and normalize the response.
    Returns a dict suitable for JSON serialization back to the MCP client.
    """
    start = time.perf_counter()
    status_label = "success"

    # 1. Validate input
    try:
        validate_data_against_schema(arguments, tool.input_schema, label=f"{tool.id} input")
    except Exception as exc:
        status_label = "validation_error"
        TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
        TOOL_INVOCATION_DURATION.labels(tool.id).observe(time.perf_counter() - start)
        return {"error": "validation_error", "detail": str(exc)}

    # 2. Check endpoint
    if not tool.endpoint:
        status_label = "configuration_error"
        TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
        return {"error": "configuration_error", "detail": f"Tool '{tool.id}' has no endpoint configured"}

    # 3. Execute
    await logger.ainfo("gateway.invoke", tool_id=tool.id, endpoint=tool.endpoint)

    try:
        response = await _request_with_retry(tool, arguments)
    except httpx.TimeoutException:
        status_label = "timeout"
        await logger.awarn("gateway.timeout", tool_id=tool.id)
        TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
        TOOL_INVOCATION_DURATION.labels(tool.id).observe(time.perf_counter() - start)
        return {"error": "timeout", "detail": f"Tool '{tool.id}' timed out after retries"}
    except httpx.ConnectError:
        status_label = "connection_error"
        await logger.awarn("gateway.connect_error", tool_id=tool.id)
        TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
        TOOL_INVOCATION_DURATION.labels(tool.id).observe(time.perf_counter() - start)
        return {"error": "connection_error", "detail": f"Could not connect to '{tool.endpoint}'"}
    except httpx.HTTPError as exc:
        status_label = "http_error"
        await logger.aerror("gateway.http_error", tool_id=tool.id, error=str(exc))
        TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
        TOOL_INVOCATION_DURATION.labels(tool.id).observe(time.perf_counter() - start)
        return {"error": "http_error", "detail": str(exc)}

    # 4. Normalize response
    duration = time.perf_counter() - start
    await logger.ainfo("gateway.response", tool_id=tool.id, status=response.status_code, duration_s=round(duration, 3))

    if response.status_code >= 400:
        status_label = "downstream_error"
        TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
        TOOL_INVOCATION_DURATION.labels(tool.id).observe(duration)
        return {
            "error": "downstream_error",
            "status_code": response.status_code,
            "detail": response.text[:2000],
        }

    TOOL_INVOCATION_COUNT.labels(tool.id, status_label).inc()
    TOOL_INVOCATION_DURATION.labels(tool.id).observe(duration)

    try:
        data = response.json()
    except Exception:
        data = {"raw": response.text[:2000]}

    return {"result": data, "status_code": response.status_code}
