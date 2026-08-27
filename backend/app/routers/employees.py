from fastapi import APIRouter, HTTPException, status

from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])

_NOT_IMPLEMENTED = "Not implemented yet \u2014 ships in Sprint 2"


@router.get("", response_model=list[EmployeeOut])
async def list_employees(skip: int = 0, limit: int = 50) -> list[EmployeeOut]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


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
