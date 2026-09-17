from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

# 1. The data shape expected when a user logs in
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# 2. The data shape returned after a successful login
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# 3. The data shape expected when refreshing an expired token
class RefreshRequest(BaseModel):
    refresh_token: str

# 4. The data shape returned when a new token is issued
class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 5. The data shape representing the currently logged-in user
class CurrentUser(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    numeric_host_id: Optional[uuid.UUID] = None
    is_active: bool = True
    role: str = "Host"
    permissions: list[str] = []
    phone: Optional[str] = None
    availability_status: int = 1

# 6. The data shape expected when updating the profile
class ProfileUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    availability_status: Optional[int] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None