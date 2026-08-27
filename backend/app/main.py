from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.routers import appointments, auth, employees, visitors

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

# Sprint 2's contract, drafted Day 4. Handlers are stubs (HTTP 501) until
# Sprint 2 implements them against the DB — the point right now is the
# request/response shapes visible at /docs, for the Thursday contract review.
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(visitors.router)
app.include_router(appointments.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    """
    Temporary verification endpoint from Day 2 — proves get_db yields a
    working async session end-to-end. Safe to delete once Sprint 2 gives
    you a real endpoint to test against instead.
    """
    result = await db.execute(text("SELECT 1"))
    return {"db_reachable": result.scalar() == 1}
