from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])

_NOT_IMPLEMENTED = "Not implemented yet \u2014 ships in Sprint 2"


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    skip: int = 0, 
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
) -> list[AppointmentOut]:
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .order_by(Appointment.scheduled_time.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(payload: AppointmentCreate) -> AppointmentOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(appointment_id: str) -> AppointmentOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(appointment_id: str, payload: AppointmentUpdate) -> AppointmentOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(appointment_id: str) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)
