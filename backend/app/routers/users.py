from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User
from app.schemas.user import UserCreate, UserOut
from app.security import get_password_hash, RequireRole

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["Super Admin"]))
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
    
    new_user = User(
        email=payload.email,
        hashed_password=hashed_password,
        role=payload.role,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

@router.get("", response_model=list[UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequireRole(["Super Admin", "Admin"]))
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users
