from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.visitor import VisitorOut
from app.schemas.employee import EmployeeOut

class AppointmentBase(BaseModel):
    visitor_id: int
    host_id: int
    scheduled_time: datetime
    status: str = "scheduled"
    notes: str | None = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    scheduled_time: datetime | None = None
    status: str | None = None
    notes: str | None = None

class AppointmentOut(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    visitor: VisitorOut | None = None
    host: EmployeeOut | None = None
