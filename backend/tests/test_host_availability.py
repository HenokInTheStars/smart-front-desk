import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import AsyncSessionLocal
from app.db.models import Employee, HostHoliday
from app.db.seed_defaults import seed_all_default_users_and_hosts
from sqlalchemy import select, delete


@pytest_asyncio.fixture(scope="module", autouse=True)
async def seed_db_once():
    try:
        await seed_all_default_users_and_hosts()
    except Exception:
        pass


@pytest.fixture
def client_transport():
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_host_availability_on_shift_during_business_hours(client_transport):
    """Test Wednesday 11:00 AM -> Host is on shift and available."""
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/schedules/evaluate-host-availability", json={
            "purpose": "Technical Consultation",
            "notes": "Need assistance designing AWS Kubernetes clusters and Terraform infrastructure",
            "target_time": "2026-09-09T11:00:00"  # Wednesday 11:00 AM
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["is_available"] is True
        assert data["host_name"] == "Kirubel Gizaw"
        assert "Engineering" in data["host_department"]
        assert data["reason"] is None
        assert data["nearest_slot"] is None


@pytest.mark.asyncio
async def test_host_availability_evening_suggests_next_morning(client_transport):
    """Test Wednesday 20:00 (8:00 PM) -> Off-shift, suggests Thursday morning 9:00 AM."""
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/schedules/evaluate-host-availability", json={
            "purpose": "Backend Integration",
            "notes": "Discussing Go microservices and PostgreSQL caching",
            "target_time": "2026-09-09T20:00:00"  # Wednesday 8:00 PM
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["is_available"] is False
        assert data["host_name"] == "Kirubel Gizaw"
        assert data["reason"] is not None
        assert data["nearest_slot"] is not None
        
        slot = data["nearest_slot"]
        assert slot["date"] == "2026-09-10"  # Thursday
        assert slot["time"] == "09:00"
        assert "9:00 AM" in slot["display_time"]
        assert "Tomorrow" in slot["display_day"] or "Thursday" in slot["display_day"]


@pytest.mark.asyncio
async def test_host_availability_friday_night_suggests_monday_morning(client_transport):
    """Test Friday 21:00 (9:00 PM) -> Off-shift, skips Saturday & Sunday, suggests Monday morning 9:00 AM."""
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/schedules/evaluate-host-availability", json={
            "purpose": "AI Partnership",
            "notes": "Discussing PyTorch LLM transformers on GPU clusters",
            "target_time": "2026-09-11T21:00:00"  # Friday 9:00 PM
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["is_available"] is False
        assert data["host_name"] == "Semir Sultan"
        
        slot = data["nearest_slot"]
        assert slot["date"] == "2026-09-14"  # Following Monday
        assert slot["time"] == "09:00"
        assert "Monday" in slot["display_day"]


@pytest.mark.asyncio
async def test_host_availability_skips_holiday(client_transport):
    """If Monday is a holiday, suggests Tuesday 9:00 AM instead."""
    # Add a holiday for Semir Sultan on 2026-09-14
    async with AsyncSessionLocal() as session:
        emp_res = await session.execute(select(Employee).where(Employee.full_name == "Semir Sultan"))
        emp = emp_res.scalar_one_or_none()
        assert emp is not None

        holiday = HostHoliday(employee_id=emp.id, date="2026-09-14", reason="National Holiday")
        session.add(holiday)
        await session.commit()

    try:
        async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
            res = await ac.post("/schedules/evaluate-host-availability", json={
                "purpose": "AI Partnership",
                "notes": "Discussing PyTorch LLM transformers on GPU clusters",
                "target_time": "2026-09-11T21:00:00"  # Friday 9:00 PM
            })
            assert res.status_code == 200
            data = res.json()
            slot = data["nearest_slot"]
            assert slot["date"] == "2026-09-15"  # Skips Mon 14 -> Suggests Tue 15
            assert "Tuesday" in slot["display_day"]
    finally:
        # Cleanup holiday
        async with AsyncSessionLocal() as session:
            await session.execute(delete(HostHoliday).where(HostHoliday.date == "2026-09-14"))
            await session.commit()


@pytest.mark.asyncio
async def test_schedule_suggested_slot_appointment(client_transport):
    """Test direct booking of suggested slot from kiosk."""
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        res = await ac.post("/visitors/schedule-slot", json={
            "firstName": "Dawit",
            "lastName": "Tadesse",
            "email": "dawit.tadesse@example.com",
            "phone": "+251911223344",
            "purpose": "Technical Consultation",
            "notes": "Meeting with Cloud team",
            "host_name": "Kirubel Gizaw",
            "scheduled_time": "2026-09-10T09:00:00"
        })
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["status"] == "Expected"
        assert data["host_name"] == "Kirubel Gizaw"
        assert data["visitor_name"] == "Dawit Tadesse"
        assert data["appointment_id"] is not None
