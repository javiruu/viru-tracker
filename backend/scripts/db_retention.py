from __future__ import annotations

import argparse
from datetime import timedelta

from app.core.time import utc_now_naive

from sqlalchemy import delete, select

from app.infrastructure.db.models import IdempotencyRecord, NotificationEvent, PriceSnapshot, SecurityActivity
from app.infrastructure.db.session import SessionLocal


def prune_table(session, model, ts_column, retention_days: int, batch_size: int) -> int:
    cutoff = utc_now_naive() - timedelta(days=retention_days)
    total_deleted = 0

    while True:
        ids = session.scalars(
            select(model.id).where(ts_column < cutoff).limit(batch_size)
        ).all()
        if not ids:
            break
        deleted = session.execute(delete(model).where(model.id.in_(ids))).rowcount or 0
        session.commit()
        total_deleted += deleted

    return total_deleted


def main() -> None:
    parser = argparse.ArgumentParser(description="Prune growth tables by retention windows")
    parser.add_argument("--price-snapshot-days", type=int, default=180)
    parser.add_argument("--notification-event-days", type=int, default=90)
    parser.add_argument("--security-activity-days", type=int, default=180)
    parser.add_argument("--idempotency-days", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=5000)
    args = parser.parse_args()

    with SessionLocal() as session:
        deleted_price = prune_table(
            session,
            PriceSnapshot,
            PriceSnapshot.captured_at_utc,
            args.price_snapshot_days,
            args.batch_size,
        )
        deleted_events = prune_table(
            session,
            NotificationEvent,
            NotificationEvent.created_at,
            args.notification_event_days,
            args.batch_size,
        )
        deleted_security = prune_table(
            session,
            SecurityActivity,
            SecurityActivity.created_at,
            args.security_activity_days,
            args.batch_size,
        )
        deleted_idempotency = prune_table(
            session,
            IdempotencyRecord,
            IdempotencyRecord.created_at,
            args.idempotency_days,
            args.batch_size,
        )

    print(
        {
            "price_snapshot": deleted_price,
            "notification_event": deleted_events,
            "security_activity": deleted_security,
            "idempotency_record": deleted_idempotency,
        }
    )


if __name__ == "__main__":
    main()
