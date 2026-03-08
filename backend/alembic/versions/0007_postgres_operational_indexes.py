"""postgres operational indexes

Revision ID: 0007_pg_ops_idx
Revises: 0006_catchup_core
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_pg_ops_idx"
down_revision = "0006_catchup_core"
branch_labels = None
depends_on = None


INDEX_SPECS = [
    ("ix_flight_watch_user_status_paused_created", "flight_watch", ["user_id", "status", "is_paused", "created_at"]),
    ("ix_price_snapshot_watch_captured", "price_snapshot", ["watch_id", "captured_at_utc"]),
    ("ix_alert_rule_watch_enabled", "alert_rule", ["watch_id", "enabled"]),
    ("ix_notification_event_rule_created", "notification_event", ["rule_id", "created_at"]),
    ("ix_user_session_user_active_last_seen", "user_session", ["user_id", "is_active", "last_seen"]),
    ("ix_security_activity_user_created", "security_activity", ["user_id", "created_at"]),
    ("ix_idempotency_record_created_at", "idempotency_record", ["created_at"]),
]


def _index_names(conn, table_name: str) -> set[str]:
    insp = sa.inspect(conn)
    return {idx["name"] for idx in insp.get_indexes(table_name)}


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())

    for idx_name, table_name, cols in INDEX_SPECS:
        if table_name not in tables:
            continue
        if idx_name in _index_names(conn, table_name):
            continue
        op.create_index(idx_name, table_name, cols)


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())

    for idx_name, table_name, _cols in reversed(INDEX_SPECS):
        if table_name not in tables:
            continue
        if idx_name in _index_names(conn, table_name):
            op.drop_index(idx_name, table_name=table_name)
