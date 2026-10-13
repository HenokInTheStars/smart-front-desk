# Smart Front Desk System — Facility Overview & Architecture

## System Purpose & Scope
The Smart Front Desk System is an enterprise-grade visitor management, lobby automation, and facility security platform. It replaces manual paper sign-in logbooks, unmonitored lobby traffic, and disconnected host communication with a self-service interactive kiosk and a role-based operations portal.

## Core Architecture
- **Frontend**: Next.js 14 App Router, React, TypeScript, Tailwind CSS, Lucide Icons, and Recharts for analytical visualizations.
- **Backend**: FastAPI (Python 3.11+), asynchronous SQLAlchemy 2.0 with `asyncpg`, Alembic database migrations, and Pydantic v2 schemas.
- **Database**: PostgreSQL strictly compliant with Matrix Database Standards (UUID primary keys generated via `gen_random_uuid()`, `TIMESTAMPTZ` UTC storage, and uppercase PostgreSQL Enums).
- **Real-Time Streaming**: Server-Sent Events (SSE) via `/live/updates` for instantaneous broadcast of lobby arrival events, meeting status transitions, and emergency status.
- **AI Executive Assistant**: Read-only analytical intelligence engine with strict role-based host scoping, 5-second statement timeouts on an isolated `assistant_ro` database role, and zero visitor PII disclosure.

## Peripheral & Badge Integration
- **Self-Service Kiosk**: Full-screen web kiosk interface for visitor registration.
- **Badge Printing**: Client-side PDF badge generation formatted for standard 100mm x 62mm thermal label paper containing visitor name, host name, and check-in date for browser printing.
- **Camera Capture**: Photo capture capability during reception manual check-in.
