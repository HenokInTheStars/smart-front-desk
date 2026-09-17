import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.db.session import AsyncSessionLocal
from app.db.models import User, Employee
from app.core.security import get_password_hash
from app.data.employee_directory import EMPLOYEE_DIRECTORY


DEFAULT_CORE_USERS = [
    {
        "email": "superadmin@example.com",
        "role": "SUPER_ADMIN",
        "password": "secret",
    },
    {
        "email": "admin@example.com",
        "role": "ADMIN",
        "password": "secret",
    },
    {
        "email": "reception@example.com",
        "role": "RECEPTION",
        "password": "secret",
    },
    {
        "email": "host@example.com",
        "role": "HOST",
        "password": "secret",
    },
    {
        "email": "security@example.com",
        "role": "OTHER",
        "password": "secret",
    },
    {
        "email": "auditor@example.com",
        "role": "OTHER",
        "password": "secret",
    },
]


async def seed_all_default_users_and_hosts(db: AsyncSession | None = None):
    """
    Ensures all core roles (Super Admin, Admin, Reception, Host, Security, Auditor)
    and all 10 Host Employees are populated in the database with User accounts.
    """
    should_close = False
    if db is None:
        db = AsyncSessionLocal()
        should_close = True

    try:
        # 1. Seed Core Role Users
        for u_data in DEFAULT_CORE_USERS:
            res = await db.execute(select(User).where(User.email == u_data["email"]))
            user = res.scalar_one_or_none()
            if not user:
                new_user = User(
                    email=u_data["email"],
                    hashed_password=get_password_hash(u_data["password"]),
                    role=u_data["role"],
                    is_active=True,
                )
                db.add(new_user)
            else:
                user.role = u_data["role"]
                user.hashed_password = get_password_hash(u_data["password"])
                user.is_active = True

        await db.commit()

        # 2. Seed 10 Host Employees and their User Accounts
        for emp_meta in EMPLOYEE_DIRECTORY:
            emp_id = emp_meta["employee_id"]
            name_slug = emp_meta["name"].lower().replace(" ", ".")
            email = f"{name_slug}@example.com"

            # Ensure User exists for this employee
            u_res = await db.execute(select(User).where(User.email == email))
            emp_user = u_res.scalar_one_or_none()
            if not emp_user:
                emp_user = User(
                    email=email,
                    hashed_password=get_password_hash("secret"),
                    role="HOST",
                    is_active=True,
                )
                db.add(emp_user)
                await db.flush()
            else:
                emp_user.role = "HOST"
                emp_user.hashed_password = get_password_hash("secret")
                emp_user.is_active = True
                await db.flush()

            # Ensure Employee record exists and is linked
            e_res = await db.execute(select(Employee).where(Employee.employee_id == emp_id))
            emp_record = e_res.scalar_one_or_none()
            dept_title = f"{emp_meta['department']} ({emp_meta['job_title']})"

            if not emp_record:
                emp_record = Employee(
                    user_id=emp_user.id,
                    employee_id=emp_id,
                    full_name=emp_meta["name"],
                    department=dept_title,
                    phone="+1 (555) 010-0000",
                )
                db.add(emp_record)
            else:
                emp_record.user_id = emp_user.id
                emp_record.full_name = emp_meta["name"]
                emp_record.department = dept_title

        await db.commit()
    finally:
        if should_close:
            await db.close()


if __name__ == "__main__":
    asyncio.run(seed_all_default_users_and_hosts())
