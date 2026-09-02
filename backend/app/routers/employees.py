from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Employee
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.ai_routing import EMPLOYEE_DIRECTORY

router = APIRouter(prefix="/employees", tags=["employees"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"


@router.get("", response_model=list[EmployeeOut])
async def list_employees(
    skip: int = 0, 
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> list[EmployeeOut]:
    result = await db.execute(select(Employee).offset(skip).limit(limit))
    employees = result.scalars().all()

    # If database has not been seeded yet, seed from verified directory
    if not employees:
        for emp_data in EMPLOYEE_DIRECTORY:
            new_emp = Employee(
                employee_id=emp_data["employee_id"],
                full_name=emp_data["name"],
                department=f"{emp_data['department']} ({emp_data['job_title']})",
                phone="+1 (555) 010-0000"
            )
            db.add(new_emp)
        await db.commit()
        
        result = await db.execute(select(Employee).offset(skip).limit(limit))
        employees = result.scalars().all()

    return employees


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(payload: EmployeeCreate) -> EmployeeOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(employee_id: str) -> EmployeeOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(employee_id: str, payload: EmployeeUpdate) -> EmployeeOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(employee_id: str) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)
