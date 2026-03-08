from __future__ import annotations

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return a timezone-aware UTC datetime."""
    return datetime.now(UTC)


def as_utc_aware(value: datetime) -> datetime:
    """Normalize datetime values to timezone-aware UTC.

    Naive values are treated as UTC to preserve compatibility with existing
    naive-UTC database columns.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def as_utc_naive(value: datetime) -> datetime:
    """Return a naive UTC datetime for persistence in naive DB columns."""
    return as_utc_aware(value).replace(tzinfo=None)


def utc_now_naive() -> datetime:
    """Return current UTC time as naive datetime for DB compatibility."""
    return as_utc_naive(utc_now())
