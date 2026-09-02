import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import Employee
from app.ai_routing import EMPLOYEE_DIRECTORY

async def sync():
    async with AsyncSessionLocal() as db:
        for idx, emp_data in enumerate(EMPLOYEE_DIRECTORY, start=1):
            emp_id_code = f"EMP{str(idx).zfill(3)}"
            res = await db.execute(select(Employee).where(Employee.employee_id == emp_id_code))
            existing = res.scalar_one_or_none()
            if existing:
                existing.full_name = emp_data["name"]
                existing.department = f"{emp_data['department']} ({emp_data['job_title']})"
                existing.phone = "+1 (555) 010-0000"
            else:
                new_emp = Employee(
                    employee_id=emp_id_code,
                    full_name=emp_data["name"],
                    department=f"{emp_data['department']} ({emp_data['job_title']})",
                    phone="+1 (555) 010-0000"
                )
                db.add(new_emp)
        await db.commit()
        print("SYNC COMPLETE")

if __name__ == "__main__":
    asyncio.run(sync())
