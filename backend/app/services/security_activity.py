from app.core.time import utc_now_naive

from sqlalchemy.orm import Session

from app.infrastructure.db.models import SecurityActivity


def log_security_event(db: Session, user_id: str, event_type: str, ip: str | None) -> None:
    db.add(
        SecurityActivity(
            user_id=user_id,
            event_type=event_type,
            ip=ip,
            created_at=utc_now_naive(),
        )
    )
