"""remove legacy rooms and require room cinema

Revision ID: f2a390bac283
Revises: dd47e20721d1
"""

from alembic import op


revision = "f2a390bac283"
down_revision = "dd47e20721d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Explicit product decision: rooms created before Cinema ownership are obsolete.
    op.execute(
        "DELETE FROM seats WHERE room_id IN "
        "(SELECT id FROM rooms WHERE cinema_id IS NULL)"
    )
    op.execute("DELETE FROM rooms WHERE cinema_id IS NULL")
    op.alter_column("rooms", "cinema_id", nullable=False)


def downgrade() -> None:
    op.alter_column("rooms", "cinema_id", nullable=True)
