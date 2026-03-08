import datetime as dt
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query

from app.core.errors import ApiError, message_for_code
from pydantic import BaseModel, ConfigDict

from app.api.v1.airports import _validate_iata
from app.infrastructure.airports_catalog import expand_airports, get_airport
from app.infrastructure.providers.ryanair_public_provider import RyanairPublicProvider

router = APIRouter()
provider = RyanairPublicProvider()


class QuickSearchPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    origin_iata: str | list[str] | None = None
    destination_iata: str | list[str] | None = None
    travel_date: dt.date | None = None
    date: dt.date | None = None
    radius_km: int | None = None
    include_stops: bool | None = None
    include_nearby_origin: bool | None = None
    include_nearby_origins: bool | None = None
    include_nearby_destination: bool | None = None
    include_nearby_destinations: bool | None = None
    depart_after: str | None = None
    depart_before: str | None = None
    departure_from: str | None = None
    departure_to: str | None = None
    max_stops: int | None = None
    exclude_origins: str | list[str] | None = None
    exclude_destinations: str | list[str] | None = None
    strict_filters: bool | None = None
    strict_mode: bool | None = None
    soft_filters_weight: float | None = None
    flex_days_before: int | None = None
    flex_days_after: int | None = None
    dias_antes: int | None = None
    dias_despues: int | None = None


def _clamp_days(value: int | None, max_days: int = 7) -> int:
    if value is None:
        return 0
    if value < 0:
        return 0
    if value > max_days:
        return max_days
    return value


def _build_flex_dates(base_date: dt.date, days_before: int, days_after: int) -> list[dt.date]:
    if days_before <= 0 and days_after <= 0:
        return [base_date]
    dates: list[dt.date] = []
    for offset in range(-days_before, days_after + 1):
        dates.append(base_date + dt.timedelta(days=offset))
    return dates

def _time_to_minutes(value: str | None) -> int | None:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) < 2:
        return None
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return None
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return None
    return hour * 60 + minute


def _matches_time_window(
    departure: str | None,
    after_value: str | None,
    before_value: str | None,
) -> bool:
    if not after_value and not before_value:
        return True
    dep_minutes = _time_to_minutes(departure)
    if dep_minutes is None:
        return False
    after_minutes = _time_to_minutes(after_value)
    before_minutes = _time_to_minutes(before_value)
    if after_minutes is None and before_minutes is None:
        return True
    if after_minutes is None:
        return dep_minutes <= before_minutes
    if before_minutes is None:
        return dep_minutes >= after_minutes
    if after_minutes <= before_minutes:
        return after_minutes <= dep_minutes <= before_minutes
    return dep_minutes >= after_minutes or dep_minutes <= before_minutes


def _normalize_iata_list(value: str | list[str] | None) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        items = [str(item).strip().upper() for item in value]
    else:
        items = [item.strip().upper() for item in value.split(",")]
    return [item for item in items if item]


def _required_error(field: str) -> ApiError:
    return ApiError(
        status=422,
        code="validation_error",
        message=message_for_code("validation_error"),
        details=[{"loc": ["body", field], "msg": "Field required", "type": "missing"}],
    )


def _parse_iata_input(value: str | list[str]) -> list[str]:
    codes = _normalize_iata_list(value)
    if not codes:
        raise HTTPException(status_code=400, detail="iata_invalido")
    cleaned: list[str] = []
    for code in codes:
        if len(code) != 3 or not code.isalpha():
            raise HTTPException(status_code=400, detail="iata_invalido")
        cleaned.append(code.upper())
    return cleaned


@router.get("/deeplink")
def deeplink(
    origin_iata: str,
    destination_iata: str,
    date_out: dt.date,
    date_in: dt.date | None = None,
    adults: int = 1,
    teens: int = 0,
    children: int = 0,
    infants: int = 0,
    locale: str = "es-es",
) -> dict:
    origin = _validate_iata(origin_iata)
    destination = _validate_iata(destination_iata)
    if adults < 1 or adults > 9:
        raise HTTPException(status_code=400, detail="adultos_invalidos")
    if date_in and date_in < date_out:
        raise HTTPException(status_code=400, detail="fecha_vuelta_invalida")

    is_return = "true" if date_in else "false"
    base = f"https://www.ryanair.com/{locale}/trip/flights/select"

    full_params = {
        "adults": str(adults),
        "teens": str(teens),
        "children": str(children),
        "infants": str(infants),
        "dateOut": str(date_out),
        "dateIn": str(date_in or ""),
        "isConnectedFlight": "false",
        "discount": "0",
        "promoCode": "",
        "isReturn": is_return,
        "originIata": origin,
        "destinationIata": destination,
        "originMac": "",
        "destinationMac": "",
        "tpAdults": str(adults),
        "tpTeens": str(teens),
        "tpChildren": str(children),
        "tpInfants": str(infants),
        "tpStartDate": str(date_out),
        "tpEndDate": str(date_in or ""),
        "tpDiscount": "0",
        "tpPromoCode": "",
        "tpOriginIata": origin,
        "tpDestinationIata": destination,
        "tpOriginMac": "",
        "tpDestinationMac": "",
    }

    minimal_params = {
        "adults": str(adults),
        "teens": str(teens),
        "children": str(children),
        "infants": str(infants),
        "dateOut": str(date_out),
        "dateIn": str(date_in or ""),
        "isReturn": is_return,
        "originIata": origin,
        "destinationIata": destination,
    }

    def encode(params: dict[str, str]) -> str:
        from urllib.parse import urlencode

        return f"{base}?{urlencode(params)}"

    return {
        "status": "ok",
        "origin_iata": origin,
        "destination_iata": destination,
        "date_out": str(date_out),
        "date_in": str(date_in) if date_in else None,
        "url": encode(full_params),
        "fallback_url": encode(minimal_params),
        "strategy": "full",
    }


@router.post("/quick")
def quick_search(
    payload: QuickSearchPayload | None = Body(default=None),
    origin_iata: str | None = Query(default=None),
    destination_iata: str | None = Query(default=None),
    travel_date: dt.date | None = Query(default=None),
    radius_km: int | None = Query(default=None),
    include_stops: bool | None = Query(default=None),
    include_nearby_origins: bool | None = Query(default=None),
    include_nearby_destinations: bool | None = Query(default=None),
    depart_after: str | None = Query(default=None),
    depart_before: str | None = Query(default=None),
    max_stops: int | None = Query(default=None),
    exclude_origins: str | None = Query(default=None),
    exclude_destinations: str | None = Query(default=None),
    strict_filters: bool | None = Query(default=None),
    soft_filters_weight: float | None = Query(default=None),
    flex_days_before: int | None = Query(default=None),
    flex_days_after: int | None = Query(default=None),
) -> dict:
    payload = payload or QuickSearchPayload()
    origin_value = origin_iata or payload.origin_iata
    destination_value = destination_iata or payload.destination_iata
    travel_date_value = travel_date or payload.travel_date or payload.date
    if not origin_value:
        raise _required_error("origin_iata")
    if not destination_value:
        raise _required_error("destination_iata")
    if not travel_date_value:
        raise _required_error("travel_date")

    radius_km = radius_km if radius_km is not None else payload.radius_km if payload.radius_km is not None else 150
    include_stops = include_stops if include_stops is not None else payload.include_stops if payload.include_stops is not None else False
    include_nearby_origins = (
        include_nearby_origins
        if include_nearby_origins is not None
        else payload.include_nearby_origins
        if payload.include_nearby_origins is not None
        else payload.include_nearby_origin
        if payload.include_nearby_origin is not None
        else False
    )
    include_nearby_destinations = (
        include_nearby_destinations
        if include_nearby_destinations is not None
        else payload.include_nearby_destinations
        if payload.include_nearby_destinations is not None
        else payload.include_nearby_destination
        if payload.include_nearby_destination is not None
        else False
    )
    depart_after = depart_after or payload.depart_after or payload.departure_from
    depart_before = depart_before or payload.depart_before or payload.departure_to
    max_stops = max_stops if max_stops is not None else payload.max_stops if payload.max_stops is not None else 0
    exclude_origins = exclude_origins if exclude_origins is not None else payload.exclude_origins
    exclude_destinations = exclude_destinations if exclude_destinations is not None else payload.exclude_destinations
    strict_filters = (
        strict_filters
        if strict_filters is not None
        else payload.strict_filters
        if payload.strict_filters is not None
        else payload.strict_mode
        if payload.strict_mode is not None
        else True
    )
    soft_filters_weight = (
        soft_filters_weight
        if soft_filters_weight is not None
        else payload.soft_filters_weight
        if payload.soft_filters_weight is not None
        else 0.6
    )
    days_before = (
        flex_days_before
        if flex_days_before is not None
        else payload.flex_days_before
        if payload.flex_days_before is not None
        else payload.dias_antes
        if payload.dias_antes is not None
        else 0
    )
    days_after = (
        flex_days_after
        if flex_days_after is not None
        else payload.flex_days_after
        if payload.flex_days_after is not None
        else payload.dias_despues
        if payload.dias_despues is not None
        else 0
    )
    days_before = _clamp_days(days_before)
    days_after = _clamp_days(days_after)

    origin_list = _parse_iata_input(origin_value)
    destination_list = _parse_iata_input(destination_value)

    warnings: list[str] = []
    filters_applied: dict[str, Any] = {}
    relaxed_filters: list[str] = []

    if max_stops > 0:
        warnings.append("stops_no_disponible_en_modo_rapido")

    exclude_origin_list = _normalize_iata_list(exclude_origins)
    exclude_destination_list = _normalize_iata_list(exclude_destinations)
    if any(code in exclude_origin_list for code in origin_list) or any(code in exclude_destination_list for code in destination_list):
        filters_applied["exclusion"] = True

    origin_candidates = origin_list[:]
    destination_candidates = destination_list[:]
    if include_nearby_origins:
        if any(not get_airport(code) for code in origin_list):
            warnings.append("origen_no_disponible_en_catalogo")
        origin_candidates = expand_airports(origin_list, radius_km, limit_per_seed=6)
    if include_nearby_destinations:
        if any(not get_airport(code) for code in destination_list):
            warnings.append("destino_no_disponible_en_catalogo")
        destination_candidates = expand_airports(destination_list, radius_km, limit_per_seed=6)

    origin_candidates = [code for code in origin_candidates if code not in exclude_origin_list]
    destination_candidates = [
        code for code in destination_candidates if code not in exclude_destination_list
    ]

    if not origin_candidates or not destination_candidates:
        filters_applied["exclusion"] = True

    pair_limit = 12
    date_candidates = _build_flex_dates(travel_date_value, days_before, days_after)
    combined: list[tuple[str, str, dt.date, Any]] = []
    pair_count = 0
    for origin_code in origin_candidates:
        for destination_code in destination_candidates:
            if origin_code == destination_code:
                continue
            if pair_count >= pair_limit:
                warnings.append("limite_combinaciones_alternativas")
                break
            for travel_date_item in date_candidates:
                try:
                    flights = provider.get_flights(origin_code, destination_code, str(travel_date_item))
                except Exception:
                    warnings.append("ryanair_unavailable_parcial")
                    flights = []
                for flight in flights:
                    combined.append((origin_code, destination_code, travel_date_item, flight))
            pair_count += 1
        if pair_count >= pair_limit:
            break

    filtered = [
        (origin_code, destination_code, travel_date_item, flight)
        for origin_code, destination_code, travel_date_item, flight in combined
        if _matches_time_window(flight.departure_time_local, depart_after, depart_before)
    ]
    if depart_after or depart_before:
        filters_applied["departure_window"] = {"after": depart_after, "before": depart_before}

    if strict_filters:
        flights_after_filters = filtered
    else:
        flights_after_filters = filtered
        if not flights_after_filters and (depart_after or depart_before):
            flights_after_filters = combined
            relaxed_filters.append("departure_window")

    flights_sorted = sorted(
        flights_after_filters,
        key=lambda entry: (
            str(entry[2]),
            entry[3].departure_time_local or "99:99",
            entry[3].price,
        ),
    )

    return {
        "query": {
            "origin_iata": ",".join(origin_list),
            "destination_iata": ",".join(destination_list),
            "travel_date": str(travel_date_value),
            "flex_days_before": days_before,
            "flex_days_after": days_after,
            "travel_dates": [str(date_item) for date_item in date_candidates],
            "radius_km": radius_km,
            "include_stops": include_stops,
            "include_nearby_origins": include_nearby_origins,
            "include_nearby_destinations": include_nearby_destinations,
            "depart_after": depart_after,
            "depart_before": depart_before,
            "max_stops": max_stops,
            "exclude_origins": exclude_origin_list,
            "exclude_destinations": exclude_destination_list,
            "strict_filters": strict_filters,
            "soft_filters_weight": soft_filters_weight,
            "expanded_origins": origin_candidates,
            "expanded_destinations": destination_candidates,
        },
        "filters": {
            "applied": filters_applied,
            "relaxed": relaxed_filters,
            "warnings": warnings,
            "discarded": max(0, len(combined) - len(flights_after_filters)),
        },
        "results": [
            {
                "origin": origin_code,
                "destination": destination_code,
                "travel_date": str(travel_date_item),
                "departure_time_local": flight.departure_time_local,
                "price": flight.price,
                "currency": flight.currency,
                "source": flight.source,
            }
            for origin_code, destination_code, travel_date_item, flight in flights_sorted
        ],
    }
