from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


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
    id: int
    created_at: datetime
