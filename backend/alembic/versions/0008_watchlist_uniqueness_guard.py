"""watchlist uniqueness guard

Revision ID: 0008_watchlist_unique
Revises: 0007_pg_ops_idx
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_watchlist_unique"
down_revision = "0007_pg_ops_idx"
branch_labels = None
depends_on = None

UNIQUE_NAME = "uq_flight_watch_user_route_date"


def _index_names(conn, table_name: str) -> set[str]:
    insp = sa.inspect(conn)
    return {idx["name"] for idx in insp.get_indexes(table_name)}


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())
    if "flight_watch" not in tables:
        return

    rows = conn.execute(
        sa.text(
            """
            SELECT user_id, origin_iata, destination_iata, travel_date_local, MAX(created_at) AS keep_created_at
            FROM flight_watch
            GROUP BY user_id, origin_iata, destination_iata, travel_date_local
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for row in rows:
        conn.execute(
            sa.text(
                """
                DELETE FROM flight_watch
                WHERE id IN (
                    SELECT id
                    FROM flight_watch
                    WHERE user_id = :user_id
                      AND origin_iata = :origin_iata
                      AND destination_iata = :destination_iata
                      AND travel_date_local = :travel_date_local
                      AND created_at < :keep_created_at
                )
                """
            ),
            {
                "user_id": row.user_id,
                "origin_iata": row.origin_iata,
                "destination_iata": row.destination_iata,
                "travel_date_local": row.travel_date_local,
                "keep_created_at": row.keep_created_at,
            },
        )

    existing = _index_names(conn, "flight_watch")
    if UNIQUE_NAME not in existing:
        op.create_index(
            UNIQUE_NAME,
            "flight_watch",
            ["user_id", "origin_iata", "destination_iata", "travel_date_local"],
            unique=True,
        )


def downgrade() -> None:
    conn = op.get_bind()
    if "flight_watch" not in set(sa.inspect(conn).get_table_names()):
        return
    if UNIQUE_NAME in _index_names(conn, "flight_watch"):
        op.drop_index(UNIQUE_NAME, table_name="flight_watch")
