"""add_index_appointment_checked_in_at

Revision ID: c3d9e8f7a1b2
Revises: a1f7d4e8c9b2
Create Date: 2026-10-13 10:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d9e8f7a1b2'
down_revision = 'a1f7d4e8c9b2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        'ix_appointments_checked_in_at',
        'appointments',
        ['checked_in_at'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(
        'ix_appointments_checked_in_at',
        table_name='appointments'
    )
