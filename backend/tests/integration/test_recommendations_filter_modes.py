from app.core.time import utc_now_naive
from app.domain.entities import ProviderFlight


class _FakeProvider:
    def get_flights(self, origin: str, destination: str, travel_date: str) -> list[ProviderFlight]:
        return [
            ProviderFlight(
                price=42.0,
                currency="EUR",
                departure_time_local="09:30",
                captured_at=utc_now_naive(),
                source="fake",
            )
        ]


def test_recommendations_filter_modes_strict_vs_flexible(client, monkeypatch) -> None:
    import app.api.v1.recommendations as reco

    monkeypatch.setattr(reco, "provider", _FakeProvider())
    monkeypatch.setattr(reco, "_fetch_weather", lambda _iata, _date: None)

    base_payload = {
        "origin_iata": "MAD",
        "destination_iata": "DUB",
        "travel_date": "2026-03-01",
        "days_before": 0,
        "days_after": 0,
        "include_nearby_origins": False,
        "include_nearby_destinations": False,
        "depart_after": "18:00",
        "depart_before": "22:00",
    }

    strict = client.post(
        "/api/v1/recommendations",
        json={**base_payload, "strict_filters": True, "soft_filters_weight": 0.6},
    )
    assert strict.status_code == 200
    assert strict.json()["items"] == []

    flexible = client.post(
        "/api/v1/recommendations",
        json={**base_payload, "strict_filters": False, "soft_filters_weight": 1.0},
    )
    assert flexible.status_code == 200
    flex_items = flexible.json()["items"]
    assert len(flex_items) == 1

    no_window = client.post(
        "/api/v1/recommendations",
        json={
            **base_payload,
            "depart_after": None,
            "depart_before": None,
            "strict_filters": False,
            "soft_filters_weight": 1.0,
        },
    )
    assert no_window.status_code == 200
    base_items = no_window.json()["items"]
    assert len(base_items) == 1

    assert flex_items[0]["score"] < base_items[0]["score"]
    assert flexible.json()["query"]["strict_filters"] is False
    assert flexible.json()["ai"]["reasoning_mode"] == "heuristic"
