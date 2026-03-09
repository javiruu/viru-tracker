"""add ux events table

Revision ID: 0009_ux_events
Revises: 0008_watchlist_unique
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0009_ux_events"
down_revision = "0008_watchlist_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    tables = set(sa.inspect(conn).get_table_names())
    if "ux_event" in tables:
        return

    op.create_table(
        "ux_event",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("event_name", sa.String(length=64), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ux_event_event_name", "ux_event", ["event_name"], unique=False)
    op.create_index("ix_ux_event_user_id", "ux_event", ["user_id"], unique=False)
    op.create_index("ix_ux_event_created_at", "ux_event", ["created_at"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    tables = set(sa.inspect(conn).get_table_names())
    if "ux_event" not in tables:
        return
    op.drop_index("ix_ux_event_created_at", table_name="ux_event")
    op.drop_index("ix_ux_event_user_id", table_name="ux_event")
    op.drop_index("ix_ux_event_event_name", table_name="ux_event")
    op.drop_table("ux_event")
