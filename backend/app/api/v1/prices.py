from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.domain.schemas import SnapshotOut
from app.infrastructure.db.models import FlightWatch, PriceSnapshot, User
from app.infrastructure.db.session import get_db

router = APIRouter()


@router.get("/history", response_model=list[SnapshotOut])
def history(
    watch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SnapshotOut]:
    watch = db.scalar(
        select(FlightWatch).where(FlightWatch.id == watch_id, FlightWatch.user_id == current_user.id)
    )
    if not watch:
        return []

    rows = list(
        db.scalars(
            select(PriceSnapshot)
            .where(PriceSnapshot.watch_id == watch_id)
            .order_by(PriceSnapshot.captured_at_utc.desc(), PriceSnapshot.id.desc())
        )
    )
    return [
        SnapshotOut(
            captured_at_utc=r.captured_at_utc,
            raw_price=float(r.raw_price),
            raw_currency=r.raw_currency,
            departure_time_local=r.departure_time_local,
        )
        for r in rows
    ]
