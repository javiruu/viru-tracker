from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Any
from urllib import request

from sqlalchemy import delete, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.time import utc_now_naive
from app.infrastructure.db.models import IdempotencyRecord, NotificationEvent, PriceSnapshot, SecurityActivity
from app.infrastructure.db.session import SessionLocal

SAFE_MIN_RETENTION_DAYS = {
    "price_snapshot_days": 30,
    "notification_event_days": 30,
    "security_activity_days": 30,
    "idempotency_days": 3,
}


@dataclass(frozen=True)
class TableRetentionPlan:
    label: str
    model: Any
    ts_column: Any
    retention_days: int


def log_event(event: str, payload: dict[str, Any], log_file: str | None = None) -> None:
    line = {
        "ts": utc_now_naive().isoformat() + "Z",
        "event": event,
        **payload,
    }
    serialized = json.dumps(line, ensure_ascii=False, sort_keys=True)
    print(serialized)
    if log_file:
        path = Path(log_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(serialized + "\n")


def validate_retention_windows(args: argparse.Namespace) -> None:
    for field_name, min_days in SAFE_MIN_RETENTION_DAYS.items():
        value = getattr(args, field_name)
        if value < min_days:
            raise ValueError(
                f"Unsafe retention window for {field_name}: got {value}, requires >= {min_days} days"
            )


def _count_candidates(session: Session, model: Any, ts_column: Any, cutoff: Any) -> int:
    stmt = select(func.count(model.id)).where(ts_column < cutoff)
    return int(session.scalar(stmt) or 0)


def prune_table(
    session: Session,
    plan: TableRetentionPlan,
    batch_size: int,
    dry_run: bool,
    log_file: str | None,
) -> dict[str, Any]:
    started = time.monotonic()
    cutoff = utc_now_naive() - timedelta(days=plan.retention_days)
    candidates = _count_candidates(session, plan.model, plan.ts_column, cutoff)

    table_result: dict[str, Any] = {
        "table": plan.label,
        "retention_days": plan.retention_days,
        "cutoff_utc": cutoff.isoformat() + "Z",
        "candidates": candidates,
        "deleted": 0,
        "batches": 0,
        "dry_run": dry_run,
    }

    if dry_run:
        table_result["duration_ms"] = round((time.monotonic() - started) * 1000, 2)
        return table_result

    total_deleted = 0
    batches = 0

    while True:
        ids = session.scalars(select(plan.model.id).where(plan.ts_column < cutoff).limit(batch_size)).all()
        if not ids:
            break
        deleted = session.execute(delete(plan.model).where(plan.model.id.in_(ids))).rowcount or 0
        session.commit()
        total_deleted += deleted
        batches += 1

    table_result["deleted"] = total_deleted
    table_result["batches"] = batches
    table_result["duration_ms"] = round((time.monotonic() - started) * 1000, 2)

    log_event(
        "db_retention.table_completed",
        {
            "table": plan.label,
            "retention_days": plan.retention_days,
            "candidates": candidates,
            "deleted": total_deleted,
            "batches": batches,
            "duration_ms": table_result["duration_ms"],
            "dry_run": dry_run,
        },
        log_file,
    )

    return table_result


def emit_failure_alert(payload: dict[str, Any], alert_file: str, webhook_url: str | None) -> None:
    path = Path(alert_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")

    if not webhook_url:
        return

    body = json.dumps(payload).encode("utf-8")
    req = request.Request(webhook_url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "viru-db-retention/1.0")
    with request.urlopen(req, timeout=10):  # nosec B310 - controlled operational webhook
        pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prune growth tables by retention windows")
    parser.add_argument("--price-snapshot-days", type=int, default=180)
    parser.add_argument("--notification-event-days", type=int, default=90)
    parser.add_argument("--security-activity-days", type=int, default=180)
    parser.add_argument("--idempotency-days", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=5000)
    parser.add_argument("--dry-run", action="store_true", help="Only report deletion candidates")
    parser.add_argument(
        "--log-file",
        default=os.getenv("DB_RETENTION_LOG_FILE", "./logs/db-retention.log"),
        help="JSONL execution log file",
    )
    parser.add_argument(
        "--alert-file",
        default=os.getenv("DB_RETENTION_ALERT_FILE", "./logs/alerts/db-retention-failure.json"),
        help="Path written on failure",
    )
    parser.add_argument(
        "--alert-webhook",
        default=os.getenv("DB_RETENTION_ALERT_WEBHOOK"),
        help="Optional webhook URL receiving failure payload",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    started_at = time.monotonic()
    run_started_utc = utc_now_naive().isoformat() + "Z"

    run_context = {
        "dry_run": args.dry_run,
        "batch_size": args.batch_size,
        "db_url": os.getenv("DB_URL", "sqlite:///./viru.db"),
        "retention": {
            "price_snapshot_days": args.price_snapshot_days,
            "notification_event_days": args.notification_event_days,
            "security_activity_days": args.security_activity_days,
            "idempotency_days": args.idempotency_days,
        },
    }

    try:
        validate_retention_windows(args)

        plans = [
            TableRetentionPlan("price_snapshot", PriceSnapshot, PriceSnapshot.captured_at_utc, args.price_snapshot_days),
            TableRetentionPlan(
                "notification_event", NotificationEvent, NotificationEvent.created_at, args.notification_event_days
            ),
            TableRetentionPlan(
                "security_activity", SecurityActivity, SecurityActivity.created_at, args.security_activity_days
            ),
            TableRetentionPlan("idempotency_record", IdempotencyRecord, IdempotencyRecord.created_at, args.idempotency_days),
        ]

        log_event("db_retention.run_started", run_context, args.log_file)

        with SessionLocal() as session:
            per_table = [
                prune_table(
                    session=session,
                    plan=plan,
                    batch_size=args.batch_size,
                    dry_run=args.dry_run,
                    log_file=args.log_file,
                )
                for plan in plans
            ]

        deleted_total = sum(item["deleted"] for item in per_table)
        candidates_total = sum(item["candidates"] for item in per_table)
        duration_ms = round((time.monotonic() - started_at) * 1000, 2)

        summary = {
            "status": "ok",
            "started_at": run_started_utc,
            "finished_at": utc_now_naive().isoformat() + "Z",
            "duration_ms": duration_ms,
            "dry_run": args.dry_run,
            "batch_size": args.batch_size,
            "tables": per_table,
            "totals": {
                "candidates": candidates_total,
                "deleted": deleted_total,
            },
        }
        log_event("db_retention.run_completed", summary, args.log_file)
        return 0

    except (ValueError, SQLAlchemyError, OSError) as exc:
        duration_ms = round((time.monotonic() - started_at) * 1000, 2)
        failure_payload = {
            "status": "failed",
            "started_at": run_started_utc,
            "failed_at": utc_now_naive().isoformat() + "Z",
            "duration_ms": duration_ms,
            "error_type": type(exc).__name__,
            "error": str(exc),
            "context": run_context,
        }
        try:
            emit_failure_alert(failure_payload, args.alert_file, args.alert_webhook)
        finally:
            log_event("db_retention.run_failed", failure_payload, args.log_file)
        return 1


if __name__ == "__main__":
    sys.exit(main())
