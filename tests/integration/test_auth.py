import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "testpass"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "testuser"
    assert data["role"] == "consumer"

    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpass"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_register_always_consumer_even_if_role_admin_requested(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "escalator", "password": "pass", "role": "admin"},
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "consumer"


@pytest.mark.asyncio
async def test_public_config(client: AsyncClient):
    resp = await client.get("/api/v1/auth/public-config")
    assert resp.status_code == 200
    data = resp.json()
    assert "register_allowed" in data
    assert "password_login_enabled" in data
    assert "oidc_enabled" in data


@pytest.mark.asyncio
async def test_duplicate_registration(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "password": "pass1"},
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "password": "pass2"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "nonexistent", "password": "nope"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient, admin_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_api_key_flow(client: AsyncClient, admin_headers: dict):
    resp = await client.post("/api/v1/auth/api-keys?name=test-key", headers=admin_headers)
    assert resp.status_code == 200
    api_key = resp.json()["key"]
    assert api_key.startswith("tot_")

    resp = await client.get("/api/v1/auth/me", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
