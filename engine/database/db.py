from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlmodel import SQLModel
from engine.config.settings import settings

DATABASE_URL = f"sqlite+aiosqlite:///{settings.DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args={"check_same_thread": False}
)

async_session_factory = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        for col_def in [
            "ALTER TABLE devices ADD COLUMN manufacturer_model VARCHAR",
            "ALTER TABLE devices ADD COLUMN ping_count INTEGER DEFAULT 0",
            "ALTER TABLE devices ADD COLUMN last_ping_at DATETIME",
        ]:
            try:
                await conn.execute(text(col_def))
            except Exception:
                pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
