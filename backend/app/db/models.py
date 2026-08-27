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
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="employee", nullable=False)  # admin, receptionist, employee
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    employee_profile = relationship("Employee", back_populates="user", uselist=False)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, index=True, nullable=False)
    department = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    user = relationship("User", back_populates="employee_profile")
    appointments = relationship("Appointment", back_populates="host")


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    badge_token = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="visitor")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=False)
    host_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(String, default="Scheduled", nullable=False)  # Scheduled, Checked In, Completed, Cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    visitor = relationship("Visitor", back_populates="appointments")
    host = relationship("Employee", back_populates="appointments")