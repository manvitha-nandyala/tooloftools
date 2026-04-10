from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import Route
from starlette.staticfiles import StaticFiles

from src.app.api.v1.auth import router as auth_router
from src.app.api.v1.categories import router as categories_router
from src.app.api.v1.mcp import router as mcp_router
from src.app.api.v1.metrics import router as metrics_router
from src.app.api.v1.tools import router as tools_router
from src.app.core.config import settings
from src.app.core.database import Base, engine
from src.app.core.logging import setup_logging
from src.app.mcp.server import mcp_app
from src.app.middleware.logging import LoggingMiddleware
from src.app.middleware.metrics import MetricsMiddleware, metrics_endpoint
from src.app.middleware.request_id import RequestIDMiddleware
from src.app.services.identity_bootstrap import bootstrap_admin_user


def _resolve_frontend_dist() -> Path | None:
    """Directory containing built Vite assets (`index.html`)."""
    if settings.frontend_dist:
        p = Path(settings.frontend_dist)
        if p.is_dir() and (p / "index.html").is_file():
            return p
        return None
    root = Path(__file__).resolve().parent.parent.parent
    dist = root / "frontend" / "dist"
    if dist.is_dir() and (dist / "index.html").is_file():
        return dist
    return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    if settings.auto_create_tables_on_startup:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await bootstrap_admin_user()
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


_spa_dist = _resolve_frontend_dist()
if _spa_dist is not None:
    # Last: serves `index.html` for client routes (BrowserRouter).
    app.mount("/", StaticFiles(directory=str(_spa_dist), html=True), name="spa")
