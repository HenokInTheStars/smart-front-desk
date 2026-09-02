from fastapi import APIRouter, Depends, HTTPException, status
from app.security import verify_password, create_access_token, get_password_hash

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User

# (Keep your LoginRequest schema and other existing imports)

from app.schemas.auth import (
    CurrentUser,
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    TokenResponse,
)

# 1. NEW: Import the security tools we just built
from app.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])



# 2. NEW: A fake user to test our login logic before the database is connected
# MOCK_USER = {
#     "email": "admin@example.com",
#     "role": "admin",
#     # This is the bcrypt scrambled version of the password "secret123"
#     "hashed_password": get_password_hash("secret123")
# }

_NOT_IMPLEMENTED = "Not implemented yet \u2014 ships in Sprint 2"

# 3. UPDATED: The login route now checks the mock user and issues a real token
@router.post("/login")
async def login(
    payload: LoginRequest, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Search the PostgreSQL database for this exact email
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # 2. Check if the user exists AND if the password is correct
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # 3. If successful, generate the secure JWT token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer"
    }
# ---------------------------------------------------------
# The endpoints below remain unchanged as Sprint 2 scope
# ---------------------------------------------------------

@router.post("/refresh", response_model=RefreshResponse)
async def refresh(payload: RefreshRequest) -> RefreshResponse:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED)


@router.get("/me", response_model=CurrentUser)
async def me(current_user: User = Depends(get_current_user)) -> CurrentUser:
    return current_user