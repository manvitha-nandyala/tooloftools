from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.config import settings
from src.app.models.tool import Tool
from src.app.schemas.tool import ToolCreate, ToolUpdate


def _tags_filter(tags: list[str]):
    """Portable tag filtering: check if any of the given tags appear in the JSON array column."""
    return or_(*(cast(Tool.tags, String).contains(tag) for tag in tags))


class RegistryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_tool(self, payload: ToolCreate) -> Tool:
        tool = Tool(
            id=payload.id,
            name=payload.name,
            description=payload.description,
            category=payload.category,
            version=payload.version,
            tool_type=payload.tool_type,
            input_schema=payload.input_schema,
            output_schema=payload.output_schema,
            metadata_=payload.metadata_,
            endpoint=payload.endpoint,
            tags=payload.tags,
            owner=payload.owner,
            documentation_url=payload.documentation_url,
            auth_config=payload.auth_config,
            rate_limit=payload.rate_limit,
        )
        self.db.add(tool)
        await self.db.flush()
        await self.db.refresh(tool)
        return tool

    async def get_tool(self, tool_id: str) -> Tool | None:
        result = await self.db.execute(select(Tool).where(Tool.id == tool_id))
        return result.scalar_one_or_none()

    async def list_tools(
        self,
        page: int = 1,
        size: int | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
        active_only: bool = True,
    ) -> tuple[list[Tool], int]:
        size = min(size or settings.default_page_size, settings.max_page_size)
        query = select(Tool)
        count_query = select(func.count(Tool.id))

        if active_only:
            query = query.where(Tool.active.is_(True))
            count_query = count_query.where(Tool.active.is_(True))
        if category:
            query = query.where(Tool.category == category)
            count_query = count_query.where(Tool.category == category)
        if tags:
            tag_cond = _tags_filter(tags)
            query = query.where(tag_cond)
            count_query = count_query.where(tag_cond)

        total = (await self.db.execute(count_query)).scalar() or 0
        offset = (page - 1) * size
        query = query.order_by(Tool.name).offset(offset).limit(size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def search_tools(
        self,
        query_str: str,
        category: str | None = None,
        tags: list[str] | None = None,
        page: int = 1,
        size: int | None = None,
    ) -> tuple[list[Tool], int]:
        size = min(size or settings.default_page_size, settings.max_page_size)
        like_pattern = f"%{query_str}%"
        query = select(Tool).where(
            Tool.active.is_(True),
            (Tool.name.ilike(like_pattern) | Tool.description.ilike(like_pattern)),
        )
        count_query = select(func.count(Tool.id)).where(
            Tool.active.is_(True),
            (Tool.name.ilike(like_pattern) | Tool.description.ilike(like_pattern)),
        )
        if category:
            query = query.where(Tool.category == category)
            count_query = count_query.where(Tool.category == category)
        if tags:
            tag_cond = _tags_filter(tags)
            query = query.where(tag_cond)
            count_query = count_query.where(tag_cond)

        total = (await self.db.execute(count_query)).scalar() or 0
        offset = (page - 1) * size
        query = query.order_by(Tool.name).offset(offset).limit(size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def update_tool(self, tool_id: str, payload: ToolUpdate) -> Tool | None:
        tool = await self.get_tool(tool_id)
        if not tool:
            return None
        update_data = payload.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(tool, field, value)
        await self.db.flush()
        await self.db.refresh(tool)
        return tool

    async def deactivate_tool(self, tool_id: str) -> Tool | None:
        tool = await self.get_tool(tool_id)
        if not tool:
            return None
        tool.active = False
        await self.db.flush()
        await self.db.refresh(tool)
        return tool

    async def get_categories(self) -> list[str]:
        result = await self.db.execute(
            select(Tool.category)
            .where(Tool.active.is_(True), Tool.category.isnot(None))
            .distinct()
            .order_by(Tool.category)
        )
        return [row[0] for row in result.all()]
