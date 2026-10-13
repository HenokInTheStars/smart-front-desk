from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.db.seed_defaults import seed_all_default_users_and_hosts
from app.routers import appointments, auth, employees, visitors, schedules, users, dashboard, live, analytics, assistant

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    current_settings = get_settings()
    # 1. Production bootstrap: create initial SUPER_ADMIN if environment variables are provided
    if current_settings.bootstrap_admin_email and current_settings.bootstrap_admin_password:
        try:
            from app.db.seed_defaults import bootstrap_initial_super_admin
            created = await bootstrap_initial_super_admin()
            if created:
                print(f"Bootstrap admin: successfully created SUPER_ADMIN ({current_settings.bootstrap_admin_email})")
        except Exception as e:
            print(f"Error during production superadmin bootstrap: {e}")
            raise e

    # 2. Development-only auto-seeding (must be explicitly enabled via SEED_DEFAULT_USERS=true)
    if current_settings.seed_default_users:
        try:
            await seed_all_default_users_and_hosts()
        except Exception as e:
            print(f"Warning: Could not auto-seed default users on startup: {e}")
    yield


import uuid
import os
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

app = FastAPI(title="Smart Front Desk API", lifespan=lifespan)
app.add_middleware(RequestIdMiddleware)

# Mount uploads directory
os.makedirs(os.path.join(os.getcwd(), "uploads"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Restrict CORS to the Next.js dev server only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://10.2.0.2:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://10.2.0.2:3001",
        settings.frontend_origin
    ],
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
app.include_router(schedules.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(live.router)
app.include_router(assistant.router)

from app.routers import settings as settings_router
app.include_router(settings_router.router)


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
