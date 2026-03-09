"""add client error event table

Revision ID: 0010_client_error_event
Revises: 0009_ux_events
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0010_client_error_event"
down_revision = "0009_ux_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    tables = set(sa.inspect(conn).get_table_names())
    if "client_error_event" in tables:
        return

    op.create_table(
        "client_error_event",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("section", sa.String(length=64), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("stack", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_error_event_user_id", "client_error_event", ["user_id"], unique=False)
    op.create_index("ix_client_error_event_section", "client_error_event", ["section"], unique=False)
    op.create_index("ix_client_error_event_created_at", "client_error_event", ["created_at"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    tables = set(sa.inspect(conn).get_table_names())
    if "client_error_event" not in tables:
        return

    op.drop_index("ix_client_error_event_created_at", table_name="client_error_event")
    op.drop_index("ix_client_error_event_section", table_name="client_error_event")
    op.drop_index("ix_client_error_event_user_id", table_name="client_error_event")
    op.drop_table("client_error_event")
