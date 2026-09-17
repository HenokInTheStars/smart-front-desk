from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class EmployeeBase(BaseModel):
    employee_id: str
    full_name: str
    department: str
    phone: str | None = None
    availability_status: int = 1

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_id: str | None = None
    full_name: str | None = None
    department: str | None = None
    phone: str | None = None

class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
