Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c4-backend-robustness-contract.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# C4 Backend Robustness Contract (Error + Idempotency)

## Error envelope (uniform)
All backend errors now return:

```json
{
  "status": 422,
  "code": "validation_error",
  "message": "Request validation failed.",
  "details": [
    {"loc": ["body", "rule_type"], "msg": "Value error, invalid_rule_type", "type": "value_error"}
  ],
  "retry_after_sec": 30
}
```

- `retry_after_sec` is optional and only present when relevant.
- `message` is sanitized and mapped from server error codes.
- No provider/raw exception internals are exposed in envelope by default.

## Coverage applied
Envelope handling is now enforced for:
- `auth`
- `watchlist`
- `alerts`
- `search`
- `recommendations`
- shared auth dependency errors (`invalid_auth`, `admin_required`)

## Idempotency contract
Supported endpoints:
- `POST /api/v1/watchlist`
- `POST /api/v1/alerts/rules`
- `POST /api/v1/watchlist/{id}/refresh-now`

### How to use
Send header:

`Idempotency-Key: <client-generated-stable-key>`

Behavior:
1. First successful request stores `(user_id, endpoint, idempotency_key, request_hash, response)`.
2. Same key + same payload => response replayed (`x-idempotency-replayed: true`).
3. Same key + different payload => `409 idempotency_mismatch`.
4. No header => default non-idempotent behavior.

## Correlation ID normalization
- Request header `x-correlation-id` is normalized to safe format `[A-Za-z0-9._-]{8,64}`.
- Invalid/missing values are replaced with generated UUID.
- Returned in response header `x-correlation-id` and emitted in logs.

## Validation hardening
- `rule_type` now controlled and normalized (`threshold_below` -> `threshold_low`, `threshold_above` -> `threshold_high`).
- Threshold rules require `threshold_value`.
- Cooldown range constrained to `1..10080`.
- Watch IATA and recommendation time/radius/day bounds are validated consistently.





