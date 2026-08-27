from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class AppointmentBase(BaseModel):
    host_employee_id: str
    visitor_id: str | None = None
    visitor_name: str | None = None
    visitor_email: EmailStr | None = None
    scheduled_start: datetime
    scheduled_end: datetime | None = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    host_employee_id: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    status: str | None = None


class AppointmentOut(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    created_by: str | None = None
    created_at: datetime
