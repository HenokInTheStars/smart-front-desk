from pydantic import BaseModel, EmailStr
from typing import Optional

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
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    role: str = "employee"