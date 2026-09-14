from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.services.sms_service import send_sms

router = APIRouter(prefix="/appointments", tags=["appointments"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    skip: int = 0, 
    limit: int = 100,
    host_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
) -> list[AppointmentOut]:
    query = (
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .order_by(Appointment.scheduled_time.desc())
    )
    if host_id is not None:
        query = query.where(Appointment.host_id == host_id)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(payload: AppointmentCreate, db: AsyncSession = Depends(get_db)) -> AppointmentOut:
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
    return res.scalar_one()


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)) -> AppointmentOut:
    res = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .where(Appointment.id == appointment_id)
    )
    apt = res.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return apt


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> AppointmentOut:
    res = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .where(Appointment.id == appointment_id)
    )
    apt = res.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    old_status = apt.status

    if payload.status is not None:
        apt.status = payload.status
    if payload.notes is not None:
        apt.notes = payload.notes
    if payload.scheduled_time is not None:
        scheduled_dt = payload.scheduled_time
        if scheduled_dt.tzinfo is not None:
            scheduled_dt = scheduled_dt.replace(tzinfo=None)
        apt.scheduled_time = scheduled_dt.replace(microsecond=0)

    await db.commit()
    await db.refresh(apt)

    if old_status != "Completed" and payload.status == "Completed":
        next_apt_res = await db.execute(
            select(Appointment)
            .options(joinedload(Appointment.visitor))
            .where(
                Appointment.host_id == apt.host_id,
                Appointment.status.in_(["Checked In", "Expected"])
            )
            .order_by(Appointment.scheduled_time.asc())
            .limit(1)
        )
        next_apt = next_apt_res.scalar_one_or_none()
        
        if next_apt and next_apt.visitor and next_apt.visitor.phone:
            message = "Smart Front Desk: The person you are here to see is now ready for you. Please proceed."
            background_tasks.add_task(send_sms, next_apt.visitor.phone, message)

    return apt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: int, db: AsyncSession = Depends(get_db)) -> None:
    res = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = res.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    await db.delete(apt)
    await db.commit()
