import asyncio
import os
import sys

# Add the backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config import get_settings
from app.db.models import User
from app.security import get_password_hash
from sqlalchemy.ext.asyncio import create_async_engine

settings = get_settings()

# If running outside docker (on Windows host), replace 'postgres' host with 'localhost' and map port if needed
db_url = settings.database_url
if "@postgres:" in db_url:
    # Inside docker compose postgres is exposed on 5433 on the host, 5432 internally
    db_url = db_url.replace("@postgres:5432", "@localhost:5433").replace("@postgres:", "@localhost:5433")
elif "@localhost:5432" in db_url:
    # If using host port 5433
    pass

engine = create_async_engine(db_url, echo=False, future=True)

async def seed_super_admin():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as db:
        # Check if any Super Admin exists
        result = await db.execute(select(User).where(User.role == "Super Admin"))
        super_admin = result.scalar_one_or_none()
        
        if super_admin:
            print("Super Admin already exists!")
            return
            
        print("Creating the first Super Admin account...")
        
        email = "superadmin@example.com"
        password = "changeme123"
        
        new_user = User(
            email=email,
            hashed_password=get_password_hash(password),
            role="Super Admin",
            is_active=True
        )
        
        db.add(new_user)
        await db.commit()
        
        print(f"Super Admin created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")

if __name__ == "__main__":
    asyncio.run(seed_super_admin())
