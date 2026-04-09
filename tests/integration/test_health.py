import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_healthcheck(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_openapi_docs(client: AsyncClient):
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    assert "paths" in resp.json()
