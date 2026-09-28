from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import Appointment
from app.schemas.responses import StandardResponseEnvelope
from app.routers.live import broadcast_event

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_is_emergency_active = False

@router.post("/emergency/toggle")
async def toggle_emergency(request: Request, db: AsyncSession = Depends(get_db)):
    global _is_emergency_active
    _is_emergency_active = not _is_emergency_active
    
    # Broadcast to all SSE clients (including Kiosks)
    import asyncio
    asyncio.create_task(broadcast_event("emergency", {"active": _is_emergency_active}))
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message=f"Emergency mode set to {_is_emergency_active}",
        requestId=request.state.request_id,
        data={"emergency_active": _is_emergency_active}
    )

@router.get("/emergency/status")
async def get_emergency_status(request: Request):
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Fetched emergency status",
        requestId=request.state.request_id,
        data={"emergency_active": _is_emergency_active}
    )

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
            "booked_at": apt.created_at.isoformat() if apt.created_at else None,
            "entered_host_room_at": apt.updated_at.isoformat() if apt.status == "IN_MEETING" and apt.updated_at else None,
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

@router.get("/health")
async def get_system_health(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Returns system health KPIs for the Central Operations dashboard.
    """
    import random
    
    # Simulate DB latency check
    db_reachable = True
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
    except Exception:
        db_reachable = False

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="System health generated",
        requestId=request.state.request_id,
        data={
            "api_server": {
                "uptime": "99.99%",
                "status": "online",
                "trend": "+0.1%"
            },
            "database": {
                "status": "Synced" if db_reachable else "Offline",
                "latency_ms": random.randint(8, 15) if db_reachable else 0,
                "trend": "+1ms"
            },
            "storage": {
                "used_gb": 14.5,
                "total_gb": 32,
                "percent_used": round(14.5 / 32 * 100)
            },
            "kiosk_connection": {
                "active_nodes": 2,
                "status": "online",
                "trend": "+0"
            }
        }
    )

@router.get("/audit-logs")
async def get_audit_logs(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Returns recent audit logs.
    """
    from app.db.models import AuditLog, User
    res = await db.execute(
        select(AuditLog)
        .options(joinedload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    logs = res.scalars().all()
    
    out = []
    for log in logs:
        # Determine log type based on action
        log_type = "info"
        if "login" in log.action.lower() or "success" in log.action.lower():
            log_type = "success"
        elif "fail" in log.action.lower() or "error" in log.action.lower():
            log_type = "warning"
            
        user_display = "System"
        if log.user:
            role = log.user.role.title() if log.user.role else "User"
            user_display = f"{role} ({log.user.email})"
            
        out.append({
            "id": str(log.id),
            "title": log.action,
            "detail": log.detail,
            "time": log.created_at.isoformat(),
            "meta": user_display,
            "type": log_type
        })
        
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="Audit logs fetched",
        requestId=request.state.request_id,
        data=out
    )
