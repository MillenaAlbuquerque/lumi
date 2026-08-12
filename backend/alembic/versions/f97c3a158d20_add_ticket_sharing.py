"""add ticket sharing

Revision ID: f97c3a158d20
Revises: e4b82671cc2a
"""
from alembic import op
import sqlalchemy as sa

revision = "f97c3a158d20"
down_revision = "e4b82671cc2a"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("tickets", sa.Column("share_token_hash", sa.String(64), nullable=True))
    op.add_column("tickets", sa.Column("share_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint("uq_tickets_share_token_hash", "tickets", ["share_token_hash"])

def downgrade() -> None:
    op.drop_constraint("uq_tickets_share_token_hash", "tickets", type_="unique")
    op.drop_column("tickets", "share_expires_at")
    op.drop_column("tickets", "share_token_hash")
