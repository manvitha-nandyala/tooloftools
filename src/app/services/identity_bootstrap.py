"""Startup identity helpers: env-backed break-glass admin."""

import uuid

import structlog
from sqlalchemy import select

from src.app.core.config import settings
from src.app.core.database import async_session_factory
from src.app.core.security import hash_password
from src.app.models.user import AuthProvider, Role, User

logger = structlog.get_logger("identity_bootstrap")


async def bootstrap_admin_user() -> None:
    """Upsert admin user from BOOTSTRAP_ADMIN_* when enabled."""
    if not settings.bootstrap_admin_enabled:
        return
    username = (settings.bootstrap_admin_username or "").strip()
    password = settings.bootstrap_admin_password or ""
    if not username or not password:
        logger.warning("bootstrap_admin_enabled but username or password missing")
        return
    try:
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            hp = hash_password(password)
            if user:
                user.hashed_password = hp
                user.role = Role.ADMIN.value
                user.auth_provider = AuthProvider.PASSWORD.value
                user.active = True
                logger.info("bootstrap_admin_updated", username=username)
            else:
                session.add(
                    User(
                        id=str(uuid.uuid4()),
                        username=username,
                        hashed_password=hp,
                        role=Role.ADMIN.value,
                        auth_provider=AuthProvider.PASSWORD.value,
                    )
                )
                logger.info("bootstrap_admin_created", username=username)
            await session.commit()
    except Exception:
        logger.exception("bootstrap_admin_failed")
