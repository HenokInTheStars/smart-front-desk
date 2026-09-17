---
name: matrix-standards
description: Enforces Matrix Coding Standards for the Smart Front Desk project, particularly database schema rules (UUIDs, TIMESTAMPTZ, Enums) and API standard JSON envelopes.
---

# Matrix Coding Standards

You are working on the Smart Front Desk System, which must strictly adhere to the **Matrix Coding Standards**.

When writing or modifying code in this workspace, you MUST follow these rules:

## 1. Database Standards (PostgreSQL / SQLAlchemy)

- **Primary Keys**: ALL database tables MUST use `UUID` as their primary key. Never use integers.
  - SQLAlchemy example: `id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))`
- **Timestamps**: ALL tables MUST include `created_at` and `updated_at` columns.
  - Use timezone-aware datetimes stored in UTC.
  - SQLAlchemy example: 
    ```python
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    ```
- **Enums**: Fields representing status, role, or states MUST use SQLAlchemy `Enum`. Do not use plain Strings.
  - Name the enum with the `{context}_enum` convention (e.g., `appointment_status_enum`).
  - All enum values MUST be UPPERCASE.

## 2. API Response Standards (FastAPI)

- **Standard JSON Envelope**: ALL API responses MUST be wrapped in a standard JSON envelope. Do not return raw data objects or simple message strings directly.
- The standard envelope MUST follow this structure:
  ```json
  {
    "internalCode": "SUCCESS-200",
    "statusCode": 200,
    "status": "SUCCESS",
    "message": "Human readable message",
    "requestId": "unique-id-from-middleware",
    "timestamp": "ISO-8601-UTC",
    "data": { ... your payload ... }
  }
  ```
- Make sure to use the `StandardResponseEnvelope` generic schema defined in `backend/app/schemas/responses.py` for API routes.

Adherence to these standards is mandatory for all commits in this repository.
