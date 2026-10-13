import asyncio
import os
import sys

# Add the backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.db.seed_defaults import bootstrap_initial_super_admin

settings = get_settings()


async def main():
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL") or settings.bootstrap_admin_email
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD") or settings.bootstrap_admin_password

    if not email or not password:
        print("Usage: Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD environment variables.")
        print("Example: BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD=complex_password_123 python scripts/seed_super_admin.py")
        sys.exit(1)

    try:
        created = await bootstrap_initial_super_admin(email=email, password=password)
        if created:
            print(f"Success: Initial SUPER_ADMIN account '{email}' created.")
        else:
            print(f"Notice: User '{email}' or a SUPER_ADMIN already exists. No action taken.")
    except ValueError as e:
        print(f"Error: Password or email rejected: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
