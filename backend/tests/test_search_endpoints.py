import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
def client_transport():
    return ASGITransport(app=app)

async def get_superadmin_headers(ac: AsyncClient) -> dict:
    login_res = await ac.post("/auth/login", json={
        "email": "superadmin@example.com",
        "password": "secret"
    })
    token = login_res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_search_employees(client_transport, test_db_sessionmaker):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        headers = await get_superadmin_headers(ac)

        # 1. List without search
        res = await ac.get("/employees", headers=headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) > 0
        first_name = data[0]["full_name"]
        query_term = first_name.split()[0].lower()

        # 2. Search by matching term
        res_search = await ac.get(f"/employees?search={query_term}", headers=headers)
        assert res_search.status_code == 200
        search_data = res_search.json()["data"]
        assert len(search_data) > 0
        assert any(query_term in emp["full_name"].lower() for emp in search_data)

        # 3. Search non-existent term
        res_empty = await ac.get("/employees?search=xyz_completely_nonexistent_staff_query", headers=headers)
        assert res_empty.status_code == 200
        assert len(res_empty.json()["data"]) == 0


@pytest.mark.asyncio
async def test_search_users(client_transport, test_db_sessionmaker):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        headers = await get_superadmin_headers(ac)

        # 1. Search for superadmin
        res = await ac.get("/users?search=superadmin", headers=headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 1
        assert any("superadmin" in u["email"].lower() for u in data)

        # 2. Search non-existent
        res_empty = await ac.get("/users?search=nonexistent_user_email_12345", headers=headers)
        assert res_empty.status_code == 200
        assert len(res_empty.json()["data"]) == 0


@pytest.mark.asyncio
async def test_search_appointments(client_transport, test_db_sessionmaker):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        headers = await get_superadmin_headers(ac)

        # 1. List appointments without search
        res = await ac.get("/appointments", headers=headers)
        assert res.status_code == 200

        # 2. Search for non-existent appointment
        res_empty = await ac.get("/appointments?search=nonexistent_guest_notes_xyz", headers=headers)
        assert res_empty.status_code == 200
        assert len(res_empty.json()["data"]) == 0
