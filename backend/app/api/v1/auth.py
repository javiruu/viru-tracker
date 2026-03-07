from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_errors import INVALID_AUTH
from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.domain.schemas import AuthOut, LoginIn, MeOut, RegisterIn
from app.infrastructure.db.models import User, UserSession
from app.infrastructure.db.session import get_db
from app.services.security_activity import log_security_event

router = APIRouter()
pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


@router.post("/register", response_model=AuthOut)
def register(payload: RegisterIn, request: Request, db: Session = Depends(get_db)) -> AuthOut:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="email_exists")
    user = User(email=payload.email.lower(), password_hash=pwd.hash(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    log_security_event(db, user.id, "register", request.client.host if request.client else None)
    db.commit()
    return AuthOut(access_token=create_access_token(user.id))


@router.post("/login", response_model=AuthOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> AuthOut:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not pwd.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail=INVALID_AUTH)
    client_ip = request.client.host if request.client else None
    agent = request.headers.get("user-agent") or "Este dispositivo"
    db.add(
        UserSession(
            user_id=user.id,
            device=agent[:200],
            ip=client_ip,
            last_seen=datetime.utcnow(),
            created_at=datetime.utcnow(),
            is_active=True,
        )
    )
    log_security_event(db, user.id, "login", client_ip)
    db.commit()
    return AuthOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=MeOut)
def me(current_user: User = Depends(get_current_user)) -> MeOut:
    return MeOut(
        id=current_user.id,
        email=current_user.email,
        locale=current_user.locale,
        is_admin=current_user.is_admin,
    )
