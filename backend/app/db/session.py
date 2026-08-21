from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# echo=True is useful while developing (logs every SQL statement) — turn off
# before the Friday demo, it gets noisy fast.
engine = create_async_engine(settings.database_url, echo=False, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: yields one AsyncSession per request, and closes it
    afterward regardless of whether the request succeeded or raised.
    Usage: `db: AsyncSession = Depends(get_db)` in a route signature.
    """
    async with AsyncSessionLocal() as session:
        yield session
