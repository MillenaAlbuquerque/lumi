"""add projection type to events

Revision ID: aa2d297fb0f4
Revises: 3ce4be829f10
"""

from alembic import op
import sqlalchemy as sa


revision = "aa2d297fb0f4"
down_revision = "3ce4be829f10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("projection_type", sa.String(length=10), server_default="2D", nullable=False))
    op.alter_column("events", "projection_type", server_default=None)


def downgrade() -> None:
    op.drop_column("events", "projection_type")
