from __future__ import annotations

from datetime import date, timedelta

import app.api.v1.watchlist as watchlist_api
from app.core.time import utc_now_naive
from app.domain.entities import ProviderFlight
from fastapi.testclient import TestClient

from app.infrastructure.db.session import Base, engine
from app.main import app


class _FakeProvider:
    def get_flights(self, origin: str, destination: str, travel_date: str) -> list[ProviderFlight]:
        return [
            ProviderFlight(
                price=42.0,
                currency="EUR",
                departure_time_local="09:30",
                captured_at=utc_now_naive(),
                source="smoke-provider",
            )
        ]


def main() -> int:
    Base.metadata.create_all(bind=engine)
    watchlist_api.provider = _FakeProvider()
    watchlist_api.REFRESH_COOLDOWN_SECONDS = 0

    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={"email": "smoke-watchlist@viru.dev", "password": "password123"},
        )
        if register.status_code not in {200, 409}:
            raise RuntimeError(f"register failed: {register.status_code} {register.text}")

        if register.status_code == 200:
            token = register.json()["access_token"]
        else:
            login = client.post(
                "/api/v1/auth/login",
                json={"email": "smoke-watchlist@viru.dev", "password": "password123"},
            )
            token = login.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        watch = client.post(
            "/api/v1/watchlist",
            headers=headers,
            json={
                "origin_iata": "MAD",
                "destination_iata": "DUB",
                "travel_date_local": str(date.today() + timedelta(days=40)),
                "target_price": 45,
            },
        )
        if watch.status_code not in {200, 409}:
            raise RuntimeError(f"create watch failed: {watch.status_code} {watch.text}")

        listing = client.get("/api/v1/watchlist", headers=headers)
        assert listing.status_code == 200 and len(listing.json()) >= 1
        watch_id = listing.json()[0]["id"]

        refresh = client.post(f"/api/v1/watchlist/{watch_id}/refresh-now", headers=headers)
        assert refresh.status_code == 200

        history = client.get(f"/api/v1/prices/history?watch_id={watch_id}", headers=headers)
        assert history.status_code == 200

        batch = client.post(
            "/api/v1/prices/history/batch",
            headers=headers,
            json={"watch_ids": [watch_id], "max_rows": 20000},
        )
        assert batch.status_code == 200

        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200

    print("smoke_watchlist_release: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
