---
version: 1.0.0
last_updated: 2026-09-14
status: Draft
author: Matrix
---

# Database Schema & Standards

## Overview
This document outlines the database standards applied to the Smart Front Desk project, based on the Matrix Database Standards (PostgreSQL).

## Standard Requirements

### Primary Keys (UUID)
- **Mandatory**: `UUID` for all primary keys.
- **Generation**: `gen_random_uuid()` via `pgcrypto` extension.
- **Example**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`

### Timestamps (TIMESTAMPTZ)
- All timestamp columns must use `TIMESTAMPTZ` (TIMESTAMP WITH TIME ZONE).
- **Required Columns**:
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **Soft Deletes**:
  - `deleted_at TIMESTAMPTZ`

### Naming Conventions
- **Tables**: lowercase snake_case, plural nouns (e.g., `visitors`, `appointments`).
- **Columns**: lowercase snake_case.
- **Foreign Keys**: `singular_entity_id` (e.g., `visitor_id`).
- **Enums**: `{context}_enum` (e.g., `appointment_status_enum`), values UPPERCASE.
- **Indexes**: `idx_{table}_{column}`. Unique: `uidx_{table}_{column}`.

## Schema Implementation
*(This section will be populated with specific table schemas once confirmed against Alembic migrations.)*
