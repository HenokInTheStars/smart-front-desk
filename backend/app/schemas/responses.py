from typing import Generic, TypeVar, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

T = TypeVar("T")

class StandardResponseEnvelope(BaseModel, Generic[T]):
    internalCode: str
    statusCode: int
    status: str
    message: str
    requestId: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: T | None = None
