"""add_appointment_source_enum

Revision ID: f8a3c1d2e4b5
Revises: e5b2c7d9a4f1
Create Date: 2026-10-13 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f8a3c1d2e4b5'
down_revision = 'e5b2c7d9a4f1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1. Guarded creation of appointment_source_enum
    enum_exists = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'appointment_source_enum'")).scalar()
    if not enum_exists:
        op.execute("CREATE TYPE appointment_source_enum AS ENUM ('WALK_IN', 'PRE_REGISTERED', 'MANUAL');")

    # 2. Guarded addition of source column to appointments
    apt_cols = {c['name'] for c in insp.get_columns('appointments')}
    if 'source' not in apt_cols:
        op.execute("ALTER TABLE appointments ADD COLUMN source appointment_source_enum DEFAULT 'WALK_IN' NOT NULL;")

    # 3. Backfill existing appointments
    # BACKFILL HEURISTIC AND LIMITATIONS:
    # Heuristic:
    # 1. Appointments where scheduled_time > created_at + interval '1 minute' are categorized as PRE_REGISTERED.
    # 2. Appointments where notes contain '[PHOTO_CAPTURED]' (captured via reception webcam) are categorized as MANUAL.
    # 3. All other appointments (on-site arrivals scheduled at creation time) default to WALK_IN.
    #
    # Known Limitations:
    # 1. Any pre-registered appointment scheduled immediately for the current minute (scheduled_time <= created_at + 1 min)
    #    will be heuristically classified as WALK_IN.
    # 2. Any manual check-in performed by reception without capturing a visitor photo will lack '[PHOTO_CAPTURED]'
    #    and will be heuristically classified as WALK_IN.
    # 3. Seed/demo data rows where scheduled_time was backdated or future-dated independently of creation time
    #    may not reflect their intended origin and should be updated explicitly via development seed scripts.
    op.execute("""
    UPDATE appointments a
    SET source = CASE
        WHEN a.scheduled_time > a.created_at + interval '1 minute' THEN 'PRE_REGISTERED'::appointment_source_enum
        WHEN a.notes LIKE '%[PHOTO_CAPTURED]%' THEN 'MANUAL'::appointment_source_enum
        ELSE 'WALK_IN'::appointment_source_enum
    END;
    """)

    # 4. Update assistant_visits view to select a.source::text
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
        a.source::text AS source,
        a.visitor_id AS visitor_id,
        a.updated_at AS updated_at,
        a.notes AS notes
    FROM appointments a
    JOIN employees e ON a.host_id = e.id
    JOIN visitors v ON a.visitor_id = v.id;
    """)

    # 5. Ensure assistant_ro role has SELECT privileges on view
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'assistant_ro') THEN
            GRANT SELECT ON assistant_visits TO assistant_ro;
        END IF;
    END
    $$;
    """)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1. Revert assistant_visits view to email-prefix heuristic
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

    # 2. Drop source column from appointments if it exists
    apt_cols = {c['name'] for c in insp.get_columns('appointments')}
    if 'source' in apt_cols:
        op.drop_column('appointments', 'source')

    # 3. Drop enum if exists
    enum_exists = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'appointment_source_enum'")).scalar()
    if enum_exists:
        op.execute("DROP TYPE IF EXISTS appointment_source_enum;")
