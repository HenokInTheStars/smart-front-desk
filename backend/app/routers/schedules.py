from datetime import datetime, timedelta
from typing import Optional, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.session import get_db
from app.db.models import Employee, HostShift, HostHoliday
from app.schemas.schedule import (
    HostScheduleUpdate,
    HostScheduleOut,
    AvailabilityCheckResponse,
    HostAvailabilityEvaluationRequest,
    HostAvailabilityEvaluationResponse,
    NearestSlotInfo,
)
from app.services.ai_routing import match_host_for_visitor

router = APIRouter(prefix="/schedules", tags=["schedules"])

# Standard fallback business hours (Mon-Fri 09:00 - 17:00, Sat/Sun Off)
DEFAULT_WEEKLY_SHIFTS: Dict[int, List[tuple[str, str]]] = {
    0: [("09:00", "17:00")],  # Monday
    1: [("09:00", "17:00")],  # Tuesday
    2: [("09:00", "17:00")],  # Wednesday
    3: [("09:00", "17:00")],  # Thursday
    4: [("09:00", "17:00")],  # Friday
    5: [],                    # Saturday
    6: [],                    # Sunday
}


def _format_time_12h(time_str: str) -> str:
    """Converts '09:00' to '9:00 AM' and '17:00' to '5:00 PM'."""
    try:
        dt = datetime.strptime(time_str.strip(), "%H:%M")
        return dt.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return time_str


async def calculate_host_availability_and_nearest_slot(
    employee: Employee,
    target_dt: datetime,
    db: AsyncSession
) -> tuple[bool, Optional[str], Optional[NearestSlotInfo], Optional[str]]:
    """
    Evaluates if the host is available at `target_dt` and computes the nearest
    available slot within the next 14 days if currently unavailable.
    """
    # 1. Fetch employee shifts and holidays
    shifts_res = await db.execute(
        select(HostShift).where(HostShift.employee_id == employee.id)
    )
    db_shifts = shifts_res.scalars().all()

    # Build weekly shift map (day_of_week -> list of (start_time, end_time))
    weekly_shifts: Dict[int, List[tuple[str, str]]] = {d: [] for d in range(7)}
    if db_shifts:
        for s in db_shifts:
            weekly_shifts[s.day_of_week].append((s.start_time, s.end_time))
        for d in weekly_shifts:
            weekly_shifts[d].sort(key=lambda x: x[0])
    else:
        weekly_shifts = DEFAULT_WEEKLY_SHIFTS

    # Fetch holidays
    holidays_res = await db.execute(
        select(HostHoliday).where(HostHoliday.employee_id == employee.id)
    )
    holidays_list = holidays_res.scalars().all()
    holiday_map = {h.date: (h.reason or "Out of Office / Leave") for h in holidays_list}

    target_date_str = target_dt.strftime("%Y-%m-%d")
    target_time_str = target_dt.strftime("%H:%M")
    target_weekday = target_dt.weekday()

    # 2. Check if currently available at target_dt
    is_available = False
    unavailability_reason = None
    current_shift_status = "Off Shift"

    if employee.availability_status == 4:
        is_available = False
        unavailability_reason = "Host is currently marked as Not Available"
        current_shift_status = "Not Available"
    elif target_date_str in holiday_map:
        is_available = False
        unavailability_reason = f"Out of Office: {holiday_map[target_date_str]}"
        current_shift_status = "Holiday / Leave"
    else:
        today_shifts = weekly_shifts.get(target_weekday, [])
        if not today_shifts:
            is_available = False
            unavailability_reason = "Not scheduled to work today (Off-shift)"
            current_shift_status = "Non-working Day"
        else:
            # Check if within any active shift
            for s_start, s_end in today_shifts:
                if s_start <= target_time_str <= s_end:
                    is_available = True
                    current_shift_status = f"On Shift ({_format_time_12h(s_start)} - {_format_time_12h(s_end)})"
                    break

            if not is_available:
                earliest_future_today = next((s for s in today_shifts if s[0] > target_time_str), None)
                if earliest_future_today:
                    unavailability_reason = f"Shift starts later today at {_format_time_12h(earliest_future_today[0])}"
                    current_shift_status = f"Upcoming shift at {_format_time_12h(earliest_future_today[0])}"
                else:
                    unavailability_reason = "Shift ended for today"
                    current_shift_status = "Shift Ended"

    if is_available:
        return True, None, None, current_shift_status

    # 3. Compute Nearest Available Slot across the next 14 days
    nearest_slot: Optional[NearestSlotInfo] = None

    for day_offset in range(15):
        candidate_dt = target_dt + timedelta(days=day_offset)
        candidate_date_str = candidate_dt.strftime("%Y-%m-%d")
        candidate_weekday = candidate_dt.weekday()

        if candidate_date_str in holiday_map:
            continue

        day_shifts = weekly_shifts.get(candidate_weekday, [])
        if not day_shifts:
            continue

        selected_shift: Optional[tuple[str, str]] = None
        if day_offset == 0:
            # Must start strictly after target_time_str
            selected_shift = next((s for s in day_shifts if s[0] > target_time_str), None)
        else:
            selected_shift = day_shifts[0]

        if selected_shift:
            s_start, s_end = selected_shift
            start_12h = _format_time_12h(s_start)
            end_12h = _format_time_12h(s_end)
            shift_range = f"{start_12h} - {end_12h}"
            iso_timestamp = f"{candidate_date_str}T{s_start}:00"

            if day_offset == 0:
                display_day = "Today"
                full_formatted = f"Today at {start_12h} ({shift_range})"
            elif day_offset == 1:
                display_day = f"Tomorrow ({candidate_dt.strftime('%A, %b %d')})"
                full_formatted = f"Tomorrow ({candidate_dt.strftime('%A, %b %d')}) at {start_12h}"
            else:
                display_day = candidate_dt.strftime("%A, %b %d")
                full_formatted = f"{display_day} at {start_12h}"

            nearest_slot = NearestSlotInfo(
                date=candidate_date_str,
                time=s_start,
                display_day=display_day,
                display_time=start_12h,
                full_formatted=full_formatted,
                shift_range=shift_range,
                iso_timestamp=iso_timestamp
            )
            break

    return is_available, unavailability_reason, nearest_slot, current_shift_status


@router.get("/{employee_id}", response_model=HostScheduleOut)
async def get_schedule(employee_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).where(Employee.employee_id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
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

    is_available, reason, nearest_slot, _ = await calculate_host_availability_and_nearest_slot(
        employee, dt, db
    )

    suggested_str = nearest_slot.full_formatted if nearest_slot else None
    return {
        "is_available": is_available,
        "suggested_time": suggested_str,
        "reason": reason
    }


@router.post("/evaluate-host-availability", response_model=HostAvailabilityEvaluationResponse)
async def evaluate_host_availability(
    payload: HostAvailabilityEvaluationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Intelligently identifies the optimal host for the visitor based on purpose & notes,
    then evaluates their real-time shift availability and calculates the nearest available slot.
    """
    # 1. Resolve host metadata
    target_host_name = payload.hostName
    matched_meta = None

    if not target_host_name:
        matched_meta = match_host_for_visitor(payload.purpose, payload.notes)
        target_host_name = matched_meta["name"]

    # 2. Lookup Host in DB
    result = await db.execute(select(Employee).where(Employee.full_name == target_host_name))
    host = result.scalar_one_or_none()

    if not host and matched_meta:
        emp_res = await db.execute(select(Employee).where(Employee.employee_id == matched_meta["employee_id"]))
        host = emp_res.scalar_one_or_none()
        if not host:
            host = Employee(
                employee_id=matched_meta["employee_id"],
                full_name=matched_meta["name"],
                department=f"{matched_meta['department']} ({matched_meta['job_title']})",
                phone="+1 (555) 010-0000"
            )
            db.add(host)
            await db.commit()
            await db.refresh(host)

    if not host:
        # Fallback to first employee
        first_emp_res = await db.execute(select(Employee).limit(1))
        host = first_emp_res.scalar_one_or_none()
        if not host:
            raise HTTPException(status_code=500, detail="No hosts configured in the system")

    # 3. Determine target time (default to current local time)
    if payload.target_time:
        try:
            target_dt = datetime.fromisoformat(payload.target_time.replace("Z", "+00:00"))
        except ValueError:
            target_dt = datetime.now()
    else:
        target_dt = datetime.now()

    # 4. Compute availability and nearest slot
    is_available, reason, nearest_slot, shift_status = await calculate_host_availability_and_nearest_slot(
        host, target_dt, db
    )

    # Extract clean job title from department if present (e.g. "Cloud & DevOps (Cloud Architect)")
    job_title = "Host Specialist"
    if "(" in host.department and ")" in host.department:
        job_title = host.department.split("(")[1].replace(")", "").strip()
    elif matched_meta and "job_title" in matched_meta:
        job_title = matched_meta["job_title"]

    return HostAvailabilityEvaluationResponse(
        is_available=is_available,
        host_name=host.full_name,
        host_department=host.department,
        host_job_title=job_title,
        employee_id=host.employee_id,
        numeric_host_id=host.id,
        reason=reason,
        nearest_slot=nearest_slot,
        current_shift_status=shift_status
    )
