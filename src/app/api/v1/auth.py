import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.deps import get_current_user, require_role
from src.app.api.v1.oidc_routes import oidc_router as oidc_auth_router
from src.app.core.config import settings
from src.app.core.database import get_db
from src.app.core.security import (
    create_access_token,
    generate_api_key,
    hash_password,
    verify_password,
)
from src.app.models.user import APIKey, AuthProvider, Role, User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
router.include_router(oidc_auth_router)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    username: str
    password: str
    team: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class APIKeyResponse(BaseModel):
    key: str
    name: str


class APIKeyListItem(BaseModel):
    key: str
    name: str
    active: bool
    user_id: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    team: str | None
    email: str | None = None
    auth_provider: str = "password"

    model_config = {"from_attributes": True}


class PublicAuthConfigResponse(BaseModel):
    register_allowed: bool
    password_login_enabled: bool
    oidc_enabled: bool


class UpdateRoleRequest(BaseModel):
    role: Role


@router.get("/public-config", response_model=PublicAuthConfigResponse)
async def public_auth_config() -> PublicAuthConfigResponse:
    """Unauthenticated: feature flags for login/register UI."""
    return PublicAuthConfigResponse(
        register_allowed=settings.register_allowed,
        password_login_enabled=settings.password_login_enabled,
        oidc_enabled=settings.oidc_enabled,
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> UserResponse:
    if not settings.register_allowed:
        raise HTTPException(status_code=403, detail="Registration is disabled")
    existing = await db.execute(select(User).where(User.username == payload.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(
        id=str(uuid.uuid4()),
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=Role.CONSUMER.value,
        team=payload.team,
        auth_provider=AuthProvider.PASSWORD.value,
    )
    db.add(user)
    await db.flush()
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    if not settings.password_login_enabled:
        raise HTTPException(status_code=403, detail="Password login is disabled; use SSO")
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.hashed_password is None:
        raise HTTPException(
            status_code=401,
            detail="This account uses SSO; sign in with your organization",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=user.id, role=user.role)
    return TokenResponse(access_token=token)


@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    name: str = "default",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> APIKeyResponse:
    key = generate_api_key()
    api_key = APIKey(key=key, user_id=user.id, name=name)
    db.add(api_key)
    await db.flush()
    return APIKeyResponse(key=key, name=name)


@router.get("/api-keys", response_model=list[APIKeyListItem])
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[APIKeyListItem]:
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user.id).order_by(APIKey.created_at.desc())
    )
    return [APIKeyListItem.model_validate(key) for key in result.scalars().all()]


@router.delete("/api-keys/{key}")
async def revoke_api_key(
    key: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    result = await db.execute(select(APIKey).where(APIKey.key == key, APIKey.user_id == user.id))
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.active = False
    await db.flush()
    return {"revoked": True}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    _admin: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    result = await db.execute(select(User).order_by(User.username))
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    _admin: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role.value
    await db.flush()
    return UserResponse.model_validate(user)
