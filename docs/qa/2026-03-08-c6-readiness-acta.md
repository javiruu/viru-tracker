# C6 — Readiness acta (GO/NO-GO)

Date: 2026-03-08
Decision owner: Release/QA

## Decision

**GO** for release with controlled residual risks.

## Why GO

- Critical flows validated end-to-end (auth/session, watchlist/history, quick-search, alerts, recommendations, account/admin).
- Operational smoke executed with expected behavior under degraded/error conditions.
- Build and automated tests passing with objective evidence.
- Living docs updated to match implemented reality.

## Final release checklist

- [x] Frontend tests green (`npm test`).
- [x] Frontend production build green (`npm run build`).
- [x] Backend tests green (`.venv/bin/python -m pytest -q`).
- [x] QA matrix critical flows completed.
- [x] Operational smoke for error paths completed.
- [x] Open issues triaged with owner/date.
- [x] Docs index updated and factual.
- [x] Consolidated changelog C1–C6 published.

## Residual risks (accepted)

1. Frontend hook dependency warnings remain (quality debt, non-blocking).
2. `datetime.utcnow()` deprecation warnings remain in several backend modules.
3. Weather provider (Open-Meteo) can return 400; current behavior falls back gracefully.
4. Retention automation not yet scheduled (manual/script-based).

## Critical issues found during C6 and resolution

1. **Test environment gap**: backend tests not runnable with system python (`No module named pytest`).
   - Resolution: local backend virtualenv bootstrap for reproducible QA execution.
2. **Flaky integration due to external provider instability**: `test_watchlist_flow` intermittently failed (Ryanair 500 during refresh).
   - Resolution: test now monkeypatches provider with deterministic fake response.
3. **Deprecated HTTP status constant usage** in validation handler.
   - Resolution: migrated to `HTTP_422_UNPROCESSABLE_CONTENT`.

## Risk acceptance registry

| Risk | Owner | Accepted on | Revisit by |
|---|---|---|---|
| Frontend hook warnings | Frontend lead | 2026-03-08 | 2026-03-15 |
| `datetime.utcnow()` deprecations | Backend lead | 2026-03-08 | 2026-03-15 |
| Weather upstream 400 fallback | Backend lead | 2026-03-08 | 2026-03-22 |
| Retention unscheduled | DevOps lead | 2026-03-08 | 2026-03-22 |
