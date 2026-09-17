from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID


class VisitorBase(BaseModel):
    full_name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class VisitorCreate(VisitorBase):
    pass


class CheckInRequest(BaseModel):
    firstName: Optional[str] = ""
    lastName: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    hostName: Optional[str] = None


class VisitorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class VisitorOut(VisitorBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime


class ScheduleSlotRequest(BaseModel):
    firstName: Optional[str] = ""
    lastName: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    host_id: Optional[UUID] = None
    host_name: Optional[str] = None
    scheduled_time: str


class ScheduleSlotResponse(BaseModel):
    message: str
    appointment_id: UUID
    visitor_id: UUID
    visitor_name: str
    host_name: str
    host_department: str
    scheduled_time: str
    status: str
