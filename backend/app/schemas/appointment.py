from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.visitor import VisitorOut
from app.schemas.employee import EmployeeOut
from uuid import UUID

class AppointmentBase(BaseModel):
    visitor_id: UUID
    host_id: UUID
    scheduled_time: datetime
    status: str = "scheduled"
    notes: str | None = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    scheduled_time: datetime | None = None
    status: str | None = None
    notes: str | None = None
    host_id: UUID | None = None

class AppointmentOut(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    visitor: VisitorOut | None = None
    host: EmployeeOut | None = None
