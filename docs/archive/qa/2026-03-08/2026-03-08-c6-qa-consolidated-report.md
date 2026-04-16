Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c6-qa-consolidated-report.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# C6 — Consolidated QA report (critical flows + operational smoke)

Owner: Viru Engineering
Date: 2026-03-08
Evidence: `docs/qa/2026-03-08-c6-command-outputs.md`

## T1. Critical flow matrix

| Flow | Evidence | Result |
|---|---|---|
| auth/session | `test_auth_flow.py` + smoke invalid token/auth me | **PASS** |
| watchlist/history | `test_watchlist_flow.py` + `test_c4_error_idempotency.py` | **PASS** |
| quick-search | `test_search_alerts_flow.py` + smoke baseline/no-results/degraded | **PASS** |
| alerts | `test_search_alerts_flow.py` + idempotency tests | **PASS** |
| recommendations | `test_recommendations_filter_modes.py` + smoke baseline/high-latency | **PASS** |
| account/admin | smoke `account/profile` + admin access control (403 non-admin) | **PASS** |

## T2. Operational error smoke

| Scenario | Expected | Observed | Result |
|---|---|---|---|
| provider degraded | graceful response without crash | 200 + warning `ryanair_unavailable_parcial` | **PASS** |
| invalid token | standardized auth error | 401 + `code=invalid_auth` | **PASS** |
| no results | stable empty state | 200 + `results=[]` | **PASS** |
| simulated high latency | response remains successful | 200 under forced provider delay | **PASS** |

## Stability conclusion

- Frontend tests: **28/28 passing**.
- Backend tests: **12/12 passing** (after local venv bootstrap).
- Build: **successful production build**.
- No critical regression detected in C1–C6 scope.





