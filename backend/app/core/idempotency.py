from __future__ import annotations

import hashlib
import json

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ApiError, message_for_code
from app.infrastructure.db.models import IdempotencyRecord


def request_hash(payload: dict | None) -> str:
    normalized = json.dumps(payload or {}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def replay_if_exists(
    db: Session,
    *,
    user_id: str,
    endpoint: str,
    idempotency_key: str | None,
    req_hash: str,
) -> tuple[int, dict] | None:
    if not idempotency_key:
        return None
    row = db.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user_id,
            IdempotencyRecord.endpoint == endpoint,
            IdempotencyRecord.idempotency_key == idempotency_key,
        )
    )
    if not row:
        return None
    if row.request_hash != req_hash:
        raise ApiError(
            status=409,
            code="idempotency_mismatch",
            message=message_for_code("idempotency_mismatch"),
            details=[{"field": "idempotency_key", "reason": "payload_mismatch"}],
        )
    return row.response_status, json.loads(row.response_body)


def store_response(
    db: Session,
    *,
    user_id: str,
    endpoint: str,
    idempotency_key: str | None,
    req_hash: str,
    response_status: int,
    response_body: dict,
) -> None:
    if not idempotency_key:
        return
    row = IdempotencyRecord(
        user_id=user_id,
        endpoint=endpoint,
        idempotency_key=idempotency_key,
        request_hash=req_hash,
        response_status=response_status,
        response_body=json.dumps(response_body, ensure_ascii=False),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
