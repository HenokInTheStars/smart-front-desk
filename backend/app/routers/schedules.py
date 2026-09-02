from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_db
from app.db.models import Employee, HostShift, HostHoliday
from app.schemas.schedule import HostScheduleUpdate, HostScheduleOut, AvailabilityCheckResponse
from datetime import datetime

router = APIRouter(prefix="/schedules", tags=["schedules"])

@router.get("/{employee_id}", response_model=HostScheduleOut)
async def get_schedule(employee_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.employee_id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        # Instead of 404, we can look by full_name because Kiosk passes full_name as ID currently
        result = await db.execute(select(Employee).where(Employee.full_name == employee_id))
        employee = result.scalar_one_or_none()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    shifts_result = await db.execute(select(HostShift).where(HostShift.employee_id == employee.id))
    shifts = shifts_result.scalars().all()

    holidays_result = await db.execute(select(HostHoliday).where(HostHoliday.employee_id == employee.id))
    holidays = holidays_result.scalars().all()

    return {"shifts": shifts, "holidays": holidays}

@router.put("/{employee_id}", response_model=HostScheduleOut)
async def update_schedule(employee_id: str, payload: HostScheduleUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.employee_id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        result = await db.execute(select(Employee).where(Employee.full_name == employee_id))
        employee = result.scalar_one_or_none()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    # Clear existing
    await db.execute(delete(HostShift).where(HostShift.employee_id == employee.id))
    await db.execute(delete(HostHoliday).where(HostHoliday.employee_id == employee.id))

    # Add new
    new_shifts = [HostShift(employee_id=employee.id, **s.model_dump()) for s in payload.shifts]
    db.add_all(new_shifts)

    new_holidays = [HostHoliday(employee_id=employee.id, **h.model_dump()) for h in payload.holidays]
    db.add_all(new_holidays)

    await db.commit()

    return {"shifts": new_shifts, "holidays": new_holidays}

@router.get("/{employee_id}/availability", response_model=AvailabilityCheckResponse)
async def check_availability(employee_id: str, target_time: str, db: AsyncSession = Depends(get_db)):
    try:
        dt = datetime.fromisoformat(target_time.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use ISO format.")
        
    result = await db.execute(select(Employee).where(Employee.employee_id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        result = await db.execute(select(Employee).where(Employee.full_name == employee_id))
        employee = result.scalar_one_or_none()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    date_str = dt.strftime("%Y-%m-%d")
    
    # Check holiday
    holidays_res = await db.execute(
        select(HostHoliday).where(HostHoliday.employee_id == employee.id, HostHoliday.date == date_str)
    )
    holiday = holidays_res.scalar_one_or_none()
    if holiday:
        return {"is_available": False, "suggested_time": None, "reason": holiday.reason or "Out of Office"}

    # Check shift
    day_idx = dt.weekday()
    shifts_res = await db.execute(
        select(HostShift).where(HostShift.employee_id == employee.id, HostShift.day_of_week == day_idx)
    )
    shifts = shifts_res.scalars().all()
    # sort shifts by start time
    shifts = sorted(shifts, key=lambda s: s.start_time)

    if not shifts:
        return {"is_available": False, "suggested_time": None, "reason": "Not scheduled today"}

    time_str = dt.strftime("%H:%M")
    
    for shift in shifts:
        if shift.start_time <= time_str <= shift.end_time:
            return {"is_available": True, "suggested_time": None, "reason": None}

    next_shift = None
    for shift in shifts:
        if shift.start_time > time_str:
            next_shift = shift
            break
            
    if next_shift:
        return {"is_available": False, "suggested_time": f"{date_str} {next_shift.start_time}", "reason": "Outside working hours"}

    return {"is_available": False, "suggested_time": None, "reason": "No remaining shifts today"}
