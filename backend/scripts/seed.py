import asyncio
import sys
import os

# Add backend directory to sys.path if running directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.db.models import User, Employee
from app.security import get_password_hash
from sqlalchemy import select

async def seed():
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("Seeding admin user...")
            admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("secret"),
                role="admin"
            )
            session.add(admin)
            await session.commit()
            print("Admin user seeded successfully.")
        else:
            print("Admin user already exists.")
            
        # Seed Employees
        print("Seeding employees...")
        employees_data = [
            {"employee_id": "EMP001", "full_name": "Sarah Jenkins", "department": "Design", "phone": "555-0101"},
            {"employee_id": "EMP002", "full_name": "David Chen", "department": "IT", "phone": "555-0102"},
            {"employee_id": "EMP003", "full_name": "Michael Ross", "department": "Legal", "phone": "555-0103"}
        ]
        for emp_data in employees_data:
            result = await session.execute(select(Employee).where(Employee.employee_id == emp_data["employee_id"]))
            emp = result.scalar_one_or_none()
            if not emp:
                new_emp = Employee(**emp_data)
                session.add(new_emp)
                print(f"Added employee {emp_data['full_name']}")
        
        await session.commit()
        print("Employee seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed())
