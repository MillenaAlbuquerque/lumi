"""add reservation hold expiration

Revision ID: 6bd7c41a209e
Revises: f97c3a158d20
"""
from alembic import op
import sqlalchemy as sa

revision = "6bd7c41a209e"
down_revision = "f97c3a158d20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reservations",
        sa.Column("hold_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_reservations_hold_expires_at",
        "reservations",
        ["hold_expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_reservations_hold_expires_at", table_name="reservations")
    op.drop_column("reservations", "hold_expires_at")
