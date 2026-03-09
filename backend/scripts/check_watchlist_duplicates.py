from __future__ import annotations

import json
import os
import sys

from sqlalchemy import text

from app.infrastructure.db.session import SessionLocal


def main() -> int:
    db_url = os.getenv("DB_URL", "sqlite:///./viru.db")
    with SessionLocal() as session:
        rows = session.execute(
            text(
                """
                SELECT user_id, origin_iata, destination_iata, travel_date_local, COUNT(*) AS cnt
                FROM flight_watch
                GROUP BY user_id, origin_iata, destination_iata, travel_date_local
                HAVING COUNT(*) > 1
                ORDER BY cnt DESC, user_id ASC
                """
            )
        ).fetchall()

    payload = {
        "db_url": db_url,
        "duplicate_groups": len(rows),
        "samples": [
            {
                "user_id": row.user_id,
                "origin_iata": row.origin_iata,
                "destination_iata": row.destination_iata,
                "travel_date_local": str(row.travel_date_local),
                "count": int(row.cnt),
            }
            for row in rows[:50]
        ],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 1 if rows else 0


if __name__ == "__main__":
    sys.exit(main())
