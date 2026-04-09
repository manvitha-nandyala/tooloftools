import pytest
from httpx import AsyncClient

from tests.conftest import SAMPLE_TOOL_PAYLOAD


@pytest.mark.asyncio
async def test_create_tool_requires_auth(client: AsyncClient):
    resp = await client.post("/api/v1/tools", json=SAMPLE_TOOL_PAYLOAD)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_consumer_cannot_create_tool(client: AsyncClient, consumer_headers: dict):
    resp = await client.post("/api/v1/tools", json=SAMPLE_TOOL_PAYLOAD, headers=consumer_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_crud_lifecycle(client: AsyncClient, admin_headers: dict):
    # Create
    resp = await client.post("/api/v1/tools", json=SAMPLE_TOOL_PAYLOAD, headers=admin_headers)
    assert resp.status_code == 201
    tool = resp.json()
    assert tool["id"] == "scheduling.create-meeting"
    assert tool["active"] is True

    # Read
    resp = await client.get(f"/api/v1/tools/{tool['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Create Meeting"

    # Schema
    resp = await client.get(f"/api/v1/tools/{tool['id']}/schema")
    assert resp.status_code == 200
    schema = resp.json()
    assert "input_schema" in schema
    assert schema["input_schema"]["type"] == "object"

    # Update
    resp = await client.put(
        f"/api/v1/tools/{tool['id']}",
        json={"description": "Updated description"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"

    # Delete (soft)
    resp = await client.delete(f"/api/v1/tools/{tool['id']}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["active"] is False


@pytest.mark.asyncio
async def test_list_and_search(client: AsyncClient, admin_headers: dict):
    # Seed two tools
    tool1 = {**SAMPLE_TOOL_PAYLOAD, "id": "test.tool-a", "name": "Tool Alpha", "tags": ["alpha"]}
    tool2 = {
        **SAMPLE_TOOL_PAYLOAD,
        "id": "test.tool-b",
        "name": "Tool Beta",
        "category": "testing",
        "tags": ["beta"],
    }
    await client.post("/api/v1/tools", json=tool1, headers=admin_headers)
    await client.post("/api/v1/tools", json=tool2, headers=admin_headers)

    # List all
    resp = await client.get("/api/v1/tools")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2

    # Filter by category
    resp = await client.get("/api/v1/tools?category=testing")
    assert resp.status_code == 200
    assert all(t["category"] == "testing" for t in resp.json()["items"])

    # Search
    resp = await client.get("/api/v1/tools/search?query=Alpha")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


@pytest.mark.asyncio
async def test_duplicate_tool_rejected(client: AsyncClient, admin_headers: dict):
    tool = {**SAMPLE_TOOL_PAYLOAD, "id": "test.duplicate"}
    await client.post("/api/v1/tools", json=tool, headers=admin_headers)
    resp = await client.post("/api/v1/tools", json=tool, headers=admin_headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_invalid_schema_rejected(client: AsyncClient, admin_headers: dict):
    tool = {**SAMPLE_TOOL_PAYLOAD, "id": "test.bad-schema", "input_schema": {"type": "invalid"}}
    resp = await client.post("/api/v1/tools", json=tool, headers=admin_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_validate_endpoint(client: AsyncClient, admin_headers: dict):
    tool = {**SAMPLE_TOOL_PAYLOAD, "id": "test.validate-ep"}
    await client.post("/api/v1/tools", json=tool, headers=admin_headers)

    # Valid input
    resp = await client.post(
        "/api/v1/tools/test.validate-ep/validate",
        json={"title": "Standup", "attendees": ["a@b.com"], "start_time": "2026-01-01T10:00:00Z"},
    )
    assert resp.status_code == 200
    assert resp.json()["valid"] is True

    # Invalid input (missing required field)
    resp = await client.post("/api/v1/tools/test.validate-ep/validate", json={"title": "Standup"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_categories(client: AsyncClient, admin_headers: dict):
    tool = {**SAMPLE_TOOL_PAYLOAD, "id": "test.cat-tool", "category": "demo"}
    await client.post("/api/v1/tools", json=tool, headers=admin_headers)

    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert "demo" in resp.json()
