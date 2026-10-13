import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import Visitor, Appointment, Employee

EAT_TZ = ZoneInfo("Africa/Addis_Ababa")

import os
from urllib.parse import urlparse
from app.core.config import get_settings

async def seed_assistant_demo_data():
    if os.environ.get("ALLOW_DEMO_SEED") != "1":
        print("REFUSED: seed_demo_assistant_data requires environment variable ALLOW_DEMO_SEED=1")
        return

    settings = get_settings()
    clean_url = settings.resolved_database_url
    if "+asyncpg" in clean_url:
        clean_url = clean_url.replace("+asyncpg", "")
    parsed = urlparse(clean_url)
    if parsed.hostname not in ("localhost", "127.0.0.1"):
        print(f"REFUSED: seed_demo_assistant_data only permitted against localhost/127.0.0.1 (target host is '{parsed.hostname}')")
        return

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        res = await session.execute(select(Appointment))
        existing_apps = res.scalars().all()
        if len(existing_apps) > 5:
            print("Appointments already seeded.")
            return

        # Fetch employees
        emp_res = await session.execute(select(Employee))
        employees = emp_res.scalars().all()
        if not employees:
            print("No employees found. Run seed_defaults first.")
            return

        now_eat = datetime.now(EAT_TZ)
        today = now_eat.date()
        yesterday = today - timedelta(days=1)

        # Create Visitors
        visitors_data = [
            # Pre-registered visitors
            {"full_name": "Abebe Bikila", "email": "abebe.bikila@telecom.et", "phone": "+251911223344", "company": "Ethio Telecom"},
            {"full_name": "Sara Tadesse", "email": "sara.tadesse@cbe.com.et", "phone": "+251911334455", "company": "Commercial Bank of Ethiopia"},
            {"full_name": "Daniel Worku", "email": "daniel.worku@ministry.gov.et", "phone": "+251911445566", "company": "Ministry of Innovation"},
            {"full_name": "Helen Gebre", "email": "helen.gebre@safari.et", "phone": "+251911556677", "company": "Safaricom Ethiopia"},
            {"full_name": "Dawit Haile", "email": "dawit.haile@globaltech.com", "phone": "+251911667788", "company": "Global Tech Ltd"},
            {"full_name": "Bethlehem Alemu", "email": "bethlehem.alemu@sole.et", "phone": "+251911778899", "company": "SoleRebels"},
            # Walk-in visitors
            {"full_name": "Walk-in Visitor 1", "email": "walkin_101@kiosk.local", "phone": "+251922112233", "company": "Independent"},
            {"full_name": "Walk-in Visitor 2", "email": "walkin_102@kiosk.local", "phone": "+251922223344", "company": "Direct Guest"},
            {"full_name": "Walk-in Visitor 3", "email": "walkin_103@kiosk.local", "phone": "+251922334455", "company": "Contractor"},
            {"full_name": "Walk-in Visitor 4", "email": "walkin_104@kiosk.local", "phone": "+251922445566", "company": "Courier"},
            {"full_name": "Walk-in Visitor 5", "email": "walkin_105@kiosk.local", "phone": "+251922556677", "company": "Walk-in Guest"}
        ]

        visitor_objects = []
        for v in visitors_data:
            res = await session.execute(select(Visitor).where(Visitor.email == v["email"]))
            existing = res.scalar_one_or_none()
            if not existing:
                new_v = Visitor(
                    full_name=v["full_name"],
                    email=v["email"],
                    phone=v["phone"],
                    company=v["company"],
                    badge_token=uuid.uuid4()
                )
                session.add(new_v)
                await session.flush()
                visitor_objects.append(new_v)
            else:
                visitor_objects.append(existing)

        # Helper to make timezone-aware UTC datetime from EAT date and hour
        def make_utc_dt(d, hour, minute=0):
            eat_dt = datetime(d.year, d.month, d.day, hour, minute, tzinfo=EAT_TZ)
            return eat_dt.astimezone(timezone.utc)

        # Appointments for Yesterday
        yesterday_schedule = [
            (0, 0, 9, "COMPLETED"),
            (1, 1, 9, "COMPLETED"),
            (2, 2, 10, "COMPLETED"),
            (3, 3, 11, "COMPLETED"),
            (6, 0, 11, "COMPLETED"), # walk-in
            (4, 4, 14, "COMPLETED"),
            (5, 5, 14, "COMPLETED"),
            (7, 1, 15, "COMPLETED"), # walk-in
            (8, 2, 16, "COMPLETED"), # walk-in
        ]

        for v_idx, emp_idx, hr, status in yesterday_schedule:
            v = visitor_objects[v_idx % len(visitor_objects)]
            emp = employees[emp_idx % len(employees)]
            sch_time = make_utc_dt(yesterday, hr)
            src = "WALK_IN" if v_idx >= 6 else "PRE_REGISTERED"
            apt = Appointment(
                visitor_id=v.id,
                host_id=emp.id,
                scheduled_time=sch_time,
                status=status,
                source=src,
                notes=f"Meeting with {emp.full_name}",
                checked_in_at=sch_time,
                admitted_at=sch_time + timedelta(minutes=5),
                checked_out_at=sch_time + timedelta(minutes=45)
            )
            session.add(apt)

        # Appointments for Today
        today_schedule = [
            (0, 0, 9, "COMPLETED"),
            (1, 1, 9, "COMPLETED"),
            (2, 2, 10, "COMPLETED"),
            (3, 3, 10, "COMPLETED"),
            (6, 4, 11, "COMPLETED"), # walk-in
            (7, 5, 11, "IN_MEETING"), # walk-in
            (4, 0, 13, "IN_MEETING"),
            (8, 1, 14, "CHECKED_IN"), # walk-in in lobby queue
            (9, 2, 14, "CHECKED_IN"), # walk-in in lobby queue
            (5, 3, 15, "SCHEDULED"),
            (10, 4, 16, "SCHEDULED"),
        ]

        for v_idx, emp_idx, hr, status in today_schedule:
            v = visitor_objects[v_idx % len(visitor_objects)]
            emp = employees[emp_idx % len(employees)]
            sch_time = make_utc_dt(today, hr)
            checked_in = sch_time if status in ["CHECKED_IN", "IN_MEETING", "COMPLETED"] else None
            admitted = (sch_time + timedelta(minutes=5)) if status in ["IN_MEETING", "COMPLETED"] else None
            checked_out = (sch_time + timedelta(minutes=50)) if status == "COMPLETED" else None
            src = "WALK_IN" if v_idx >= 6 else "PRE_REGISTERED"

            apt = Appointment(
                visitor_id=v.id,
                host_id=emp.id,
                scheduled_time=sch_time,
                status=status,
                source=src,
                notes=f"Consultation with {emp.full_name}",
                checked_in_at=checked_in,
                admitted_at=admitted,
                checked_out_at=checked_out
            )
            session.add(apt)

        await session.commit()
        print("Successfully seeded realistic appointments and visitors for today and yesterday!")

if __name__ == "__main__":
    asyncio.run(seed_assistant_demo_data())
