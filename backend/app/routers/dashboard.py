from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Appointment
from app.schemas.responses import StandardResponseEnvelope

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/evacuation-roster")
async def get_evacuation_roster(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Returns a list of all visitors currently checked in or in a meeting.
    This fulfills the basic/mid feature for generating a list of visitors during emergencies.
    """
    res = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.visitor), joinedload(Appointment.host))
        .where(Appointment.status.in_(["CHECKED_IN", "IN_MEETING"]))
    )
    apts = res.scalars().all()
    
    # We map the appointments to a list of visitors for the roster
    roster = []
    for apt in apts:
        roster.append({
            "visitor_id": str(apt.visitor.id) if apt.visitor else None,
            "visitor_name": apt.visitor.full_name if apt.visitor else "Unknown",
            "host_name": apt.host.full_name if apt.host else "Unknown",
            "checked_in_at": apt.created_at.isoformat(),
            "status": apt.status
        })
        
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Evacuation roster generated",
        requestId=request.state.request_id,
        data=roster
    )
