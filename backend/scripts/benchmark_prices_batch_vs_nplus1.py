from __future__ import annotations

import argparse
import tempfile
import time
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.infrastructure.db.session import Base, get_db
from app.main import app


def register_and_token(client: TestClient, email: str, password: str = "password123") -> str:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    if response.status_code == 409:
        login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        return login.json()["access_token"]
    return response.json()["access_token"]


def run_benchmark(watches: int, snapshots_per_watch: int) -> dict[str, float | int]:
    fd, path = tempfile.mkstemp(suffix=".db")
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Session:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        token = register_and_token(client, email=f"bench-{int(time.time())}@viru.dev")
        headers = {"Authorization": f"Bearer {token}"}

        watch_ids: list[str] = []
        for i in range(watches):
            created = client.post(
                "/api/v1/watchlist",
                headers=headers,
                json={
                    "origin_iata": "MAD",
                    "destination_iata": "DUB",
                    "travel_date_local": str(date.today() + timedelta(days=i + 1)),
                    "target_price": 100,
                },
            )
            watch_id = created.json()["id"]
            watch_ids.append(watch_id)

            for s in range(snapshots_per_watch):
                # Insert via refresh endpoint is expensive for benchmark setup;
                # use direct DB insertion only for benchmark data seeding.
                from app.core.time import utc_now_naive
                from app.infrastructure.db.models import PriceSnapshot

                with testing_session_local() as db:
                    db.add(
                        PriceSnapshot(
                            watch_id=watch_id,
                            captured_at_utc=utc_now_naive() - timedelta(minutes=s),
                            departure_time_local="09:15",
                            raw_price=50 + (s % 7),
                            raw_currency="EUR",
                            provider="bench",
                        )
                    )
                    db.commit()

        t0 = time.perf_counter()
        n_plus_one_rows = 0
        for watch_id in watch_ids:
            resp = client.get(f"/api/v1/prices/history?watch_id={watch_id}", headers=headers)
            n_plus_one_rows += len(resp.json())
        n_plus_one_ms = (time.perf_counter() - t0) * 1000

        t1 = time.perf_counter()
        batch = client.post(
            "/api/v1/prices/history/batch",
            headers=headers,
            json={"watch_ids": watch_ids, "max_rows": 20000},
        )
        batch_rows = len(batch.json())
        batch_ms = (time.perf_counter() - t1) * 1000

    app.dependency_overrides.clear()
    engine.dispose()

    return {
        "watches": watches,
        "snapshots_per_watch": snapshots_per_watch,
        "n_plus_one_rows": n_plus_one_rows,
        "batch_rows": batch_rows,
        "n_plus_one_ms": round(n_plus_one_ms, 2),
        "batch_ms": round(batch_ms, 2),
        "speedup_x": round((n_plus_one_ms / batch_ms), 2) if batch_ms > 0 else -1,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark N+1 history fetch vs batch endpoint")
    parser.add_argument("--watches", type=int, default=100)
    parser.add_argument("--snapshots-per-watch", type=int, default=50)
    args = parser.parse_args()

    result = run_benchmark(watches=args.watches, snapshots_per_watch=args.snapshots_per_watch)
    for key, value in result.items():
        print(f"{key}: {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
