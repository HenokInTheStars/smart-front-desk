import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.db.seed_defaults import seed_all_default_users_and_hosts
from app.data.employee_directory import EMPLOYEE_DIRECTORY


@pytest_asyncio.fixture(scope="module", autouse=True)
async def seed_db_once():
    """Ensure all default users and employees are present in DB once for the test module."""
    try:
        await seed_all_default_users_and_hosts()
    except Exception:
        pass


@pytest.fixture
def client_transport():
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_superadmin_login_success(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/auth/login", json={
            "email": "superadmin@example.com",
            "password": "secret"
        })
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Verify /auth/me with the token
        token = data["access_token"]
        me_res = await ac.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        me_data = me_res.json()["data"]
        assert me_data["email"] == "superadmin@example.com"
        assert me_data["role"] == "SUPER_ADMIN"
        assert "manage_users" in me_data["permissions"]
        assert "system_logs" in me_data["permissions"]


@pytest.mark.asyncio
async def test_admin_and_reception_login_success(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        # Admin
        admin_res = await ac.post("/auth/login", json={
            "email": "admin@example.com",
            "password": "secret"
        })
        assert admin_res.status_code == 200, admin_res.text
        admin_token = admin_res.json()["data"]["access_token"]

        admin_me = await ac.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_me.status_code == 200
        assert admin_me.json()["data"]["role"] == "ADMIN"

        # Reception
        rec_res = await ac.post("/auth/login", json={
            "email": "reception@example.com",
            "password": "secret"
        })
        assert rec_res.status_code == 200, rec_res.text
        rec_token = rec_res.json()["data"]["access_token"]

        rec_me = await ac.get("/auth/me", headers={"Authorization": f"Bearer {rec_token}"})
        assert rec_me.status_code == 200
        rec_data = rec_me.json()["data"]
        assert rec_data["role"] == "RECEPTION"
        assert "view_queue" in rec_data["permissions"]
        assert "print_badge" in rec_data["permissions"]


@pytest.mark.asyncio
async def test_all_10_host_employees_login(client_transport):
    """Verifies each host employee can login, obtain a token, and inspect their profile."""
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        for emp in EMPLOYEE_DIRECTORY:
            slug = emp["name"].lower().replace(" ", ".")
            email = f"{slug}@example.com"

            res = await ac.post("/auth/login", json={
                "email": email,
                "password": "secret"
            })
            assert res.status_code == 200, f"Failed login for {email}: {res.text}"
            token = res.json()["data"]["access_token"]

            me_res = await ac.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_res.status_code == 200, f"Failed /auth/me for {email}: {me_res.text}"
            me_data = me_res.json()["data"]
            assert me_data["email"] == email
            assert me_data["role"] == "HOST"
            assert me_data["full_name"] == emp["name"]
            assert emp["department"] in me_data["department"]
            assert me_data["numeric_host_id"] is not None


@pytest.mark.asyncio
async def test_login_invalid_password(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/auth/login", json={
            "email": "superadmin@example.com",
            "password": "wrongpassword123"
        })
        assert res.status_code == 401
        assert res.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/auth/login", json={
            "email": "ghost.user@example.com",
            "password": "secret"
        })
        assert res.status_code == 401
        assert res.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_deactivated_user_login_rejection(client_transport):
    """Deactivating a user causes 403 Forbidden with explicit guidance message."""
    test_email = "security@example.com"
    async with AsyncSessionLocal() as session:
        u = (await session.execute(select(User).where(User.email == test_email))).scalar_one_or_none()
        if u:
            u.is_active = False
            await session.commit()

    try:
        async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
            res = await ac.post("/auth/login", json={
                "email": test_email,
                "password": "secret"
            })
            assert res.status_code == 403
            assert "deactivated" in res.json()["detail"].lower()
    finally:
        # Restore user active status
        async with AsyncSessionLocal() as session:
            u = (await session.execute(select(User).where(User.email == test_email))).scalar_one_or_none()
            if u:
                u.is_active = True
                await session.commit()


@pytest.mark.asyncio
async def test_auth_me_unauthorized_without_token(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.get("/auth/me")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_invalid_token(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.get("/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_rbac_access_control_with_role_tokens(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        # Get reception token
        rec_res = await ac.post("/auth/login", json={
            "email": "reception@example.com",
            "password": "secret"
        })
        rec_token = rec_res.json()["data"]["access_token"]

        # Reception attempting Super Admin only endpoint -> 403 Forbidden
        rbac_res = await ac.get(
            "/users/roles/catalog",
            headers={"Authorization": f"Bearer {rec_token}"}
        )
        assert rbac_res.status_code == 403

        # Super Admin attempting Super Admin endpoint -> 200 OK
        sa_res = await ac.post("/auth/login", json={
            "email": "superadmin@example.com",
            "password": "secret"
        })
        sa_token = sa_res.json()["data"]["access_token"]

        sa_rbac_res = await ac.get(
            "/users/roles/catalog",
            headers={"Authorization": f"Bearer {sa_token}"}
        )
        assert sa_rbac_res.status_code == 200
