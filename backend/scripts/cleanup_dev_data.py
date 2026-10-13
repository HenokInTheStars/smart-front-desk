import asyncio
import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import AsyncSessionLocal
from sqlalchemy import text


async def cleanup_dev_data():
    async with AsyncSessionLocal() as session:
        # Use a single explicit transaction
        async with session.begin():
            print("=== BEFORE CLEANUP ===")
            before_total = (await session.execute(text("SELECT count(*) FROM appointments;"))).scalar()
            before_counts = (await session.execute(text("SELECT source, count(*) FROM appointments GROUP BY 1 ORDER BY 1;"))).fetchall()
            print(f"Total appointments before: {before_total}")
            for r in before_counts:
                print(f"  {r[0]}: {r[1]}")

            # 1. Delete appointments created at or after 2026-10-13 12:28:00 UTC
            del_apt_res = await session.execute(
                text("DELETE FROM appointments WHERE created_at >= '2026-10-13 12:28:00+00:00';")
            )
            print(f"\nDeleted {del_apt_res.rowcount} test appointments.")

            # 2. Check that the 4 test visitors have NO remaining appointments or references
            rem_apts = (await session.execute(
                text("""
                    SELECT count(*) FROM appointments a 
                    JOIN visitors v ON a.visitor_id = v.id 
                    WHERE v.email IN (
                        'almaz.kebede@company.com',
                        'tewodros.kassahun@tech.et',
                        'candidate.bethlehem@careers.et',
                        'dawit.tadesse@example.com'
                    );
                """)
            )).scalar()

            if rem_apts > 0:
                raise RuntimeError(f"Safety check failed: test visitors still have {rem_apts} appointments remaining!")

            # Check if any other table references these visitor IDs
            fk_check = (await session.execute(
                text("""
                    SELECT conrelid::regclass, confrelid::regclass
                    FROM pg_constraint
                    WHERE confrelid = 'visitors'::regclass;
                """)
            )).fetchall()
            print(f"Verified referencing foreign keys to visitors: {[str(r[0]) for r in fk_check]}")

            # Delete only the 4 test visitors
            del_vis_res = await session.execute(
                text("""
                    DELETE FROM visitors 
                    WHERE email IN (
                        'almaz.kebede@company.com',
                        'tewodros.kassahun@tech.et',
                        'candidate.bethlehem@careers.et',
                        'dawit.tadesse@example.com'
                    );
                """)
            )
            print(f"Deleted {del_vis_res.rowcount} test visitors.")

            # 3. Apply the 3 UPDATE statements
            # A. Corporate visits -> PRE_REGISTERED (12 rows)
            upd1 = await session.execute(text("""
                UPDATE appointments 
                SET source = 'PRE_REGISTERED'
                WHERE visitor_id IN (
                    SELECT id FROM visitors WHERE email IN (
                        'abebe.bikila@telecom.et', 'helen.gebre@safari.et', 'sara.tadesse@cbe.com.et',
                        'bethlehem.alemu@sole.et', 'daniel.worku@ministry.gov.et', 'dawit.haile@globaltech.com'
                    )
                );
            """))
            print(f"Updated {upd1.rowcount} corporate appointments to PRE_REGISTERED.")

            # B. Receptionist portal visit -> MANUAL (1 row)
            upd2 = await session.execute(text("""
                UPDATE appointments
                SET source = 'MANUAL'
                WHERE visitor_id IN (
                    SELECT id FROM visitors WHERE email = 'lapylo@mailinator.com'
                );
            """))
            print(f"Updated {upd2.rowcount} receptionist appointment to MANUAL.")

            # C. Kiosk visits -> WALK_IN (12 rows)
            upd3 = await session.execute(text("""
                UPDATE appointments
                SET source = 'WALK_IN'
                WHERE visitor_id IN (
                    SELECT id FROM visitors WHERE email LIKE 'walkin_%@kiosk.local'
                       OR email LIKE 'walkin_%@temp.matrix'
                       OR email IN ('roluc@mailinator.com', 'zesabyseto@mailinator.com', 'jyqitacu@mailinator.com')
                );
            """))
            print(f"Updated {upd3.rowcount} kiosk appointments to WALK_IN.")

            # 4. Verify counts AFTER
            after_total = (await session.execute(text("SELECT count(*) FROM appointments;"))).scalar()
            after_counts_raw = (await session.execute(text("SELECT source, count(*) FROM appointments GROUP BY 1 ORDER BY 1;"))).fetchall()
            after_counts = {str(r[0]): r[1] for r in after_counts_raw}

            print("\n=== AFTER CLEANUP (UNCOMMITTED CHECK) ===")
            print(f"Total appointments after: {after_total}")
            for src, count in after_counts.items():
                print(f"  {src}: {count}")

            expected = {"MANUAL": 1, "PRE_REGISTERED": 12, "WALK_IN": 12}
            if after_total != 25 or after_counts != expected:
                raise ValueError(
                    f"Count mismatch! Expected total=25 and {expected}, got total={after_total} and {after_counts}. Rolling back!"
                )

            print("\nVerification PASSED. Transaction committed successfully.")


if __name__ == "__main__":
    asyncio.run(cleanup_dev_data())
