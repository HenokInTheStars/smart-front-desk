from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db

settings = get_settings()

app = FastAPI(title="Smart Front Desk API")

# Restrict CORS to the Next.js dev server only — the browser will block any
# other origin from calling this API, even though the API itself is reachable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    """
    Temporary verification endpoint for Day 2 only — proves get_db yields a
    working async session end-to-end. Safe to delete once Day 3's schema
    migration gives you a real table to query instead.
    """
    result = await db.execute(text("SELECT 1"))
    return {"db_reachable": result.scalar() == 1}
