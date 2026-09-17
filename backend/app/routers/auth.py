from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.security import verify_password, create_access_token, get_password_hash, get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Employee, Appointment, AuditLog
from app.schemas.user import get_effective_permissions

from app.schemas.auth import (
    CurrentUser,
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    TokenResponse,
    ProfileUpdateRequest,
)
from app.schemas.responses import StandardResponseEnvelope

router = APIRouter(prefix="/auth", tags=["auth"])

_NOT_IMPLEMENTED = "Not implemented yet — ships in Sprint 2"

@router.post("/login")
async def login(
    payload: LoginRequest, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact your Super Administrator."
        )

    access_token = create_access_token(data={"sub": user.email})
    
    audit_log = AuditLog(
        action="User Login",
        detail=f"{user.email} authenticated successfully via standard login",
        tag="Authentication",
        user_id=user.id
    )
    db.add(audit_log)
    await db.commit()
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="Login successful",
        requestId=f"auth-login-{user.id}",
        data={
            "access_token": access_token, 
            "token_type": "bearer"
        }
    )

@router.post("/refresh", response_model=RefreshResponse)
async def refresh(payload: RefreshRequest) -> RefreshResponse:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/me")
async def me(request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    emp_res = await db.execute(select(Employee).where(Employee.user_id == current_user.id))
    emp = emp_res.scalar_one_or_none()

    # If not directly linked by user_id, lookup employee by matching name from email
    if not emp:
        user_prefix = current_user.email.split("@")[0].replace(".", " ").lower()
        all_emps_res = await db.execute(select(Employee))
        all_emps = all_emps_res.scalars().all()
        for candidate in all_emps:
            if candidate.full_name.lower() in user_prefix or user_prefix in candidate.full_name.lower():
                emp = candidate
                # Auto-link in DB for future requests
                emp.user_id = current_user.id
                await db.commit()
                break

    effective_perms = get_effective_permissions(current_user.role, current_user.permissions)
    fallback_name = current_user.email.split("@")[0].replace(".", " ").title()

    availability_status = 1
    if emp:
        availability_status = emp.availability_status
        if availability_status == 1:
            meeting_res = await db.execute(
                select(Appointment).where(
                    Appointment.host_id == emp.id,
                    Appointment.status == "IN_MEETING"
                )
            )
            if meeting_res.scalars().first():
                availability_status = 3

    current_user_out = CurrentUser(
        id=current_user.id,
        email=current_user.email,
        full_name=emp.full_name if emp else fallback_name,
        employee_id=emp.employee_id if emp else "EMP001",
        department=emp.department if emp else "Operations",
        numeric_host_id=emp.id if emp else None,
        is_active=current_user.is_active,
        role=current_user.role,
        permissions=effective_perms,
        phone=emp.phone if emp else None,
        availability_status=availability_status
    )
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="Fetched current user",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=current_user_out
    )

@router.put("/me")
async def update_me(
    request: Request,
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates the current user's profile (email, phone, password)."""
    
    # 1. Update Email
    if payload.email and payload.email != current_user.email:
        # Ensure email is unique
        existing = await db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = payload.email

    # 2. Update Password
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect current password")
        current_user.hashed_password = get_password_hash(payload.new_password)

    # 3. Update Employee Fields (phone, availability_status)
    if payload.phone is not None or payload.availability_status is not None:
        emp_res = await db.execute(select(Employee).where(Employee.user_id == current_user.id))
        emp = emp_res.scalar_one_or_none()
        
        if not emp:
            # Check by matching email if they don't have user_id linked
            user_prefix = current_user.email.split("@")[0].replace(".", " ").lower()
            all_emps_res = await db.execute(select(Employee))
            all_emps = all_emps_res.scalars().all()
            for candidate in all_emps:
                if candidate.full_name.lower() in user_prefix or user_prefix in candidate.full_name.lower():
                    emp = candidate
                    emp.user_id = current_user.id
                    break
                    
        if emp:
            if payload.phone is not None:
                emp.phone = payload.phone
            if payload.availability_status is not None:
                emp.availability_status = payload.availability_status
                    
    await db.commit()
    
    # Return the updated user info by calling the `me` endpoint logic again
    return await me(request=request, current_user=current_user, db=db)