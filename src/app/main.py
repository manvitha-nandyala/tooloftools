from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import Route

from src.app.core.config import settings
from src.app.core.logging import setup_logging
from src.app.api.v1.auth import router as auth_router
from src.app.api.v1.categories import router as categories_router
from src.app.api.v1.mcp import router as mcp_router
from src.app.api.v1.metrics import router as metrics_router
from src.app.api.v1.tools import router as tools_router
from src.app.mcp.server import mcp_app
from src.app.middleware.metrics import MetricsMiddleware, metrics_endpoint
from src.app.middleware.request_id import RequestIDMiddleware
from src.app.middleware.logging import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Centralized Tool & Agent Platform with MCP server layer",
    lifespan=lifespan,
)

app.add_middleware(MetricsMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(tools_router)
app.include_router(categories_router)
app.include_router(mcp_router)
app.include_router(metrics_router)

# Mount MCP server at /mcp (SSE transport for AI agents)
app.mount("/mcp", mcp_app)

# Prometheus metrics endpoint
app.routes.append(Route("/metrics", metrics_endpoint))


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}
