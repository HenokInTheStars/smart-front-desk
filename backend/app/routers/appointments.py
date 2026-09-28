from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Appointment, Employee, User
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.schemas.responses import StandardResponseEnvelope
from app.services.sms_service import send_sms
from app.services.email_service import send_email
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class PingHostRequest(BaseModel):
    method: str  # "SMS", "Email"

import uuid

router = APIRouter(prefix="/appointments", tags=["appointments"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"


@router.get("")
async def list_appointments(
    request: Request,
    skip: int = 0, 
    limit: int = 100,
    host_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .order_by(Appointment.scheduled_time.desc())
    )
    if host_id is not None:
        query = query.where(Appointment.host_id == uuid.UUID(host_id))

    result = await db.execute(query.offset(skip).limit(limit))
    apts = result.scalars().all()
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Fetched appointments",
        requestId=request.state.request_id,
        data=[AppointmentOut.model_validate(a) for a in apts]
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(request: Request, payload: AppointmentCreate, db: AsyncSession = Depends(get_db)):
    scheduled_dt = payload.scheduled_time
    if scheduled_dt.tzinfo is not None:
        scheduled_dt = scheduled_dt.replace(tzinfo=None)
    scheduled_dt = scheduled_dt.replace(microsecond=0)

    new_apt = Appointment(
        visitor_id=payload.visitor_id,
        host_id=payload.host_id,
        scheduled_time=scheduled_dt,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(new_apt)
    await db.commit()
    await db.refresh(new_apt)
    
    # Reload with relationships
    res = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .where(Appointment.id == new_apt.id)
    )
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-201",
        statusCode=201,
        status="SUCCESS",
        message="Created appointment",
        requestId=request.state.request_id,
        data=AppointmentOut.model_validate(res.scalar_one())
    )


@router.get("/{appointment_id}")
async def get_appointment(request: Request, appointment_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .where(Appointment.id == uuid.UUID(appointment_id))
    )
    apt = res.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
        
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Fetched appointment",
        requestId=request.state.request_id,
        data=AppointmentOut.model_validate(apt)
    )


@router.patch("/{appointment_id}")
async def update_appointment(
    request: Request,
    appointment_id: str,
    payload: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .where(Appointment.id == uuid.UUID(appointment_id))
    )
    apt = res.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    old_status = apt.status

    if payload.status is not None:
        apt.status = payload.status
        now = datetime.now(timezone.utc)
        if payload.status == "CHECKED_IN" and not apt.checked_in_at:
            apt.checked_in_at = now
        elif payload.status == "IN_MEETING" and not apt.admitted_at:
            apt.admitted_at = now
        elif payload.status == "COMPLETED" and not apt.checked_out_at:
            apt.checked_out_at = now
            
    if payload.notes is not None:
        apt.notes = payload.notes
    if payload.host_id is not None:
        apt.host_id = payload.host_id
    if payload.scheduled_time is not None:
        scheduled_dt = payload.scheduled_time
        if scheduled_dt.tzinfo is not None:
            scheduled_dt = scheduled_dt.replace(tzinfo=None)
        apt.scheduled_time = scheduled_dt.replace(microsecond=0)

    await db.commit()
    await db.refresh(apt)

    if old_status != "COMPLETED" and payload.status == "COMPLETED":
        next_apt_res = await db.execute(
            select(Appointment)
            .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
            .where(
                Appointment.host_id == apt.host_id,
                Appointment.status.in_(["CHECKED_IN", "EXPECTED"])
            )
            .order_by(Appointment.scheduled_time.asc())
            .limit(1)
        )
        next_apt = next_apt_res.scalar_one_or_none()
        
        if next_apt and next_apt.visitor and next_apt.visitor.phone:
            host_name = next_apt.host.full_name if next_apt.host else "Your host"
            message = f"Smart Front Desk: {host_name} is now ready for you. Please proceed."
            background_tasks.add_task(send_sms, next_apt.visitor.phone, message)

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Updated appointment",
        requestId=request.state.request_id,
        data=AppointmentOut.model_validate(apt)
    )


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: str, db: AsyncSession = Depends(get_db)) -> None:
    res = await db.execute(select(Appointment).where(Appointment.id == uuid.UUID(appointment_id)))
    apt = res.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    await db.delete(apt)
    await db.commit()


@router.post("/{appointment_id}/notify-enter")
async def notify_enter(
    appointment_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Appointment).options(joinedload(Appointment.visitor), joinedload(Appointment.host)).where(Appointment.id == uuid.UUID(appointment_id))
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if apt.visitor and apt.visitor.phone:
        host_name = apt.host.full_name if apt.host else "Your host"
        message = f"Smart Front Desk: {host_name} is ready for you. Please enter to the host in 5 min."
        background_tasks.add_task(send_sms, apt.visitor.phone, message)
        
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Notification sent",
        requestId=getattr(request.state, "request_id", "req-none"),
        data=None
    )

@router.post("/{appointment_id}/ping-host")
async def ping_host(
    appointment_id: str,
    payload: PingHostRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Appointment).options(joinedload(Appointment.visitor), joinedload(Appointment.host).joinedload(Employee.user)).where(Appointment.id == uuid.UUID(appointment_id))
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    guest_name = apt.visitor.full_name if apt.visitor else "A guest"
    
    if payload.method == "SMS":
        if apt.host and apt.host.phone:
            message = f"Smart Front Desk: Your guest {guest_name} has been waiting for a while. Please collect them."
            background_tasks.add_task(send_sms, apt.host.phone, message)
        else:
            raise HTTPException(status_code=400, detail="Host has no phone number registered.")
            
    elif payload.method == "Email":
        if apt.host and apt.host.user and apt.host.user.email:
            subject = "Guest Waiting Notification"
            content = f"Hello {apt.host.full_name},\n\nYour guest {guest_name} has been waiting for a while at the front desk. Please collect them as soon as possible.\n\nThank you,\nSmart Front Desk"
            background_tasks.add_task(send_email, apt.host.user.email, subject, content)
        else:
            raise HTTPException(status_code=400, detail="Host has no email registered.")

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message=f"Pinged host via {payload.method}",
        requestId=getattr(request.state, "request_id", "req-none"),
        data=None
    )

@router.post("/ping-all-hosts")
async def ping_all_hosts(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Find all checked in guests
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host).joinedload(Employee.user))
        .where(Appointment.status == "CHECKED_IN")
    )
    apts = result.scalars().all()
    count = 0
    for apt in apts:
        guest_name = apt.visitor.full_name if apt.visitor else "A guest"
        if apt.host and apt.host.user and apt.host.user.email:
            subject = "Action Required: Guest Waiting"
            content = f"Hello {apt.host.full_name},\n\nYour guest {guest_name} is currently waiting at the front desk.\n\nThank you,\nSmart Front Desk"
            background_tasks.add_task(send_email, apt.host.user.email, subject, content)
            count += 1
            
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message=f"Sent emails to {count} hosts with waiting guests.",
        requestId=getattr(request.state, "request_id", "req-none"),
        data=None
    )
