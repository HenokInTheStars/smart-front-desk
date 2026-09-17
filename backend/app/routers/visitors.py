from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import uuid
from app.db.session import get_db
from app.db.models import Visitor, Employee, Appointment
from app.schemas.visitor import (
    VisitorCreate,
    VisitorOut,
    VisitorUpdate,
    CheckInRequest,
    ScheduleSlotRequest,
    ScheduleSlotResponse,
)
from app.schemas.responses import StandardResponseEnvelope
from app.services.ai_routing import match_host_for_visitor
from app.data.employee_directory import EMPLOYEE_DIRECTORY
from app.services.sms_service import send_sms
from fastapi import BackgroundTasks

router = APIRouter(prefix="/visitors", tags=["visitors"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"


@router.get("", response_model=list[VisitorOut])
async def list_visitors(skip: int = 0, limit: int = 50) -> list[VisitorOut]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post("/checkin", status_code=status.HTTP_201_CREATED)
async def kiosk_checkin(request: Request, payload: CheckInRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    try:
        first_name = (payload.firstName or "").strip()
        last_name = (payload.lastName or "").strip()
        full_name = f"{first_name} {last_name}".strip() or "Guest Visitor"
        
        # 1. Determine email (lookup existing visitor by email or generate unique fallback)
        visitor_email = payload.email.strip() if payload.email and payload.email.strip() else f"guest_{uuid.uuid4().hex[:8]}@visitor.matrix"

        # Check if visitor with this email already exists
        existing_visitor_res = await db.execute(select(Visitor).where(Visitor.email == visitor_email))
        visitor = existing_visitor_res.scalar_one_or_none()

        if not visitor:
            visitor = Visitor(
                full_name=full_name,
                email=visitor_email,
                phone=payload.phone,
                company=payload.purpose
            )
            db.add(visitor)
            await db.commit()
            await db.refresh(visitor)
        else:
            # Update visitor profile
            visitor.full_name = full_name
            if payload.phone:
                visitor.phone = payload.phone
            visitor.company = payload.purpose
            await db.commit()
        
        # 2. Determine host (Use explicitly provided host or AI semantic matching)
        target_host_name = payload.hostName
        matched_meta = None

        if not target_host_name:
            matched_meta = match_host_for_visitor(payload.purpose, payload.notes)
            target_host_name = matched_meta["name"]

        # 3. Lookup Host in DB
        result = await db.execute(select(Employee).where(Employee.full_name == target_host_name))
        host = result.scalar_one_or_none()

        if not host and matched_meta:
            # Check by employee_id first to prevent duplicate key constraint
            emp_res = await db.execute(select(Employee).where(Employee.employee_id == matched_meta["employee_id"]))
            host = emp_res.scalar_one_or_none()
            if host:
                host.full_name = matched_meta["name"]
                host.department = f"{matched_meta['department']} ({matched_meta['job_title']})"
                await db.commit()
            else:
                host = Employee(
                    employee_id=matched_meta["employee_id"],
                    full_name=matched_meta["name"],
                    department=f"{matched_meta['department']} ({matched_meta['job_title']})",
                    phone="+1 (555) 010-0000"
                )
                db.add(host)
                await db.commit()
                await db.refresh(host)
        elif not host:
            # Fallback to any existing employee
            first_emp_res = await db.execute(select(Employee).limit(1))
            host = first_emp_res.scalar_one_or_none()

        # 4. Create appointment linked to the AI-assigned host
        if host:
            appointment = Appointment(
                visitor_id=visitor.id,
                host_id=host.id,
                scheduled_time=datetime.now(timezone.utc).replace(microsecond=0),
                status="CHECKED_IN",
                notes=f"Purpose: {payload.purpose}\nNotes: {payload.notes or ''}"
            )
            db.add(appointment)
            await db.commit()
            
        # 5. Trigger SMS Notification to Host
        host_availability_status = 1
        if host:
            host_availability_status = host.availability_status
            if host_availability_status == 1:
                meeting_res = await db.execute(
                    select(Appointment).where(
                        Appointment.host_id == host.id,
                        Appointment.status == "IN_MEETING"
                    )
                )
                if meeting_res.scalars().first():
                    host_availability_status = 3

            if host.phone and host_availability_status in (1, 3):
                message = f"Smart Front Desk: {visitor.full_name} is here to see you for {payload.purpose}."
                background_tasks.add_task(send_sms, host.phone, message)

        if payload.phone:
            if host_availability_status in (1, 3):
                visitor_msg = "Smart Front Desk: The host will notify you to enter."
            else:
                visitor_msg = "Smart Front Desk: You will be notified."
            background_tasks.add_task(send_sms, payload.phone, visitor_msg)

        res_data = {
            "visitor_id": str(visitor.id),
            "assigned_host": host.full_name if host else "General Reception",
            "assigned_department": host.department if host else "Front Desk",
            "host_availability_status": host_availability_status
        }
        
        # Broadcast the check-in event to all SSE clients (e.g. Reception Dashboard)
        from app.routers.live import broadcast_event
        background_tasks.add_task(broadcast_event, "checkin", res_data)

        return StandardResponseEnvelope(
            internalCode="SUCCESS-201",
            statusCode=201,
            status="SUCCESS",
            message="Check-in successful",
            requestId=request.state.request_id,
            data=res_data
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Check-in error: {str(e)}"
        )


@router.post("/schedule-slot", status_code=status.HTTP_201_CREATED)
async def schedule_suggested_slot(request: Request, payload: ScheduleSlotRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Schedules an appointment for the visitor at the suggested future shift slot
    with status 'Expected' so the host and reception have it pre-booked on their calendar.
    """
    try:
        first_name = (payload.firstName or "").strip()
        last_name = (payload.lastName or "").strip()
        full_name = f"{first_name} {last_name}".strip() or "Guest Visitor"

        visitor_email = payload.email.strip() if payload.email and payload.email.strip() else f"guest_{uuid.uuid4().hex[:8]}@visitor.matrix"

        # Check existing visitor or create
        existing_visitor_res = await db.execute(select(Visitor).where(Visitor.email == visitor_email))
        visitor = existing_visitor_res.scalar_one_or_none()

        if not visitor:
            visitor = Visitor(
                full_name=full_name,
                email=visitor_email,
                phone=payload.phone,
                company=payload.purpose
            )
            db.add(visitor)
            await db.commit()
            await db.refresh(visitor)
        else:
            visitor.full_name = full_name
            if payload.phone:
                visitor.phone = payload.phone
            visitor.company = payload.purpose
            await db.commit()

        # Find host
        host = None
        if payload.host_id:
            h_res = await db.execute(select(Employee).where(Employee.id == payload.host_id))
            host = h_res.scalar_one_or_none()
        elif payload.host_name:
            h_res = await db.execute(select(Employee).where(Employee.full_name == payload.host_name))
            host = h_res.scalar_one_or_none()

        if not host:
            matched_meta = match_host_for_visitor(payload.purpose, payload.notes)
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

        # Parse scheduled datetime
        try:
            scheduled_dt = datetime.fromisoformat(payload.scheduled_time.replace("Z", "+00:00"))
        except Exception:
            scheduled_dt = datetime.now()

        if scheduled_dt.tzinfo is not None:
            scheduled_dt = scheduled_dt.replace(tzinfo=None)
        scheduled_dt = scheduled_dt.replace(microsecond=0)

        appointment = Appointment(
            visitor_id=visitor.id,
            host_id=host.id,
            scheduled_time=scheduled_dt,
            status="EXPECTED",
            notes=f"Kiosk Scheduled Slot\nPurpose: {payload.purpose or 'Meeting'}\nNotes: {payload.notes or ''}"
        )
        db.add(appointment)
        await db.commit()
        await db.refresh(appointment)

        # Trigger SMS Notification to Visitor
        if visitor.phone:
            visitor_msg = f"Smart Front Desk: Your appointment with {host.full_name} is confirmed for {payload.scheduled_time}."
            background_tasks.add_task(send_sms, visitor.phone, visitor_msg)

        return StandardResponseEnvelope(
            internalCode="SUCCESS-201",
            statusCode=201,
            status="SUCCESS",
            message="Appointment successfully scheduled for suggested slot.",
            requestId=request.state.request_id,
            data={
                "appointment_id": str(appointment.id),
                "visitor_id": str(visitor.id),
                "visitor_name": visitor.full_name,
                "host_name": host.full_name,
                "host_department": host.department,
                "scheduled_time": payload.scheduled_time,
                "status": "EXPECTED"
            }
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scheduling error: {str(e)}"
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_visitor(payload: VisitorCreate):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/{visitor_id}")
async def get_visitor(visitor_id: str):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)

@router.post("/{visitor_id}/checkout")
async def checkout_visitor(request: Request, visitor_id: str, db: AsyncSession = Depends(get_db)):
    try:
        vid = uuid.UUID(visitor_id)
        
        # update latest appointment status to 'COMPLETED'
        apt_res = await db.execute(
            select(Appointment)
            .where(Appointment.visitor_id == vid)
            .order_by(Appointment.created_at.desc())
            .limit(1)
        )
        apt = apt_res.scalar_one_or_none()
        if not apt:
            raise HTTPException(status_code=404, detail="No appointment found for visitor")
        
        apt.status = "COMPLETED"
        await db.commit()
        
        return StandardResponseEnvelope(
            internalCode="SUCCESS-200",
            statusCode=200,
            status="SUCCESS",
            message="Visitor checked out successfully",
            requestId=request.state.request_id,
            data={"appointment_id": str(apt.id)}
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
