"""add gatekeeper audit to tickets

Revision ID: d42a9f0c1e73
Revises: a19df682ce40
"""
from alembic import op
import sqlalchemy as sa

revision = "d42a9f0c1e73"
down_revision = "a19df682ce40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("used_by_id", sa.Integer(), nullable=True))
    op.create_index("ix_tickets_used_by_id", "tickets", ["used_by_id"], unique=False)
    op.create_foreign_key(
        "fk_tickets_used_by_id_users",
        "tickets",
        "users",
        ["used_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tickets_used_by_id_users", "tickets", type_="foreignkey")
    op.drop_index("ix_tickets_used_by_id", table_name="tickets")
    op.drop_column("tickets", "used_by_id")
