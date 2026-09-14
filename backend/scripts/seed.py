import asyncio
import sys
import os

# Add backend directory to sys.path if running directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.db.models import User, Employee
from app.core.security import get_password_hash
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
        from app.data.employee_directory import EMPLOYEE_DIRECTORY
        print("Seeding employees...")
        employees_data = [
            {
                "employee_id": emp["employee_id"], 
                "full_name": emp["name"], 
                "department": f"{emp['department']} ({emp['job_title']})", 
                "phone": f"555-010{i+1}"
            }
            for i, emp in enumerate(EMPLOYEE_DIRECTORY)
        ]
        for emp_data in employees_data:
            result = await session.execute(select(Employee).where(Employee.employee_id == emp_data["employee_id"]))
            emp = result.scalar_one_or_none()
            if not emp:
                new_emp = Employee(**emp_data)
                session.add(new_emp)
                print(f"Added employee {emp_data['full_name']}")
            else:
                emp.full_name = emp_data["full_name"]
                emp.department = emp_data["department"]
                emp.phone = emp_data["phone"]
                print(f"Updated employee {emp_data['full_name']}")
        
        await session.commit()
        print("Employee seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed())
