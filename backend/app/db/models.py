import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum,
    text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func

user_role_enum = Enum("SUPER_ADMIN", "ADMIN", "HOST", "RECEPTION", "OTHER", name="user_role_enum")
appointment_status_enum = Enum("SCHEDULED", "EXPECTED", "CHECKED_IN", "IN_MEETING", "COMPLETED", "CANCELLED", "NEEDS_REASSIGNMENT", name="appointment_status_enum")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(user_role_enum, default="OTHER", nullable=False)  # Super Admin, Admin, Host, Reception, Other
    permissions = Column(Text, default="", nullable=True)  # Comma-separated or custom capability keys
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    employee_profile = relationship("Employee", back_populates="user", uselist=False)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, index=True, nullable=False)
    department = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    availability_status = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="employee_profile")
    appointments = relationship("Appointment", back_populates="host")
    shifts = relationship("HostShift", back_populates="employee", cascade="all, delete-orphan")
    holidays = relationship("HostHoliday", back_populates="employee", cascade="all, delete-orphan")


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    badge_token = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    appointments = relationship("Appointment", back_populates="visitor")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    visitor_id = Column(UUID(as_uuid=True), ForeignKey("visitors.id"), nullable=False)
    host_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(appointment_status_enum, default="SCHEDULED", nullable=False)  # Scheduled, Checked In, Completed, Cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    visitor = relationship("Visitor", back_populates="appointments")
    host = relationship("Employee", back_populates="appointments")

class HostShift(Base):
    __tablename__ = "host_shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(String, nullable=False)  # "08:00"
    end_time = Column(String, nullable=False)  # "17:00"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="shifts")


class HostHoliday(Base):
    __tablename__ = "host_holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    date = Column(String, nullable=False)  # "YYYY-MM-DD"
    reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="holidays")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    action = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    tag = Column(String, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")