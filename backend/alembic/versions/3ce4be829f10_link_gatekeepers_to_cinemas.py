"""link gatekeepers to cinemas

Revision ID: 3ce4be829f10
Revises: f2a390bac283
"""

from alembic import op
import sqlalchemy as sa


revision = "3ce4be829f10"
down_revision = "f2a390bac283"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cinema_gatekeepers",
        sa.Column("cinema_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["cinema_id"], ["cinemas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("cinema_id", "user_id"),
        sa.UniqueConstraint("user_id", name="uq_cinema_gatekeepers_user_id"),
    )


def downgrade() -> None:
    op.drop_table("cinema_gatekeepers")
