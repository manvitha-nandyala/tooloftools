from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.database import get_db
from src.app.core.security import decode_access_token
from src.app.models.user import APIKey, Role, User

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def _resolve_user(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == user_id, User.active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    api_key: str | None = Security(api_key_header),
) -> User:
    # Try API key first
    if api_key:
        result = await db.execute(
            select(APIKey).where(APIKey.key == api_key, APIKey.active.is_(True))
        )
        key_obj = result.scalar_one_or_none()
        if not key_obj:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return await _resolve_user(db, key_obj.user_id)

    # Try JWT bearer
    if credentials:
        try:
            payload = decode_access_token(credentials.credentials)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return await _resolve_user(db, user_id)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authentication credentials",
    )


def require_role(*allowed_roles: Role):
    """Dependency factory that enforces one or more roles."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _check
