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
        # 1. Seed Core Role Users (create only if missing; never overwrite existing)
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

        await db.commit()

        # 2. Seed 10 Host Employees and their User Accounts (create only if missing)
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
            elif emp_record.user_id != emp_user.id:
                emp_record.user_id = emp_user.id

        await db.commit()
    finally:
        if should_close:
            await db.close()


DISALLOWED_BOOTSTRAP_PASSWORDS = {
    "secret",
    "changeme123",
    "password",
    "admin",
    "12345678",
    "superadmin",
    "qwerty123456",
}


async def bootstrap_initial_super_admin(
    email: str | None = None,
    password: str | None = None,
    db: AsyncSession | None = None
) -> bool:
    """
    Safely bootstraps the first SUPER_ADMIN account from environment variables.
    - Refuses weak, short, or well-known default passwords.
    - Idempotent: never overwrites existing user passwords or details.
    """
    from app.core.config import get_settings
    settings = get_settings()

    admin_email = (email or settings.bootstrap_admin_email or "").strip().lower()
    admin_pwd = (password or settings.bootstrap_admin_password or "").strip()

    if not admin_email or not admin_pwd:
        return False

    if "@" not in admin_email:
        raise ValueError(f"Invalid BOOTSTRAP_ADMIN_EMAIL: '{admin_email}'")

    if admin_pwd.lower() in DISALLOWED_BOOTSTRAP_PASSWORDS or len(admin_pwd) < 12:
        raise ValueError(
            "BOOTSTRAP_ADMIN_PASSWORD rejected: must be at least 12 characters and "
            "cannot be a well-known weak password (e.g. 'secret', 'changeme123')."
        )

    should_close = False
    if db is None:
        db = AsyncSessionLocal()
        should_close = True

    try:
        res = await db.execute(select(User).where(User.email == admin_email))
        existing = res.scalar_one_or_none()
        if existing:
            return False  # Already exists, never overwrite

        new_admin = User(
            email=admin_email,
            hashed_password=get_password_hash(admin_pwd),
            role="SUPER_ADMIN",
            is_active=True,
        )
        db.add(new_admin)
        await db.commit()
        return True
    finally:
        if should_close:
            await db.close()


if __name__ == "__main__":
    asyncio.run(seed_all_default_users_and_hosts())
