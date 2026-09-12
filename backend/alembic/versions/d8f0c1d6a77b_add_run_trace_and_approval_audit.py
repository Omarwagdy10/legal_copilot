"""add run trace and approval audit"""
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union
revision='d8f0c1d6a77b'
down_revision='c4a11db05074'
branch_labels=None
depends_on=None

def upgrade():
    op.add_column('approvals', sa.Column('decided_by_user_id', sa.Integer(), nullable=True))
    op.add_column('approvals', sa.Column('comment', sa.Text(), nullable=True))
    op.create_table('runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('workflow', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('correlation_id', sa.String(length=64), nullable=False),
        sa.Column('total_steps', sa.Integer(), nullable=False),
        sa.Column('completed_steps', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'))
    op.create_index('ix_runs_correlation_id','runs',['correlation_id'],unique=False)
    op.create_table('run_steps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('run_id', sa.String(length=36), nullable=False),
        sa.Column('step_name', sa.String(length=100), nullable=False),
        sa.Column('agent_name', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'))
    op.create_index('ix_run_steps_run_id','run_steps',['run_id'],unique=False)

def downgrade():
    op.drop_index('ix_run_steps_run_id',table_name='run_steps'); op.drop_table('run_steps')
    op.drop_index('ix_runs_correlation_id',table_name='runs'); op.drop_table('runs')
    op.drop_column('approvals','comment'); op.drop_column('approvals','decided_by_user_id')
