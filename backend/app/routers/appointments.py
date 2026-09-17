from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.schemas.responses import StandardResponseEnvelope
from app.services.sms_service import send_sms
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
