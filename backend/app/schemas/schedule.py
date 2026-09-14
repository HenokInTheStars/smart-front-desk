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

class NearestSlotInfo(BaseModel):
    date: str
    time: str
    display_day: str
    display_time: str
    full_formatted: str
    shift_range: str
    iso_timestamp: str

class HostAvailabilityEvaluationRequest(BaseModel):
    purpose: str
    notes: str = ""
    hostName: str | None = None
    target_time: str | None = None

class HostAvailabilityEvaluationResponse(BaseModel):
    is_available: bool
    host_name: str
    host_department: str
    host_job_title: str
    employee_id: str
    numeric_host_id: int
    reason: str | None = None
    nearest_slot: NearestSlotInfo | None = None
    current_shift_status: str | None = None
