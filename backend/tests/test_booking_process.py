import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import AsyncSessionLocal
from app.db.models import Employee, HostHoliday, Appointment, Visitor
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
async def test_end_to_end_on_shift_immediate_checkin(client_transport):
    """
    Simulates a visitor arriving at the Kiosk during normal shift hours:
    1. Evaluates host availability (e.g., Wednesday 10:30 AM).
    2. Confirms host is available and completes instant check-in.
    3. Host logs in and sees visitor in their active queue.
    4. Host admits visitor into meeting, then marks visit completed.
    """
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        # Step 1: Kiosk checks host availability
        eval_res = await ac.post("/schedules/evaluate-host-availability", json={
            "purpose": "Technical Consultation",
            "notes": "Need assistance designing AWS Kubernetes clusters with Terraform",
            "target_time": "2026-09-09T10:30:00"  # Wednesday 10:30 AM
        })
        assert eval_res.status_code == 200, eval_res.text
        eval_data = eval_res.json()
        assert eval_data["is_available"] is True
        assert eval_data["host_name"] == "Kirubel Gizaw"

        # Step 2: Kiosk completes check-in
        checkin_res = await ac.post("/visitors/checkin", json={
            "firstName": "Almaz",
            "lastName": "Kebede",
            "email": "almaz.kebede@company.com",
            "phone": "+251911998877",
            "purpose": "Technical Consultation",
            "notes": "Discussing AWS infrastructure with Kirubel Gizaw",
            "hostName": eval_data["host_name"]
        })
        assert checkin_res.status_code == 201, checkin_res.text
        envelope = checkin_res.json()
        checkin_data = envelope["data"]
        assert checkin_data["assigned_host"] == "Kirubel Gizaw"
        visitor_id = checkin_data["visitor_id"]

        # Step 3: Host logs in and inspects their active appointments
        login_res = await ac.post("/auth/login", json={
            "email": "kirubel.gizaw@example.com",
            "password": "secret"
        })
        assert login_res.status_code == 200
        host_token = login_res.json()["data"]["access_token"]

        apts_res = await ac.get("/appointments", headers={"Authorization": f"Bearer {host_token}"})
        assert apts_res.status_code == 200
        apts = apts_res.json()["data"]
        
        # Find the appointment for Almaz Kebede
        my_apt = next((a for a in apts if a.get("visitor", {}).get("id") == visitor_id), None)
        assert my_apt is not None, "Appointment not found in host list"
        assert my_apt["status"] == "CHECKED_IN"
        apt_id = my_apt["id"]

        # Step 4: Host admits visitor to meeting
        admit_res = await ac.patch(
            f"/appointments/{apt_id}",
            json={"status": "IN_MEETING"},
            headers={"Authorization": f"Bearer {host_token}"}
        )
        assert admit_res.status_code == 200
        assert admit_res.json()["data"]["status"] == "IN_MEETING"

        # Step 5: Host completes meeting
        complete_res = await ac.patch(
            f"/appointments/{apt_id}",
            json={"status": "COMPLETED"},
            headers={"Authorization": f"Bearer {host_token}"}
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["data"]["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_end_to_end_off_shift_nearest_slot_booking(client_transport):
    """
    Simulates a visitor arriving when host is off-shift (e.g., Friday 21:30 PM):
    1. Evaluates host availability -> returns is_available=False with suggested Monday 9:00 AM slot.
    2. Visitor books the suggested slot via /visitors/schedule-slot.
    3. Host logs in and sees the future reservation in their upcoming reservations feed.
    """
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        # Step 1: Kiosk evaluates off-shift host
        eval_res = await ac.post("/schedules/evaluate-host-availability", json={
            "purpose": "Backend Integration",
            "notes": "Discussing Go REST APIs and PostgreSQL database caching",
            "target_time": "2026-09-11T21:30:00"  # Friday 9:30 PM
        })
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert eval_data["is_available"] is False
        assert eval_data["host_name"] == "Kirubel Gizaw"
        assert eval_data["nearest_slot"] is not None
        
        nearest = eval_data["nearest_slot"]
        suggested_iso = nearest["iso_timestamp"]
        assert "2026-09-14" in suggested_iso  # Rolled over weekend to Monday

        # Step 2: Visitor pre-books the suggested slot
        book_res = await ac.post("/visitors/schedule-slot", json={
            "firstName": "Tewodros",
            "lastName": "Kassahun",
            "email": "tewodros.kassahun@tech.et",
            "phone": "+251922334455",
            "purpose": "Backend Integration",
            "notes": "Pre-booked Kiosk Slot with Kirubel Gizaw",
            "host_name": eval_data["host_name"],
            "scheduled_time": suggested_iso
        })
        assert book_res.status_code == 201, book_res.text
        envelope = book_res.json()
        book_data = envelope["data"]
        assert book_data["status"] == "EXPECTED"
        assert book_data["host_name"] == "Kirubel Gizaw"
        assert book_data["visitor_name"] == "Tewodros Kassahun"
        apt_id = book_data["appointment_id"]

        # Step 3: Host logs in and verifies future reservation
        login_res = await ac.post("/auth/login", json={
            "email": "kirubel.gizaw@example.com",
            "password": "secret"
        })
        assert login_res.status_code == 200
        host_token = login_res.json()["data"]["access_token"]

        apts_res = await ac.get("/appointments", headers={"Authorization": f"Bearer {host_token}"})
        assert apts_res.status_code == 200
        apts = apts_res.json()["data"]

        booked_apt = next((a for a in apts if a["id"] == apt_id), None)
        assert booked_apt is not None, "Booked reservation not found in host appointments"
        assert booked_apt["status"] == "EXPECTED"
        assert booked_apt["visitor"]["full_name"] == "Tewodros Kassahun"


@pytest.mark.asyncio
async def test_host_portal_direct_preregistration_booking(client_transport):
    """
    Tests host directly creating a future pre-registered appointment from their Host Station:
    1. Host books appointment for a guest next week.
    2. Verifies appointment is created with 'Expected' status and linked to host.
    """
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        login_res = await ac.post("/auth/login", json={
            "email": "sosina.getachew@example.com",
            "password": "secret"
        })
        assert login_res.status_code == 200
        host_token = login_res.json()["data"]["access_token"]

        me_res = await ac.get("/auth/me", headers={"Authorization": f"Bearer {host_token}"})
        assert me_res.status_code == 200
        host_profile = me_res.json()["data"]

        # Host creates pre-registration
        reg_res = await ac.post("/visitors/schedule-slot", json={
            "firstName": "Bethlehem",
            "lastName": "Tilahun",
            "email": "candidate.bethlehem@careers.et",
            "phone": "+251933445566",
            "purpose": "Senior Engineer Interview",
            "notes": "Candidate Technical Interview with HR",
            "host_id": host_profile["numeric_host_id"],
            "host_name": host_profile["full_name"],
            "scheduled_time": "2026-09-15T14:00:00"
        })
        assert reg_res.status_code == 201, reg_res.text
        envelope = reg_res.json()
        data = envelope["data"]
        assert data["status"] == "EXPECTED"
        assert data["host_name"] == "Sosina Getachew"
        assert data["visitor_name"] == "Bethlehem Tilahun"
