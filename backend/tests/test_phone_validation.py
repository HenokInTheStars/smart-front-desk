from unittest.mock import patch
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.models import Visitor

@pytest.fixture
def client_transport():
    return ASGITransport(app=app)

@pytest.mark.asyncio
@pytest.mark.parametrize("phone_input,expected_normalized", [
    ("+251912345678", "+251912345678"),
    ("+251712345678", "+251712345678"),
    ("0912345678", "+251912345678"),
    ("0712345678", "+251712345678"),
    ("912345678", "+251912345678"),
    ("712345678", "+251712345678"),
    ("251912345678", "+251912345678"),
])
async def test_valid_ethiopian_phones_accepted_and_normalized(client_transport, test_db_sessionmaker, phone_input, expected_normalized):
    with patch("app.routers.visitors.send_sms"):
        async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
            res = await ac.post("/visitors/checkin", json={
                "firstName": "Abebe",
                "lastName": "Bikila",
                "purpose": "Consultation",
                "phone": phone_input,
                "hostName": "Kirubel Gizaw"
            })
            assert res.status_code in (200, 201), res.text
            data = res.json()["data"]
            visitor_id = uuid.UUID(data["visitor_id"])

            async with test_db_sessionmaker() as db:
                v_res = await db.execute(select(Visitor).where(Visitor.id == visitor_id))
                visitor = v_res.scalar_one_or_none()
                assert visitor is not None
                assert visitor.phone == expected_normalized

@pytest.mark.asyncio
@pytest.mark.parametrize("invalid_phone", [
    "letters",
    "12345",
    "+1234567890",
    "+251812345678",
    "+251912345",      # too short
    "+25191234567899",  # too long
])
async def test_invalid_phones_rejected_by_checkin(client_transport, invalid_phone):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/visitors/checkin", json={
            "firstName": "Abebe",
            "lastName": "Bikila",
            "purpose": "Consultation",
            "phone": invalid_phone,
            "hostName": "Kirubel Gizaw"
        })
        assert res.status_code == 422, f"Expected 422 for phone '{invalid_phone}', got {res.status_code}"
