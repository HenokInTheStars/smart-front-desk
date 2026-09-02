from pydantic import BaseModel, ConfigDict
from typing import List

class HostShiftBase(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str
    end_time: str

class HostShiftCreate(HostShiftBase):
    pass

class HostShiftOut(HostShiftBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int

class HostHolidayBase(BaseModel):
    date: str
    reason: str | None = None

class HostHolidayCreate(HostHolidayBase):
    pass

class HostHolidayOut(HostHolidayBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int

class HostScheduleUpdate(BaseModel):
    shifts: List[HostShiftCreate]
    holidays: List[HostHolidayCreate]

class HostScheduleOut(BaseModel):
    shifts: List[HostShiftOut]
    holidays: List[HostHolidayOut]

class AvailabilityCheckResponse(BaseModel):
    is_available: bool
    suggested_time: str | None = None
    reason: str | None = None
