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

ETHIOPIAN_PHONE_REGEX = re.compile(r"^\+251[79]\d{8}$")

def normalize_ethiopian_phone(phone: Optional[str]) -> Optional[str]:
    if not phone or not str(phone).strip():
        return None
    cleaned = re.sub(r"[\s\-()]", "", str(phone).strip())
    if re.match(r"^0[79]\d{8}$", cleaned):
        return "+251" + cleaned[1:]
    if re.match(r"^[79]\d{8}$", cleaned):
        return "+251" + cleaned
    if re.match(r"^251[79]\d{8}$", cleaned):
        return "+" + cleaned
    if ETHIOPIAN_PHONE_REGEX.match(cleaned):
        return cleaned
    return cleaned

def validate_ethiopian_phone(phone: Optional[str]) -> Optional[str]:
    if not phone or not str(phone).strip():
        return None
    normalized = normalize_ethiopian_phone(phone)
    if not normalized or not ETHIOPIAN_PHONE_REGEX.match(normalized):
        raise ValueError("Phone number must be an Ethiopian mobile number in the format +251 followed by 9 digits starting with 9 or 7")
    return normalized

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

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v or not str(v).strip():
            return None
        return validate_ethiopian_phone(v)



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

    @field_validator('firstName', 'lastName', mode='before', check_fields=False)
    @classmethod
    def sanitize_names(cls, v: Optional[str]) -> Optional[str]:
        return validate_sanitized_string(v)

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v or not str(v).strip():
            return None
        return validate_ethiopian_phone(v)


class ScheduleSlotResponse(BaseModel):
    message: str
    appointment_id: UUID
    visitor_id: UUID
    visitor_name: str
    host_name: str
    host_department: str
    scheduled_time: str
    status: str
