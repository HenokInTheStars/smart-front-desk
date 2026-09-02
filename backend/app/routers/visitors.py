from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid
from app.db.session import get_db
from app.db.models import Visitor, Employee, Appointment
from app.schemas.visitor import VisitorCreate, VisitorOut, VisitorUpdate, CheckInRequest
from app.ai_routing import match_host_for_visitor, EMPLOYEE_DIRECTORY

router = APIRouter(prefix="/visitors", tags=["visitors"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"


@router.get("", response_model=list[VisitorOut])
async def list_visitors(skip: int = 0, limit: int = 50) -> list[VisitorOut]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post("/checkin", status_code=status.HTTP_201_CREATED)
async def kiosk_checkin(payload: CheckInRequest, db: AsyncSession = Depends(get_db)):
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
                scheduled_time=datetime.utcnow(),
                status="Checked In",
                notes=f"Purpose: {payload.purpose}\nNotes: {payload.notes}"
            )
            db.add(appointment)
            await db.commit()
            
        return {
            "message": "Check-in successful",
            "visitor_id": visitor.id,
            "assigned_host": host.full_name if host else "General Reception",
            "assigned_department": host.department if host else "Front Desk"
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Check-in error: {str(e)}"
        )


@router.post("", response_model=VisitorOut, status_code=status.HTTP_201_CREATED)
async def create_visitor(payload: VisitorCreate) -> VisitorOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/{visitor_id}", response_model=VisitorOut)
async def get_visitor(visitor_id: str) -> VisitorOut:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)
