"""add ticket used timestamp

Revision ID: e4b82671cc2a
Revises: c31a70f2d981
"""
from alembic import op
import sqlalchemy as sa


revision = "e4b82671cc2a"
down_revision = "c31a70f2d981"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("used_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("tickets", "used_at")
