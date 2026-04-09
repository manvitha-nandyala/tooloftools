from fastapi import APIRouter

from src.app.middleware.metrics import REQUEST_COUNT, TOOL_INVOCATION_COUNT

router = APIRouter(prefix="/api/v1/metrics", tags=["metrics"])


@router.get("/summary")
async def get_metrics_summary() -> dict:
    requests_total = 0.0
    tool_invocations_total = 0.0
    tool_errors_total = 0.0
    per_tool: dict[str, dict[str, float]] = {}

    for metric in REQUEST_COUNT.collect():
        for sample in metric.samples:
            if sample.name == "http_requests_total":
                requests_total += sample.value

    for metric in TOOL_INVOCATION_COUNT.collect():
        for sample in metric.samples:
            if sample.name != "tool_invocations_total":
                continue
            tool_id = str(sample.labels.get("tool_id", "unknown"))
            status = str(sample.labels.get("status", "success"))
            value = float(sample.value)
            tool_invocations_total += value
            if tool_id not in per_tool:
                per_tool[tool_id] = {"count": 0.0, "errors": 0.0}
            per_tool[tool_id]["count"] += value
            if "error" in status or status in {"timeout", "validation_error", "connection_error"}:
                per_tool[tool_id]["errors"] += value
                tool_errors_total += value

    return {
        "requests_total": int(requests_total),
        "tool_invocations_total": int(tool_invocations_total),
        "tool_errors_total": int(tool_errors_total),
        "per_tool": [
            {"tool_id": k, "count": int(v["count"]), "errors": int(v["errors"])}
            for k, v in sorted(per_tool.items())
        ],
    }

