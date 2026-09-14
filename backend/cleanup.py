import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models import User, Employee
from sqlalchemy import select, delete
from app.data.employee_directory import EMPLOYEE_DIRECTORY
from app.db.seed_defaults import DEFAULT_CORE_USERS

async def cleanup():
    async with AsyncSessionLocal() as db:
        valid_emp_ids = [e["employee_id"] for e in EMPLOYEE_DIRECTORY]
        core_emails = [u["email"] for u in DEFAULT_CORE_USERS]
        valid_user_emails = core_emails + [e["name"].lower().replace(" ", ".") + "@example.com" for e in EMPLOYEE_DIRECTORY]
        
        old_emps_res = await db.execute(select(Employee).where(Employee.employee_id.notin_(valid_emp_ids)))
        old_emps = old_emps_res.scalars().all()
        for emp in old_emps:
            print(f"Deleting appointments for old employee: {emp.full_name}")
            from app.db.models import Appointment
            await db.execute(delete(Appointment).where(Appointment.host_id == emp.id))
            print(f"Deleting old employee: {emp.full_name}")
            await db.delete(emp)
        
        # Delete old users that were tied to those employees, or generally not in the valid user list
        old_users_res = await db.execute(select(User).where(User.email.notin_(valid_user_emails)))
        old_users = old_users_res.scalars().all()
        for user in old_users:
            print(f"Deleting old user: {user.email}")
            await db.delete(user)
            
        await db.commit()

if __name__ == "__main__":
    asyncio.run(cleanup())
