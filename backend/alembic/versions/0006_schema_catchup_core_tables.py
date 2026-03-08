"""schema catchup for core watch/alert tables

Revision ID: 0006_catchup_core
Revises: 0005_add_idempotency_records
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_catchup_core"
down_revision = "0005_add_idempotency_records"
branch_labels = None
depends_on = None


def _table_names(conn) -> set[str]:
    insp = sa.inspect(conn)
    return set(insp.get_table_names())


def upgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    if "flight_watch" not in tables:
        op.create_table(
            "flight_watch",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("origin_iata", sa.String(length=3), nullable=False),
            sa.Column("destination_iata", sa.String(length=3), nullable=False),
            sa.Column("travel_date_local", sa.Date(), nullable=False),
            sa.Column("target_price", sa.Numeric(10, 2), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
            sa.Column("is_paused", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )
        op.create_index("ix_flight_watch_user_id", "flight_watch", ["user_id"])

    if "price_snapshot" not in tables:
        op.create_table(
            "price_snapshot",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("watch_id", sa.String(length=36), nullable=False),
            sa.Column("captured_at_utc", sa.DateTime(), nullable=False),
            sa.Column("departure_time_local", sa.String(length=5), nullable=True),
            sa.Column("raw_price", sa.Numeric(10, 2), nullable=False),
            sa.Column("raw_currency", sa.String(length=3), nullable=False, server_default="EUR"),
            sa.Column("provider", sa.String(length=40), nullable=False, server_default="ryanair-py"),
            sa.Column("is_stale", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.ForeignKeyConstraint(["watch_id"], ["flight_watch.id"]),
        )
        op.create_index("ix_price_snapshot_watch_id", "price_snapshot", ["watch_id"])

    if "alert_rule" not in tables:
        op.create_table(
            "alert_rule",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("watch_id", sa.String(length=36), nullable=False),
            sa.Column("rule_type", sa.String(length=30), nullable=False),
            sa.Column("threshold_value", sa.Numeric(10, 2), nullable=True),
            sa.Column("notify_on_every_change", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("cooldown_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["watch_id"], ["flight_watch.id"]),
        )
        op.create_index("ix_alert_rule_watch_id", "alert_rule", ["watch_id"])

    if "notification_event" not in tables:
        op.create_table(
            "notification_event",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("rule_id", sa.String(length=36), nullable=False),
            sa.Column("channel", sa.String(length=20), nullable=False, server_default="in_app"),
            sa.Column("delivery_status", sa.String(length=20), nullable=False, server_default="queued"),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["rule_id"], ["alert_rule.id"]),
        )
        op.create_index("ix_notification_event_rule_id", "notification_event", ["rule_id"])

    if "user_preference" not in tables:
        op.create_table(
            "user_preference",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("default_radius_km", sa.Integer(), nullable=False, server_default="150"),
            sa.Column("include_stops_default", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("avoid_departure_before", sa.String(length=5), nullable=True),
            sa.Column("preferred_currency", sa.String(length=3), nullable=False, server_default="EUR"),
            sa.Column("language", sa.String(length=8), nullable=False, server_default="es"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )
        op.create_index("ix_user_preference_user_id", "user_preference", ["user_id"], unique=True)

    if "suggestion" not in tables:
        op.create_table(
            "suggestion",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), nullable=True),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("locale", sa.String(length=8), nullable=False, server_default="es"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )


def downgrade() -> None:
    conn = op.get_bind()
    tables = _table_names(conn)

    if "suggestion" in tables:
        op.drop_table("suggestion")
    if "user_preference" in tables:
        op.drop_index("ix_user_preference_user_id", table_name="user_preference")
        op.drop_table("user_preference")
    if "notification_event" in tables:
        op.drop_index("ix_notification_event_rule_id", table_name="notification_event")
        op.drop_table("notification_event")
    if "alert_rule" in tables:
        op.drop_index("ix_alert_rule_watch_id", table_name="alert_rule")
        op.drop_table("alert_rule")
    if "price_snapshot" in tables:
        op.drop_index("ix_price_snapshot_watch_id", table_name="price_snapshot")
        op.drop_table("price_snapshot")
    if "flight_watch" in tables:
        op.drop_index("ix_flight_watch_user_id", table_name="flight_watch")
        op.drop_table("flight_watch")
