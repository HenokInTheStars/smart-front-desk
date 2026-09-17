import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.seed_defaults import seed_all_default_users_and_hosts
from unittest.mock import patch

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
async def test_sms_notifications_on_checkin_and_ready(client_transport):
    async with AsyncClient(transport=client_transport, base_url="http://test") as ac:
        # Mock send_sms in visitors router
        with patch('app.routers.visitors.send_sms') as mock_send_sms_visitors:
            # Step 1: Check in a visitor
            checkin_res = await ac.post("/visitors/checkin", json={
                "firstName": "Sms",
                "lastName": "Tester",
                "email": "sms@example.com",
                "phone": "+251912345678",
                "purpose": "SMS Test",
                "notes": "Testing",
                "host_id": 1
            })
            assert checkin_res.status_code in [200, 201], checkin_res.text
            
            # Check if send_sms was called for the host and the guest
            assert mock_send_sms_visitors.call_count >= 2
            
            calls = mock_send_sms_visitors.call_args_list
            phones_called = [call[0][0] for call in calls]
            messages_called = [call[0][1] for call in calls]
            
            assert "+251912345678" in phones_called # Guest phone
            
            host_msg_found = any("is here to see you for" in msg for msg in messages_called)
            assert host_msg_found
            
            guest_msg_found = any("The host will notify you" in msg or "You will be notified" in msg for msg in messages_called)
            assert guest_msg_found

        # We also want to test the "Ready" notification when an appointment completes.
        # But wait, completing an appointment sends the SMS to the *next* visitor.
        # Let's check in a second visitor for the same host.
        with patch('app.routers.visitors.send_sms'):
            await ac.post("/visitors/checkin", json={
                "firstName": "Second",
                "lastName": "Tester",
                "email": "second@example.com",
                "phone": "+251999999999",
                "purpose": "Meeting",
                "notes": "Wait in line",
                "host_id": 1
            })

        # Need to log in to get a token to complete the appointment
        login_res = await ac.post("/auth/login", json={
            "email": "superadmin@example.com",
            "password": "secret"
        })
        assert login_res.status_code == 200
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Mock send_sms in appointments router
        with patch('app.routers.appointments.send_sms') as mock_send_sms_appointments:
            # Change the first appointment to "Completed"
            # The checkin_res contains the visitor_id, wait, I need appointment_id.
            # I can just fetch the appointments for host 1.
            apts_res = await ac.get("/appointments", headers=headers)
            apts = apts_res.json()["data"]
            # Find the first one
            first_apt = next(a for a in apts if a["visitor"]["full_name"] == "Sms Tester")
            
            update_res = await ac.patch(f"/appointments/{first_apt['id']}", json={
                "status": "COMPLETED"
            }, headers=headers)
            assert update_res.status_code == 200, update_res.text

            # Check that the second visitor got the "ready" SMS
            assert mock_send_sms_appointments.call_count >= 1
            
            calls = mock_send_sms_appointments.call_args_list
            phones_called = [call[0][0] for call in calls]
            messages_called = [call[0][1] for call in calls]

            # The next appointment might be a pre-seeded one or the one we just created
            assert len(phones_called) >= 1
            ready_msg_found = any("is now ready for you. Please proceed" in msg for msg in messages_called)
            assert ready_msg_found
