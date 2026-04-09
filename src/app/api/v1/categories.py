from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.database import get_db
from src.app.services.registry_service import RegistryService

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", response_model=list[str])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[str]:
    svc = RegistryService(db)
    return await svc.get_categories()
