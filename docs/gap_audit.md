---
version: 1.0.0
last_updated: 2026-09-14
status: Draft
author: Matrix
---

# Smart Front Desk: Detailed Gap Audit

## Overview
This document serves as a detailed audit of the Smart Front Desk codebase against the **Matrix Coding Standards**. Since this project is in its early phases, several implementations currently drift from our strict guidelines. 

This guide is designed to help developers (especially junior members) understand *what* is wrong, *why* it's wrong, and *how* to fix it.

---

## 1. Database Standards (PostgreSQL)
**Reference:** Matrix Database Standards (PostgreSQL)

### Gap 1.1: Primary Keys are Integers, not UUIDs
- **Current State:** In `backend/app/db/models.py`, all models (e.g., `User`, `Employee`, `Visitor`, `Appointment`) use `Integer` for their `id` primary keys.
- **Matrix Standard:** All primary keys MUST use `UUID` with `gen_random_uuid()` via the `pgcrypto` extension. `SERIAL` or `BIGSERIAL` (integers) are strictly prohibited.
- **How to Fix:**
  Update the SQLAlchemy models to use `UUID` for IDs.
  ```python
  from sqlalchemy.dialects.postgresql import UUID
  from sqlalchemy import text

  class User(Base):
      __tablename__ = "users"
      id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
  ```
  *(Note: You will need to recreate your Alembic migrations for this breaking change).*

### Gap 1.2: Timestamps are missing Timezones (TIMESTAMPTZ) and Audit Columns
- **Current State:** Models use `DateTime` for `created_at` but lack timezone awareness. Furthermore, the `updated_at` column is entirely missing across the board.
- **Matrix Standard:** Always use `TIMESTAMPTZ` (TIMESTAMP WITH TIME ZONE) and store in UTC. Every table MUST have `created_at` and `updated_at`.
- **How to Fix:**
  Update the imports and model definitions:
  ```python
  from sqlalchemy import DateTime
  from sqlalchemy.sql import func

  # Example implementation for a model
  created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
  updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
  ```

### Gap 1.3: String Fields used instead of Enums
- **Current State:** `User.role` and `Appointment.status` use plain `String` columns with default string values (e.g., `"Scheduled"`, `"Other"`).
- **Matrix Standard:** Enums must be used with the naming convention `{context}_enum` (e.g., `appointment_status_enum`), and all values MUST be UPPERCASE.
- **How to Fix:**
  Define proper SQLAlchemy Enums.
  ```python
  from sqlalchemy import Enum
  
  appointment_status_enum = Enum('SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', name='appointment_status_enum')
  status = Column(appointment_status_enum, nullable=False, default='SCHEDULED')
  ```

---

## 2. API & Workspace Standards
**Reference:** Matrix API & Workspace Standards

### Gap 2.1: API Responses do not use the Standard JSON Envelope
- **Current State:** In `backend/app/routers/visitors.py`, endpoints return raw JSON like `{"message": "Check-in successful", "visitor_id": 1}`.
- **Matrix Standard:** ALL API responses must return the standard envelope:
  ```json
  {
    "internalCode": "SUCCESS-200",
    "statusCode": 200,
    "status": "SUCCESS",
    "message": "Human readable message",
    "requestId": "unique-id",
    "timestamp": "ISO-8601-UTC",
    "data": { ... payload here ... } 
  }
  ```
- **How to Fix:**
  Create a unified response model/utility function in `backend/app/schemas/` that wraps all outgoing responses. You will also need a middleware to generate a unique `requestId` for every incoming request.

### Gap 2.2: Workspace Hygiene
- **Current State:** The backend root contains `.env.example`.
- **Matrix Standard:** Configuration should use split-mode configuration in a `./config/` directory (e.g., `.env.common.*` and `.env.sensitive.*`).
- **How to Fix:**
  Move environment management to a dedicated `config/` directory inside the backend or at the project root, depending on the monorepo strategy.

---

## Next Steps for Developers
1. **Database Refactor:** Delete the current local database/migrations. Update `models.py` with UUIDs, `TIMESTAMPTZ`, `updated_at`, and Enums. Generate a fresh Alembic migration.
2. **API Refactor:** Implement the Standard Response Envelope schema and update `routers/visitors.py` to wrap its successful and error responses.
3. **Workspace Organization:** Move configuration files into `./config/`.
