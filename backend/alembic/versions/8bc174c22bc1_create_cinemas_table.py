"""create cinemas table

Revision ID: 8bc174c22bc1
Revises: f83f2f9e1bb8
"""

from alembic import op
import sqlalchemy as sa


revision = "8bc174c22bc1"
down_revision = "f83f2f9e1bb8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cinemas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("organizer_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["organizer_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organizer_id"),
    )


def downgrade() -> None:
    op.drop_table("cinemas")
