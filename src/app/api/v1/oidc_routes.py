"""OIDC authorization-code flow: login redirect and callback issuing app JWTs."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.config import settings
from src.app.core.database import get_db
from src.app.core.security import create_access_token
from src.app.models.user import AuthProvider, Role, User

logger = structlog.get_logger("oidc")

oidc_router = APIRouter()

_discovery_cache: dict[str, Any] | None = None
_discovery_issuer: str | None = None


async def _get_discovery() -> dict[str, Any]:
    global _discovery_cache, _discovery_issuer
    issuer = (settings.oidc_issuer or "").rstrip("/")
    if not issuer:
        raise HTTPException(status_code=500, detail="OIDC_ISSUER not configured")
    if _discovery_cache and _discovery_issuer == issuer:
        return _discovery_cache
    url = f"{issuer}/.well-known/openid-configuration"
    async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        _discovery_cache = r.json()
        _discovery_issuer = issuer
        return _discovery_cache


def _create_state() -> str:
    exp = datetime.now(UTC) + timedelta(minutes=10)
    return jwt.encode(
        {"purpose": "oidc", "exp": exp},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _verify_state(token: str | None) -> None:
    if not token:
        raise HTTPException(status_code=400, detail="Missing state")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=400, detail="Invalid state") from exc
    if payload.get("purpose") != "oidc":
        raise HTTPException(status_code=400, detail="Invalid state payload")


def _default_role() -> str:
    r = (settings.oidc_default_role or Role.CONSUMER.value).lower()
    if r in (Role.ADMIN.value, Role.DEVELOPER.value, Role.CONSUMER.value):
        return r
    return Role.CONSUMER.value


def _username_from_claims(sub: str, email: str | None, preferred: str | None) -> str:
    if preferred and re.match(r"^[a-zA-Z0-9_.-]{1,80}$", preferred):
        return preferred[:100]
    if email and "@" in email:
        local = email.split("@", 1)[0]
        safe = re.sub(r"[^a-zA-Z0-9_.-]", "_", local)[:80]
        if safe:
            return safe
    safe_sub = re.sub(r"[^a-zA-Z0-9_.-]", "_", sub)[:80]
    return safe_sub or f"user_{sub[:12]}"


async def _exchange_code(
    discovery: dict[str, Any],
    code: str,
) -> dict[str, Any]:
    token_url = discovery["token_endpoint"]
    redirect_uri = settings.oidc_redirect_uri or ""
    client_id = settings.oidc_client_id or ""
    client_secret = settings.oidc_client_secret or ""
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(token_url, data=data)
        if r.status_code >= 400:
            logger.warning("oidc_token_error", status=r.status_code, body=r.text[:500])
            raise HTTPException(status_code=400, detail="Token exchange failed")
        return r.json()


async def _fetch_userinfo(discovery: dict[str, Any], access_token: str) -> dict[str, Any]:
    ui = discovery.get("userinfo_endpoint")
    if not ui:
        raise HTTPException(status_code=500, detail="IdP missing userinfo_endpoint")
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(ui, headers={"Authorization": f"Bearer {access_token}"})
        r.raise_for_status()
        return r.json()


async def _ensure_unique_username(db: AsyncSession, base: str) -> str:
    candidate = base[:100]
    for i in range(0, 50):
        name = candidate if i == 0 else f"{candidate[:90]}_{i}"
        result = await db.execute(select(User).where(User.username == name))
        if result.scalar_one_or_none() is None:
            return name
    return f"{candidate[:40]}_{uuid.uuid4().hex[:8]}"


@oidc_router.get("/oidc/login")
async def oidc_login() -> RedirectResponse:
    if not settings.oidc_enabled:
        raise HTTPException(status_code=404, detail="OIDC disabled")
    if not settings.oidc_client_id or not settings.oidc_redirect_uri:
        raise HTTPException(status_code=500, detail="OIDC client not configured")
    discovery = await _get_discovery()
    auth_ep = discovery["authorization_endpoint"]
    state = _create_state()
    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
    }
    url = f"{auth_ep}?{urlencode(params)}"
    return RedirectResponse(url=url, status_code=302)


@oidc_router.get("/oidc/callback")
async def oidc_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not settings.oidc_enabled:
        raise HTTPException(status_code=404, detail="OIDC disabled")
    if error:
        logger.warning("oidc_idp_error", error=error, description=error_description)
        raise HTTPException(status_code=400, detail=error_description or error)
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    _verify_state(state)

    discovery = await _get_discovery()
    tokens = await _exchange_code(discovery, code)
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access_token from IdP")

    userinfo = await _fetch_userinfo(discovery, access_token)
    sub = userinfo.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="IdP userinfo missing sub")

    email = userinfo.get("email")
    preferred = userinfo.get("preferred_username")
    username_base = _username_from_claims(str(sub), email, preferred)

    result = await db.execute(select(User).where(User.external_sub == sub))
    user = result.scalar_one_or_none()
    role = _default_role()

    if user:
        if email and not user.email:
            user.email = email
        user.auth_provider = AuthProvider.OIDC.value
        await db.flush()
    else:
        username = await _ensure_unique_username(db, username_base)
        user = User(
            id=str(uuid.uuid4()),
            username=username,
            hashed_password=None,
            role=role,
            auth_provider=AuthProvider.OIDC.value,
            external_sub=sub,
            email=email,
        )
        db.add(user)
        await db.flush()

    app_token = create_access_token(subject=user.id, role=user.role)
    base = (settings.public_app_url or str(request.base_url)).rstrip("/")
    # Fragment avoids token in server access logs; SPA reads hash on /oidc-callback
    return RedirectResponse(url=f"{base}/oidc-callback#token={app_token}", status_code=302)
