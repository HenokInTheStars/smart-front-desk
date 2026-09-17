from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.session import get_db
from app.db.models import User, AuditLog
from app.schemas.audit import AuditLogOut
from app.schemas.user import (
    UserCreate,
    UserOut,
    UserRoleUpdate,
    RoleDefinition,
    CustomRoleCreate,
    ALL_SYSTEM_PERMISSIONS,
    DEFAULT_ROLE_PERMISSIONS,
    get_effective_permissions,
)
from app.core.security import get_password_hash, RequireRole
from app.schemas.responses import StandardResponseEnvelope

router = APIRouter(prefix="/users", tags=["users"])

# In-memory registry for dynamic custom role definitions
DYNAMIC_ROLE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "SUPER_ADMIN": {
        "description": "Full root administrative control and dynamic role authorization",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("SUPER_ADMIN", []),
    },
    "ADMIN": {
        "description": "Operations management, report generation, and staff directory access",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("ADMIN", []),
    },
    "RECEPTION": {
        "description": "Lobby queue management, badge printing, and manual visitor check-in",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("RECEPTION", []),
    },
    "HOST": {
        "description": "Visitor reception, meeting lifecycle control, shifts, and scheduling",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("HOST", []),
    },
    "SECURITY": {
        "description": "Lobby queue oversight, visitor badge printing, and security compliance audit logs",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("OTHER", []),
    },
    "AUDITOR": {
        "description": "Compliance oversight, reporting analysis, and immutable security audit logs",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("OTHER", []),
    },
    "OTHER": {
        "description": "Restricted base account with no active operational privileges",
        "default_permissions": DEFAULT_ROLE_PERMISSIONS.get("OTHER", []),
    },
}

import uuid

def _format_user_out(user: User) -> UserOut:
    effective_perms = get_effective_permissions(user.role, user.permissions)
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        permissions=effective_perms,
        is_active=user.is_active,
    )


@router.get("/roles/catalog")
async def get_roles_catalog(
    request: Request,
    current_user: User = Depends(RequireRole(["SUPER_ADMIN", "ADMIN"]))
):
    """Returns the full permission catalog and all dynamic role presets."""
    roles_list = [
        {
            "role": role_name,
            "description": role_meta["description"],
            "default_permissions": role_meta["default_permissions"],
        }
        for role_name, role_meta in DYNAMIC_ROLE_REGISTRY.items()
    ]
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="Fetched roles catalog",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data={
            "permissions": ALL_SYSTEM_PERMISSIONS,
            "roles": roles_list,
        }
    )


@router.post("/roles/catalog", status_code=status.HTTP_201_CREATED)
async def create_custom_role_preset(
    request: Request,
    payload: CustomRoleCreate,
    current_user: User = Depends(RequireRole(["SUPER_ADMIN"]))
):
    """Allows Super Admin to register a brand new dynamic role preset with specific default capabilities."""
    role_name = payload.role.strip()
    if not role_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role name cannot be empty")
    
    DYNAMIC_ROLE_REGISTRY[role_name] = {
        "description": payload.description or f"Custom dynamic role: {role_name}",
        "default_permissions": payload.permissions,
    }
    DEFAULT_ROLE_PERMISSIONS[role_name] = payload.permissions
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-201",
        statusCode=201,
        status="CREATED",
        message=f"Dynamic role '{role_name}' registered successfully.",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data={
            "role": role_name,
            "description": DYNAMIC_ROLE_REGISTRY[role_name]["description"],
            "default_permissions": payload.permissions,
        }
    )


@router.delete("/roles/catalog/{role_name}", status_code=status.HTTP_200_OK)
async def delete_custom_role_preset(
    request: Request,
    role_name: str,
    current_user: User = Depends(RequireRole(["SUPER_ADMIN"]))
):
    """Allows Super Admin to delete a dynamic role preset from the catalog."""
    target_key = None
    for k in DYNAMIC_ROLE_REGISTRY.keys():
        if k.lower() == role_name.lower():
            target_key = k
            break

    if not target_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role '{role_name}' not found in catalog.")

    if target_key.upper() == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The root 'SUPER_ADMIN' role cannot be deleted."
        )

    del DYNAMIC_ROLE_REGISTRY[target_key]
    if target_key in DEFAULT_ROLE_PERMISSIONS:
        del DEFAULT_ROLE_PERMISSIONS[target_key]

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message=f"Dynamic role '{target_key}' was successfully removed from the catalog.",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=None
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPER_ADMIN"]))
):
    # Check if user with email already exists
    result = await db.execute(select(User).where(User.email == payload.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    # Hash the password and create the user object
    hashed_password = get_password_hash(payload.password)
    
    # Store explicit permissions if provided, else None/empty
    permissions_str = ",".join(payload.permissions) if payload.permissions is not None else ""

    new_user = User(
        email=payload.email,
        hashed_password=hashed_password,
        role=payload.role,
        permissions=permissions_str,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-201",
        statusCode=201,
        status="CREATED",
        message="User created successfully",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=_format_user_out(new_user)
    )


@router.get("")
async def list_users(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPER_ADMIN", "ADMIN"]))
):
    result = await db.execute(select(User).order_by(User.id).offset(skip).limit(limit))
    users = result.scalars().all()
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="Fetched users",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=[_format_user_out(u) for u in users]
    )


@router.put("/{user_id}/role")
async def update_user_role_and_permissions(
    request: Request,
    user_id: str,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPER_ADMIN"]))
):
    """
    Super Admin can dynamically give or take any role, modify granular permissions,
    or toggle active/suspended status for a user.
    """
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    # Guard: prevent superadmin from accidentally removing their own superadmin privileges
    if str(target_user.id) == str(current_user.id):
        if payload.role is not None and payload.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot revoke your own Super Admin role."
            )
        if payload.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own Super Admin account."
            )

    if payload.role is not None:
        target_user.role = payload.role

    if payload.permissions is not None:
        target_user.permissions = ",".join(payload.permissions)

    if payload.is_active is not None:
        target_user.is_active = payload.is_active

    await db.commit()
    await db.refresh(target_user)

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="User updated successfully",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=_format_user_out(target_user)
    )


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    request: Request,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPER_ADMIN"]))
):
    """Super Admin can delete a user account from the system."""
    if user_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own Super Admin account."
        )

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    await db.delete(target_user)
    await db.commit()

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message=f"User account {target_user.email} successfully deleted.",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=None
    )


@router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPER_ADMIN", "AUDITOR"]))
):
    """Returns the system audit logs."""
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="OK",
        message="Fetched audit logs",
        requestId=getattr(request.state, "request_id", "req-id-none"),
        data=[AuditLogOut.model_validate(log) for log in logs]
    )
