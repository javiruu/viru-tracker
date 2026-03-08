# C6 — Build/Test command outputs

Date: 2026-03-08

## Frontend

### `npm test`
- Result: **PASS**
- Summary: `28 passed, 0 failed`

### `npm run build`
- Result: **PASS**
- Next.js build completed with static routes generated.
- Notes: eslint warnings remain (`react-hooks/exhaustive-deps`) in dashboard/quick-search.

## Backend

### `python3 -m pytest -q`
- Initial result: **FAIL** (`No module named pytest`) in system Python.
- Resolution: created local virtualenv (`backend/.venv`) and installed `-e .[dev]`.

### `.venv/bin/python -m pytest -q`
- Final result: **PASS**
- Summary: `12 passed, 0 failed`.

## Operational smoke (TestClient script)

Command:
- `.venv/bin/python /tmp/c6_smoke.py`

Cases:
- invalid token returns invalid_auth — **PASS**
- auth/session me — **PASS**
- account/profile — **PASS**
- watchlist create/list — **PASS**
- alerts create rule — **PASS**
- quick-search baseline — **PASS**
- no results path — **PASS**
- provider degraded fallback — **PASS** (`ryanair_unavailable_parcial` warning)
- simulated high latency — **PASS** (response 200, ~133ms with forced provider delay)
- recommendations baseline — **PASS**
- admin forbidden for non-admin — **PASS** (403)
