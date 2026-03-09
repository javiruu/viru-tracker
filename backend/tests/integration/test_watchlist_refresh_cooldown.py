import logging
from datetime import date, datetime, timedelta

import app.api.v1.watchlist as watchlist_api
from app.domain.entities import ProviderFlight
from fastapi.testclient import TestClient

from tests.helpers import register_and_token


class _FakeProvider:
    def get_flights(self, origin: str, destination: str, travel_date: str) -> list[ProviderFlight]:
        return [
            ProviderFlight(
                price=49.0,
                currency="EUR",
                departure_time_local="10:00",
                captured_at=datetime(2026, 1, 1, 12, 0, 0),
                source="fake-provider",
            )
        ]


class _MutableClock:
    def __init__(self, start: datetime) -> None:
        self.current = start

    def now(self) -> datetime:
        return self.current

    def advance(self, seconds: int) -> None:
        self.current = self.current + timedelta(seconds=seconds)


def _create_watch(client: TestClient, headers: dict[str, str], offset_days: int) -> str:
    response = client.post(
        "/api/v1/watchlist",
        headers=headers,
        json={
            "origin_iata": "MAD",
            "destination_iata": "DUB",
            "travel_date_local": str(date.today() + timedelta(days=offset_days)),
            "target_price": 40,
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_refresh_cooldown_200_429_200(client: TestClient, monkeypatch, caplog) -> None:
    clock = _MutableClock(datetime(2026, 3, 9, 9, 0, 0))
    monkeypatch.setattr(watchlist_api, "provider", _FakeProvider())
    monkeypatch.setattr(watchlist_api, "REFRESH_COOLDOWN_SECONDS", 60)
    monkeypatch.setattr(watchlist_api, "utc_now_naive", clock.now)
    caplog.set_level(logging.INFO, logger="app.watchlist")

    token = register_and_token(client, email="cooldown-main@viru.dev")
    headers = {"Authorization": f"Bearer {token}"}

    watch_id = _create_watch(client, headers, 30)

    first = client.post(f"/api/v1/watchlist/{watch_id}/refresh-now", headers=headers)
    assert first.status_code == 200

    second = client.post(f"/api/v1/watchlist/{watch_id}/refresh-now", headers=headers)
    assert second.status_code == 429
    payload = second.json()
    assert payload.get("code") == "refresh_cooldown_active" or payload.get("detail") == "refresh_cooldown_active"
    assert int(second.headers.get("Retry-After", "0")) >= 1
    assert "watch_refresh_denied_cooldown" in caplog.text

    clock.advance(61)

    third = client.post(f"/api/v1/watchlist/{watch_id}/refresh-now", headers=headers)
    assert third.status_code == 200


def test_refresh_cooldown_is_per_watch_not_global(client: TestClient, monkeypatch) -> None:
    clock = _MutableClock(datetime(2026, 3, 9, 9, 0, 0))
    monkeypatch.setattr(watchlist_api, "provider", _FakeProvider())
    monkeypatch.setattr(watchlist_api, "REFRESH_COOLDOWN_SECONDS", 60)
    monkeypatch.setattr(watchlist_api, "utc_now_naive", clock.now)

    token = register_and_token(client, email="cooldown-per-watch@viru.dev")
    headers = {"Authorization": f"Bearer {token}"}

    watch_a = _create_watch(client, headers, 31)
    watch_b = _create_watch(client, headers, 32)

    assert client.post(f"/api/v1/watchlist/{watch_a}/refresh-now", headers=headers).status_code == 200
    # Same timestamp, different watch -> must still be allowed
    assert client.post(f"/api/v1/watchlist/{watch_b}/refresh-now", headers=headers).status_code == 200
