from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from uuid import UUID
import re

def validate_sanitized_string(v: Optional[str]) -> Optional[str]:
    if not v:
        return v
    v = v.strip()
    if len(v) < 2:
        raise ValueError("Must be at least 2 characters long")
    lower_v = v.lower()
    blocked_words = ["lorem", "ipsum", "test", "john doe", "voluptatem", "ipsa velit", "guest"]
    if any(bw in lower_v for bw in blocked_words):
        raise ValueError(f"Generic or placeholder names are not allowed")
    return v

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

    @field_validator('firstName', 'lastName', 'company', mode='before', check_fields=False)
    @classmethod
    def sanitize_names(cls, v: Optional[str]) -> Optional[str]:
        return validate_sanitized_string(v)



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
