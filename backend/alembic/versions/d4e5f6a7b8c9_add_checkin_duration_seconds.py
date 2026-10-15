"""add_checkin_duration_seconds

Revision ID: d4e5f6a7b8c9
Revises: f8a3c1d2e4b5
Create Date: 2026-10-15 11:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'f8a3c1d2e4b5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('appointments')}
    if 'checkin_duration_seconds' not in cols:
        op.add_column('appointments', sa.Column('checkin_duration_seconds', sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns('appointments')}
    if 'checkin_duration_seconds' in cols:
        op.drop_column('appointments', 'checkin_duration_seconds')
