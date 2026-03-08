from __future__ import annotations

import re
import uuid
from contextvars import ContextVar

CORRELATION_ID_CTX: ContextVar[str] = ContextVar("correlation_id", default="")
_CORRELATION_RE = re.compile(r"^[A-Za-z0-9._\-]{8,64}$")


def normalize_correlation_id(raw_value: str | None) -> str:
    if raw_value:
        candidate = raw_value.strip()
        if _CORRELATION_RE.fullmatch(candidate):
            return candidate
    return str(uuid.uuid4())


def set_correlation_id(value: str) -> None:
    CORRELATION_ID_CTX.set(value)


def get_correlation_id() -> str:
    return CORRELATION_ID_CTX.get("")
