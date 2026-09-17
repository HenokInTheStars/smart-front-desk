"""add_needs_reassignment_to_enum

Revision ID: 64d66e4ea85e
Revises: 5efb14b04778
Create Date: 2026-09-17 16:01:31.892405

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '64d66e4ea85e'
down_revision = '5efb14b04778'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE appointment_status_enum ADD VALUE 'NEEDS_REASSIGNMENT'")


def downgrade() -> None:
    pass
