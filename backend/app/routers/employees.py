from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Employee, Appointment
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.data.employee_directory import EMPLOYEE_DIRECTORY
from app.schemas.responses import StandardResponseEnvelope

router = APIRouter(prefix="/employees", tags=["employees"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"


@router.get("")
async def list_employees(
    request: Request,
    skip: int = 0, 
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
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

    # Dynamic availability status for reception board
    active_meetings_res = await db.execute(
        select(Appointment.host_id).where(Appointment.status == "IN_MEETING")
    )
    busy_host_ids = {row for row in active_meetings_res.scalars()}

    out = []
    for emp in employees:
        status = emp.availability_status
        if status == 1 and emp.id in busy_host_ids:
            status = 3
        out.append(
            EmployeeOut(
                id=emp.id,
                employee_id=emp.employee_id,
                full_name=emp.full_name,
                department=emp.department,
                phone=emp.phone,
                availability_status=status
            )
        )
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="Fetched employees",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=out
    )


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
