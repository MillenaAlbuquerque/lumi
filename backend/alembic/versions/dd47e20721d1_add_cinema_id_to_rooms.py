"""add cinema_id to rooms

Revision ID: dd47e20721d1
Revises: 8bc174c22bc1
"""

from alembic import op
import sqlalchemy as sa


revision = "dd47e20721d1"
down_revision = "8bc174c22bc1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("cinema_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_rooms_cinema_id_cinemas",
        "rooms",
        "cinemas",
        ["cinema_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint("rooms_name_key", "rooms", type_="unique")
    op.create_unique_constraint("uq_room_cinema_name", "rooms", ["cinema_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_room_cinema_name", "rooms", type_="unique")
    op.create_unique_constraint("rooms_name_key", "rooms", ["name"])
    op.drop_constraint("fk_rooms_cinema_id_cinemas", "rooms", type_="foreignkey")
    op.drop_column("rooms", "cinema_id")
