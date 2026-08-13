"""allow resale of cancelled ticket seats

Revision ID: a19df682ce40
Revises: 6bd7c41a209e
"""
from alembic import op

revision = "a19df682ce40"
down_revision = "6bd7c41a209e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_reservation_seat_event_seat", "reservation_seats", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint(
        "uq_reservation_seat_event_seat",
        "reservation_seats",
        ["event_id", "seat_id"],
    )
