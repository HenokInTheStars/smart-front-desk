from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    title: str | None = None
    department_id: str | None = None
    role: str = "staff"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    title: str | None = None
    department_id: str | None = None
    role: str | None = None
    is_active: bool | None = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    created_at: datetime
