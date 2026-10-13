"""add_missing_user_and_audit_columns

Revision ID: e5b2c7d9a4f1
Revises: c3d9e8f7a1b2
Create Date: 2026-10-13 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = 'e5b2c7d9a4f1'
down_revision = 'c3d9e8f7a1b2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1. users table
    user_cols = {c['name']: c for c in insp.get_columns('users')}
    if 'custom_role_name' not in user_cols:
        op.add_column('users', sa.Column('custom_role_name', sa.String(), nullable=True))
    elif str(user_cols['custom_role_name']['type']).upper() == 'TEXT':
        op.alter_column('users', 'custom_role_name',
                        existing_type=sa.TEXT(),
                        type_=sa.String(),
                        existing_nullable=True)

    if 'description' not in user_cols:
        op.add_column('users', sa.Column('description', sa.Text(), nullable=True))

    if 'preferences' not in user_cols:
        op.add_column('users', sa.Column('preferences', JSONB(), server_default='{}', nullable=False))

    # 2. audit_logs table
    audit_cols = {c['name']: c for c in insp.get_columns('audit_logs')}
    if 'host_id' not in audit_cols:
        op.add_column('audit_logs', sa.Column('host_id', sa.UUID(), sa.ForeignKey('employees.id'), nullable=True))
    if 'ip_address' not in audit_cols:
        op.add_column('audit_logs', sa.Column('ip_address', sa.String(), nullable=True))
    if 'node_id' not in audit_cols:
        op.add_column('audit_logs', sa.Column('node_id', sa.String(), nullable=True))
    if 'anomaly_flag' not in audit_cols:
        op.add_column('audit_logs', sa.Column('anomaly_flag', sa.Boolean(), server_default='false', nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    audit_cols = {c['name'] for c in insp.get_columns('audit_logs')}
    if 'anomaly_flag' in audit_cols:
        op.drop_column('audit_logs', 'anomaly_flag')
    if 'node_id' in audit_cols:
        op.drop_column('audit_logs', 'node_id')
    if 'ip_address' in audit_cols:
        op.drop_column('audit_logs', 'ip_address')
    if 'host_id' in audit_cols:
        op.drop_column('audit_logs', 'host_id')

    user_cols = {c['name'] for c in insp.get_columns('users')}
    if 'preferences' in user_cols:
        op.drop_column('users', 'preferences')
    if 'description' in user_cols:
        op.drop_column('users', 'description')
