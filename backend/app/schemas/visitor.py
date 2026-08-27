from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class VisitorBase(BaseModel):
    first_name: str
    last_name: str
    company: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class VisitorCreate(VisitorBase):
    pass


class VisitorUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


class VisitorOut(VisitorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
