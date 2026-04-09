"""Shared test fixtures using an async SQLite database for fast isolated testing."""

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.app.core.database import Base, get_db
from src.app.core.security import hash_password
from src.app.models.tool import Tool  # noqa: F401
from src.app.models.user import APIKey, AuthProvider, Role, User  # noqa: F401
from src.app.main import app


# Use aiosqlite for test isolation (no Postgres dependency in CI)
TEST_DATABASE_URL = "sqlite+aiosqlite:///file::memory:?cache=shared&uri=true"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _seed_user(
    username: str,
    password: str,
    role: str,
    team: str | None = None,
) -> None:
    async with test_session_factory() as session:
        session.add(
            User(
                id=str(uuid.uuid4()),
                username=username,
                hashed_password=hash_password(password),
                role=role,
                team=team,
                auth_provider=AuthProvider.PASSWORD.value,
            )
        )
        await session.commit()


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient) -> dict[str, str]:
    """Seed an admin user and return auth headers."""
    await _seed_user("admin", "admin123", Role.ADMIN.value, "platform")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def developer_headers(client: AsyncClient) -> dict[str, str]:
    """Seed a developer user and return auth headers."""
    await _seed_user("dev1", "dev123", Role.DEVELOPER.value, "scheduling")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "dev1", "password": "dev123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def consumer_headers(client: AsyncClient) -> dict[str, str]:
    """Seed a consumer user and return auth headers."""
    await _seed_user("consumer1", "cons123", Role.CONSUMER.value)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "consumer1", "password": "cons123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


SAMPLE_TOOL_PAYLOAD = {
    "id": "scheduling.create-meeting",
    "name": "Create Meeting",
    "description": "Schedule a meeting with attendees",
    "category": "scheduling",
    "version": "1.0.0",
    "tool_type": "REST_API",
    "endpoint": "https://api.example.com/meetings",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "attendees": {"type": "array", "items": {"type": "string"}},
            "start_time": {"type": "string", "format": "date-time"},
        },
        "required": ["title", "attendees", "start_time"],
    },
    "output_schema": {
        "type": "object",
        "properties": {
            "meeting_id": {"type": "string"},
        },
    },
    "tags": ["scheduling", "meetings"],
    "metadata": {"sla_ms": 500},
}
