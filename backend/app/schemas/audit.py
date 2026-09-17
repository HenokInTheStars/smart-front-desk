from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    action: str
    detail: Optional[str] = None
    tag: Optional[str] = None
    user_id: Optional[UUID] = None
    created_at: datetime
