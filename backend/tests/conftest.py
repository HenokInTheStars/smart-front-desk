import asyncio
import os
import sys
from urllib.parse import urlparse
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# 1. Resolve TEST_DATABASE_URL
test_db_url = os.environ.get("TEST_DATABASE_URL")
if not test_db_url:
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("TEST_DATABASE_URL="):
                    test_db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

if not test_db_url:
    test_db_url = "postgresql+asyncpg://frontdesk:frontdesk@localhost:5432/frontdesk_test"

# 2. Guard: Abort if configured database name does not end in '_test'
parsed = urlparse(test_db_url.replace("postgresql+asyncpg://", "http://"))
target_db_name = parsed.path.lstrip("/").split("?")[0]
if not target_db_name.endswith("_test"):
    pytest.exit(
        f"ABORTING TEST RUN: Configured test database '{target_db_name}' does not end in '_test'. "
        f"Tests must NEVER run against production or development databases!",
        returncode=1
    )

# 3. Direct all environment configurations to test_db_url
os.environ["DATABASE_URL"] = test_db_url
os.environ["DATABASE_URL_READONLY"] = test_db_url
os.environ["TEST_DATABASE_URL"] = test_db_url

from app.core.config import get_settings
get_settings.cache_clear()

# 4. Bind SQLAlchemy session and engine to the isolated test database
import app.db.session as session_module

test_engine = create_async_engine(test_db_url, echo=False, pool_pre_ping=True, future=True)
test_sessionmaker = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

session_module.engine = test_engine
session_module.AsyncSessionLocal = test_sessionmaker
session_module.readonly_engine = test_engine
session_module.AsyncReadonlySessionLocal = test_sessionmaker

# 5. Live DB Guard during pytest session initialization
def pytest_sessionstart(session):
    async def verify_live_database():
        async with test_sessionmaker() as db:
            connected_db = (await db.execute(text("SELECT current_database();"))).scalar()
            if not connected_db or not connected_db.endswith("_test"):
                pytest.exit(
                    f"CRITICAL SAFETY VIOLATION: Connected database '{connected_db}' does not end in '_test'. "
                    f"Aborting entire test suite immediately!",
                    returncode=1
                )
            print(f"\n[Test Guard] Confirmed live test database: {connected_db}")
        
        # Clean transient test tables to ensure deterministic test runs
        await db.execute(text("DELETE FROM audit_logs;"))
        await db.execute(text("DELETE FROM appointments;"))
        await db.execute(text("DELETE FROM visitors;"))
        await db.commit()
        
        # Seed default users and hosts on the isolated test database
        from app.db.seed_defaults import seed_all_default_users_and_hosts
        await seed_all_default_users_and_hosts()
        await test_engine.dispose()

    try:
        asyncio.run(verify_live_database())
    except Exception as e:
        pytest.exit(f"Failed to connect to isolated test database ({test_db_url}): {e}", returncode=1)


@pytest.fixture
def test_db_sessionmaker():
    return test_sessionmaker
