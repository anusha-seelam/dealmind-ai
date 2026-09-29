"""SQLAlchemy async database setup."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()

# Convert sqlite:/// → sqlite+aiosqlite:///
_url = settings.database_url
if _url.startswith("sqlite:///"):
    _url = _url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

engine = create_async_engine(_url, echo=False)

AsyncSessionLocal = sessionmaker(  # type: ignore[call-overload]
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
