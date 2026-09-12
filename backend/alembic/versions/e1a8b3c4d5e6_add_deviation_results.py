"""add persistent deviation results

Revision ID: e1a8b3c4d5e6
Revises: d8f0c1d6a77b
Create Date: 2026-09-12 23:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1a8b3c4d5e6"
down_revision: Union[str, None] = "d8f0c1d6a77b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deviation_results",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("clause_title", sa.String(length=255), nullable=False),
        sa.Column("clause_text", sa.Text(), nullable=True),
        sa.Column("playbook_rule", sa.Text(), nullable=True),
        sa.Column("deviation_json", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_deviation_results_id",
        "deviation_results",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_deviation_results_document_id",
        "deviation_results",
        ["document_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_deviation_results_document_id", table_name="deviation_results")
    op.drop_index("ix_deviation_results_id", table_name="deviation_results")
    op.drop_table("deviation_results")
