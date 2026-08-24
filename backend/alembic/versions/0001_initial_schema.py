"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-24

DRAFT SCHEMA — inferred from project context, not yet verified against
Section 6 of implementation_plan.md (that document was not available when
this migration was written). Review against the real spec before treating
this as frozen.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------
    # Extensions (idempotent — also enabled by backend/scripts/init.sql
    # on first container boot, but repeated here so this migration is
    # reproducible against any fresh Postgres instance, e.g. in CI).
    # ---------------------------------------------------------------
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm";')
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # ---------------------------------------------------------------
    # Core directory: departments, employees, auth
    # ---------------------------------------------------------------
    op.execute("""
        CREATE TABLE departments (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name        TEXT NOT NULL UNIQUE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE employees (
            id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
            first_name     TEXT NOT NULL,
            last_name      TEXT NOT NULL,
            email          TEXT NOT NULL UNIQUE,
            phone          TEXT,
            title          TEXT,
            role           TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
            password_hash  TEXT NOT NULL,
            is_active      BOOLEAN NOT NULL DEFAULT true,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE refresh_tokens (
            id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            token_hash   TEXT NOT NULL UNIQUE,
            expires_at   TIMESTAMPTZ NOT NULL,
            revoked_at   TIMESTAMPTZ,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ---------------------------------------------------------------
    # Visitors, kiosks, visits, appointments
    # ---------------------------------------------------------------
    op.execute("""
        CREATE TABLE visitors (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            first_name  TEXT NOT NULL,
            last_name   TEXT NOT NULL,
            company     TEXT,
            email       TEXT,
            phone       TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE kiosk_devices (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name        TEXT NOT NULL,
            location    TEXT,
            is_active   BOOLEAN NOT NULL DEFAULT true,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE visits (
            id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            visitor_id        UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
            host_employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
            kiosk_device_id   UUID REFERENCES kiosk_devices(id) ON DELETE SET NULL,
            purpose           TEXT,
            badge_number      TEXT,
            status            TEXT NOT NULL DEFAULT 'checked_in'
                                  CHECK (status IN ('checked_in', 'checked_out', 'cancelled')),
            checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            checked_out_at    TIMESTAMPTZ
        );
    """)

    op.execute("""
        CREATE TABLE appointments (
            id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            visitor_id        UUID REFERENCES visitors(id) ON DELETE SET NULL,
            visitor_name      TEXT,
            visitor_email     TEXT,
            host_employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            scheduled_start   TIMESTAMPTZ NOT NULL,
            scheduled_end     TIMESTAMPTZ,
            status            TEXT NOT NULL DEFAULT 'scheduled'
                                  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
            created_by        UUID REFERENCES employees(id) ON DELETE SET NULL,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ---------------------------------------------------------------
    # AI receptionist: knowledge base + conversations
    # ---------------------------------------------------------------
    op.execute("""
        CREATE TABLE knowledge_base_documents (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title       TEXT NOT NULL,
            source      TEXT,
            content     TEXT NOT NULL,
            created_by  UUID REFERENCES employees(id) ON DELETE SET NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # NOTE: vector(1536) assumes an OpenAI text-embedding-3-small/ada-002
    # sized embedding. This is an assumption, not a confirmed spec — revisit
    # once the actual embedding model is chosen in Week 3.
    op.execute("""
        CREATE TABLE knowledge_base_chunks (
            id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id  UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
            chunk_index  INTEGER NOT NULL,
            chunk_text   TEXT NOT NULL,
            embedding    VECTOR(1536) NOT NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE ai_conversations (
            id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            visitor_id        UUID REFERENCES visitors(id) ON DELETE SET NULL,
            kiosk_device_id   UUID REFERENCES kiosk_devices(id) ON DELETE SET NULL,
            started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            ended_at          TIMESTAMPTZ
        );
    """)

    op.execute("""
        CREATE TABLE ai_messages (
            id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            conversation_id       UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
            role                  TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content               TEXT NOT NULL,
            retrieved_chunk_ids   UUID[],
            created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ---------------------------------------------------------------
    # Admin / operational: config, audit, notifications
    # ---------------------------------------------------------------
    op.execute("""
        CREATE TABLE front_desk_config (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            key         TEXT NOT NULL UNIQUE,
            value       JSONB NOT NULL,
            updated_by  UUID REFERENCES employees(id) ON DELETE SET NULL,
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE audit_log (
            id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            actor_employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
            action              TEXT NOT NULL,
            entity_type         TEXT NOT NULL,
            entity_id           UUID,
            metadata            JSONB,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE notification_log (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            visit_id      UUID REFERENCES visits(id) ON DELETE CASCADE,
            employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
            channel       TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
            status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
            sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ---------------------------------------------------------------
    # Helper functions
    # ---------------------------------------------------------------
    op.execute("""
        CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER trg_employees_updated_at
            BEFORE UPDATE ON employees
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)
    op.execute("""
        CREATE TRIGGER trg_kb_documents_updated_at
            BEFORE UPDATE ON knowledge_base_documents
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)
    op.execute("""
        CREATE TRIGGER trg_front_desk_config_updated_at
            BEFORE UPDATE ON front_desk_config
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    # Fuzzy name search over employees, using pg_trgm.
    op.execute("""
        CREATE FUNCTION search_employees(search_term TEXT)
        RETURNS SETOF employees
        LANGUAGE sql
        STABLE
        AS $$
            SELECT *
            FROM employees
            WHERE similarity(first_name || ' ' || last_name, search_term) > 0.2
            ORDER BY similarity(first_name || ' ' || last_name, search_term) DESC;
        $$;
    """)

    # ---------------------------------------------------------------
    # Indexes
    # ---------------------------------------------------------------
    # HNSW index for approximate nearest-neighbor search over embeddings.
    op.execute("""
        CREATE INDEX ix_knowledge_base_chunks_embedding_hnsw
            ON knowledge_base_chunks USING hnsw (embedding vector_cosine_ops);
    """)

    op.execute("CREATE INDEX ix_visits_visitor_id ON visits(visitor_id);")
    op.execute("CREATE INDEX ix_visits_host_employee_id ON visits(host_employee_id);")
    op.execute("CREATE INDEX ix_appointments_host_employee_id ON appointments(host_employee_id);")
    op.execute("CREATE INDEX ix_kb_chunks_document_id ON knowledge_base_chunks(document_id);")
    op.execute("CREATE INDEX ix_ai_messages_conversation_id ON ai_messages(conversation_id);")
    op.execute("CREATE INDEX ix_audit_log_actor_employee_id ON audit_log(actor_employee_id);")

    # ---------------------------------------------------------------
    # Seed rows
    # ---------------------------------------------------------------
    op.execute("INSERT INTO departments (name) VALUES ('General');")

    # Placeholder admin account — NOT a usable login. password_hash is a
    # dummy value and is_active is false until Sprint 2's auth work sets a
    # real hashed password and flips this on.
    op.execute("""
        INSERT INTO employees (department_id, first_name, last_name, email, role, password_hash, is_active)
        VALUES (
            (SELECT id FROM departments WHERE name = 'General'),
            'System', 'Administrator', 'admin@example.com', 'admin',
            'REPLACE_ME_NOT_A_REAL_HASH', false
        );
    """)

    op.execute("INSERT INTO kiosk_devices (name, location) VALUES ('Main Lobby Kiosk', 'Ground Floor Reception');")

    op.execute("""
        INSERT INTO front_desk_config (key, value) VALUES
            ('checkin_fields', '["first_name","last_name","company","purpose","host_employee_id"]'::jsonb),
            ('kiosk_idle_timeout_seconds', '60'::jsonb),
            ('business_hours', '{"open":"08:00","close":"18:00"}'::jsonb);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS notification_log;")
    op.execute("DROP TABLE IF EXISTS audit_log;")
    op.execute("DROP TABLE IF EXISTS front_desk_config;")
    op.execute("DROP TABLE IF EXISTS ai_messages;")
    op.execute("DROP TABLE IF EXISTS ai_conversations;")
    op.execute("DROP TABLE IF EXISTS knowledge_base_chunks;")
    op.execute("DROP TABLE IF EXISTS knowledge_base_documents;")
    op.execute("DROP TABLE IF EXISTS appointments;")
    op.execute("DROP TABLE IF EXISTS visits;")
    op.execute("DROP TABLE IF EXISTS kiosk_devices;")
    op.execute("DROP TABLE IF EXISTS visitors;")
    op.execute("DROP TABLE IF EXISTS refresh_tokens;")
    op.execute("DROP TABLE IF EXISTS employees;")
    op.execute("DROP TABLE IF EXISTS departments;")
    op.execute("DROP FUNCTION IF EXISTS search_employees(text);")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
