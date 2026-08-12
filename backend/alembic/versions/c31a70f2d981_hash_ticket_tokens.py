"""store only ticket token hashes

Revision ID: c31a70f2d981
Revises: b75e60a91c42
"""
import hashlib

from alembic import op
import sqlalchemy as sa


revision = "c31a70f2d981"
down_revision = "b75e60a91c42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("tickets", "code", type_=sa.String(length=64), existing_nullable=False)
    connection = op.get_bind()
    tickets = sa.table("tickets", sa.column("id", sa.Integer), sa.column("code", sa.String))
    for ticket_id, code in connection.execute(sa.select(tickets.c.id, tickets.c.code)):
        connection.execute(
            tickets.update()
            .where(tickets.c.id == ticket_id)
            .values(code=hashlib.sha256(code.encode("utf-8")).hexdigest())
        )
    op.alter_column("tickets", "code", new_column_name="token_hash", existing_type=sa.String(64))


def downgrade() -> None:
    op.alter_column("tickets", "token_hash", new_column_name="code", existing_type=sa.String(64))
