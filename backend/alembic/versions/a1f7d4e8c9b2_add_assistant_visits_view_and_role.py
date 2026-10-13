"""Add assistant_visits view and assistant_ro role

Revision ID: a1f7d4e8c9b2
Revises: 602bdb131add
Create Date: 2026-10-12 03:00:00.000000

"""
import os
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1f7d4e8c9b2'
down_revision = '602bdb131add'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create or replace the aggregated view without any visitor personal identifiers (no names, emails, phones, badges)
    op.execute("""
    CREATE OR REPLACE VIEW assistant_visits AS
    SELECT 
        a.id AS id,
        a.status::text AS status,
        COALESCE(NULLIF(SUBSTRING(a.notes FROM 'Purpose:\\s*([^\\r\\n]+)'), ''), 'General Visit') AS purpose,
        a.scheduled_time AS scheduled_time,
        a.created_at AS created_at,
        a.checked_in_at AS checked_in_at,
        a.admitted_at AS admitted_at,
        a.checked_out_at AS completed_at,
        a.host_id AS host_id,
        e.department AS host_department,
        TRIM(SPLIT_PART(e.department, '(', 1)) AS clean_department,
        CASE 
            WHEN v.email ILIKE 'walkin_%' THEN 'walk_in' 
            ELSE 'pre_registered' 
        END AS source,
        a.visitor_id AS visitor_id,
        a.updated_at AS updated_at,
        a.notes AS notes
    FROM appointments a
    JOIN employees e ON a.host_id = e.id
    JOIN visitors v ON a.visitor_id = v.id;
    """)

    # 2. Safely create or update the dedicated read-only role with password from environment
    password = os.environ.get("ASSISTANT_RO_PASSWORD", "assistant_ro_secret")
    safe_password = password.replace("'", "''")

    op.execute(f"""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'assistant_ro') THEN
            CREATE ROLE assistant_ro WITH LOGIN PASSWORD '{safe_password}';
        ELSE
            ALTER ROLE assistant_ro WITH PASSWORD '{safe_password}';
        END IF;
    END
    $$;
    """)

    # Configure session guards on the role
    op.execute("ALTER ROLE assistant_ro SET statement_timeout = '5s';")
    op.execute("ALTER ROLE assistant_ro SET default_transaction_read_only = on;")

    # 3. Privilege isolation: Grant SELECT strictly to assistant_visits view and host shift/holiday metadata
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM assistant_ro;")
    op.execute("REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM assistant_ro;")
    op.execute("REVOKE CREATE ON SCHEMA public FROM assistant_ro;")
    op.execute("GRANT USAGE ON SCHEMA public TO assistant_ro;")
    op.execute("GRANT SELECT ON assistant_visits TO assistant_ro;")
    op.execute("GRANT SELECT ON host_shifts TO assistant_ro;")
    op.execute("GRANT SELECT ON host_holidays TO assistant_ro;")
    op.execute("GRANT SELECT ON employees TO assistant_ro;")


def downgrade() -> None:
    op.execute("REVOKE ALL ON assistant_visits FROM assistant_ro;")
    op.execute("REVOKE ALL ON host_shifts FROM assistant_ro;")
    op.execute("REVOKE ALL ON host_holidays FROM assistant_ro;")
    op.execute("REVOKE ALL ON employees FROM assistant_ro;")
    op.execute("DROP VIEW IF EXISTS assistant_visits;")
    op.execute("DROP ROLE IF EXISTS assistant_ro;")
