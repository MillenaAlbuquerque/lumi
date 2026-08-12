"""rename event start_time to start_datetime

Revision ID: f83f2f9e1bb8
Revises: de1fd273a524
Create Date: 2026-08-10 16:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "f83f2f9e1bb8"
down_revision = "de1fd273a524"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("events", "start_time", new_column_name="start_datetime")


def downgrade() -> None:
    op.alter_column("events", "start_datetime", new_column_name="start_time")
