import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def fix_demo_sources():
    async with AsyncSessionLocal() as session:
        # Check rows that match demo walk-in emails where source is not WALK_IN
        check_query = """
        SELECT a.id, v.email, a.source::text, a.scheduled_time, a.created_at
        FROM appointments a
        JOIN visitors v ON a.visitor_id = v.id
        WHERE v.email LIKE 'walkin_%@kiosk.local' AND a.source != 'WALK_IN';
        """
        rows = (await session.execute(text(check_query))).fetchall()
        print(f"Found {len(rows)} demo appointment row(s) requiring source correction:")
        for r in rows:
            print(f"  Appointment {r[0]}: email={r[1]}, current_source={r[2]}, sched={r[3]}, created={r[4]}")

        # Update all demo walk-in visitor appointments to WALK_IN
        update_query = """
        UPDATE appointments
        SET source = 'WALK_IN'
        WHERE id IN (
            SELECT a.id
            FROM appointments a
            JOIN visitors v ON a.visitor_id = v.id
            WHERE v.email LIKE 'walkin_%@kiosk.local' AND a.source != 'WALK_IN'
        );
        """
        res = await session.execute(text(update_query))
        await session.commit()
        print(f"Successfully updated {res.rowcount} demo appointment row(s) to 'WALK_IN'.")

if __name__ == "__main__":
    asyncio.run(fix_demo_sources())
