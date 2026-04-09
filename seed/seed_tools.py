"""Seed script: load sample tools from sample_tools.json into the database."""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from src.app.core.database import async_session_factory, engine, Base
from src.app.models.tool import Tool
from src.app.models.user import User, APIKey  # noqa: F401 – register metadata


SEED_FILE = Path(__file__).parent / "sample_tools.json"


async def seed() -> None:
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with open(SEED_FILE) as f:
        tools_data = json.load(f)

    async with async_session_factory() as session:
        for entry in tools_data:
            existing = await session.execute(select(Tool).where(Tool.id == entry["id"]))
            if existing.scalar_one_or_none():
                print(f"  skip (exists): {entry['id']}")
                continue

            tool = Tool(
                id=entry["id"],
                name=entry["name"],
                description=entry.get("description"),
                category=entry.get("category"),
                version=entry["version"],
                tool_type=entry["tool_type"],
                input_schema=entry["input_schema"],
                output_schema=entry.get("output_schema"),
                metadata_=entry.get("metadata"),
                endpoint=entry.get("endpoint"),
                tags=entry.get("tags"),
                owner=entry.get("owner"),
                documentation_url=entry.get("documentation_url"),
                auth_config=entry.get("auth_config"),
                rate_limit=entry.get("rate_limit"),
            )
            session.add(tool)
            print(f"  added: {entry['id']}")

        await session.commit()
    print(f"\nSeeded {len(tools_data)} tools.")


if __name__ == "__main__":
    asyncio.run(seed())
