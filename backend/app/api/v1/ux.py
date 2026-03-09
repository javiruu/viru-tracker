from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.domain.schemas import UxEventIn
from app.infrastructure.db.models import User, UxEvent
from app.infrastructure.db.session import get_db

router = APIRouter()

ALLOWED_EVENTS = {
    "dashboard_view",
    "quick_search_executed",
    "watchlist_refresh",
    "alert_created",
    "alert_triggered",
    "search_empty_results",
}


@router.post("/events")
def create_ux_event(
    payload: UxEventIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    event_name = payload.event_name.strip()
    if event_name not in ALLOWED_EVENTS:
        return {"status": "ignored"}

    event = UxEvent(
        user_id=current_user.id,
        event_name=event_name,
        duration_ms=payload.duration_ms,
        metadata_json=json.dumps(payload.metadata, ensure_ascii=False) if payload.metadata else None,
    )
    db.add(event)
    db.commit()
    return {"status": "ok"}
