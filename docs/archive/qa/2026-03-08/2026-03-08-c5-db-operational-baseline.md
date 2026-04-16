Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c5-db-operational-baseline.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# C5 — DB operational baseline (PostgreSQL)

## Scope delivered
- T1 Environment matrix + secrets policy.
- T2 Query-path audit (watchlist/history/alerts/account) with `EXPLAIN ANALYZE` evidence.
- T3 Pragmatic indexes implemented.
- T4 Alembic migrations with upgrade + downgrade.
- T5 Retention policy + cleanup script.
- T6 Staging-like migration trial (SQLite -> PostgreSQL).
- T7 Backup + restore verified.
- T8 Recovery runbook + current limits/open risks.

---
## T1. DB environment matrix + secrets

| Env | Engine | URL pattern | Migration mode | Notes |
|---|---|---|---|---|
| local (quick) | SQLite | `sqlite:///./viru.db` | optional | dev speed only |
| local/staging/prod (target) | PostgreSQL 16 | `postgresql+psycopg://viru:${DB_PASSWORD}@host:5432/viru` | required | operational baseline |

Secrets rules:
1. Never commit real DB credentials.
2. Use env vars (`DB_URL`, `DB_PASSWORD`) from secret manager / CI env.
3. `RUN_DB_INIT=false` in staging/prod once Alembic is used.
4. Rotate DB password on incident; keep app and backup credentials separated.

---
## T2. Query audit (real code paths)

Code paths audited:
- Watchlist list: `GET /api/v1/watchlist` (`watchlist.py:list_watches`)
- History: `GET /api/v1/prices/history` (`prices.py:history`)
- Alerts feed: `GET /api/v1/alerts/events` (`alert_service.py:list_events`)
- Account sessions/activity: `GET /api/v1/account/sessions`, `GET /api/v1/account/security/activity`

Evidence:
- Before: `docs/qa/evidence/c5/explain_before_indexes.log`
- After: `docs/qa/evidence/c5/explain_after_indexes.log`

Result summary:
- Plans are stable and index-backed on main filters (`user_id`, `watch_id`, `rule_id`).
- Added composite indexes improve predictability for sort+filter paths.
- Main remaining cost in sample: selecting latest watch for test query shape (seq scan on `flight_watch` due subquery pattern used in benchmark, not API production bottleneck).

---
## T3/T4. Migrations + indexes

### New migrations
1. `backend/alembic/versions/0006_schema_catchup_core_tables.py`
   - Revision: `0006_catchup_core`
   - Adds missing core tables if absent: `flight_watch`, `price_snapshot`, `alert_rule`, `notification_event`, `user_preference`, `suggestion`.
   - Includes downgrade.

2. `backend/alembic/versions/0007_postgres_operational_indexes.py`
   - Revision: `0007_pg_ops_idx`
   - Adds composite operational indexes (conditional, idempotent-like checks).
   - Includes downgrade.

### Indexes introduced
- `ix_flight_watch_user_status_paused_created`
- `ix_price_snapshot_watch_captured`
- `ix_alert_rule_watch_enabled`
- `ix_notification_event_rule_created`
- `ix_user_session_user_active_last_seen`
- `ix_security_activity_user_created`
- `ix_idempotency_record_created_at`

### Migration compatibility bugs fixed
- SQLite-style boolean defaults (`server_default=sa.text("0"/"1")`) broke on PostgreSQL.
- Fixed in old migrations using `sa.false()/sa.true()`:
  - `0001_initial.py`
  - `0002_add_is_admin.py`
  - `0004_account_system_redesign.py`

---
## T5. Retention policy

Script: `backend/scripts/db_retention.py`

Initial retention windows:
- `price_snapshot`: 180 days
- `notification_event`: 90 days
- `security_activity` (activity logs): 180 days
- `idempotency_record` (job-like dedupe log): 7 days

Run example:
```bash
python scripts/db_retention.py \
  --price-snapshot-days 180 \
  --notification-event-days 90 \
  --security-activity-days 180 \
  --idempotency-days 7
```

---
## T6. Migration trial (staging-like)

Environment:
- Docker PostgreSQL 16 (`viru-c5-pg`, port `55432`)
- Schema provisioned via Alembic to head.
- Data copy trial from local SQLite using `backend/scripts/migrate_sqlite_to_postgres.py`.

Evidence:
- `docs/qa/evidence/c5/migration_trial.log`
- `docs/qa/evidence/c5/migration_trial_counts.log`

Count parity for key tables: PASS (including missing-in-source table case for `idempotency_record` -> 0 rows in target).

---
## T7. Backup + restore validation

Backup:
- `pg_dump -Fc` generated: `docs/qa/evidence/c5/backups/viru_c5.dump` (~18MB)
- Log: `docs/qa/evidence/c5/backup.log`

Restore:
- Restored into clean DB `viru_restore` using `pg_restore`
- Row-count verification done post-restore
- Log: `docs/qa/evidence/c5/restore.log`

Status: PASS.

---
## T8. Recovery runbook

1. Stop writers (or put backend in maintenance mode).
2. Take snapshot backup:
   ```bash
   pg_dump -U viru -d viru -Fc -f /secure/backups/viru_$(date +%F_%H%M).dump
   ```
3. Validate backup integrity quickly:
   ```bash
   pg_restore -l /secure/backups/viru_*.dump | head
   ```
4. Restore to side DB first:
   ```bash
   createdb viru_restore
   pg_restore -U viru -d viru_restore /secure/backups/viru.dump
   ```
5. Run smoke checks (health + critical counts + login/watchlist/history endpoints).
6. Swap traffic only after validation.

Current limits / open risks for C6:
- No PITR/WAL archival yet (only dump/restore).
- Retention currently manual/scripted; not yet scheduled by orchestrator.
- No partitioning yet for `price_snapshot`; revisit when volume grows (>10M rows).
- Need migration locking budget/SLO definition for prod deploy windows.

---
## Explicit bugs fixed during C5

1. **Alembic Postgres incompatibility**: boolean defaults used SQLite literals (`0/1`).
   - Fixed by using `sa.false()/sa.true()`.
2. **Alembic revision length overflow**: revision ids exceeded 32 chars (fails updating `alembic_version`).
   - Fixed by shortening to `0006_catchup_core` and `0007_pg_ops_idx`.
3. **Account deletion FK bug**: `idempotency_record` rows were not deleted before deleting `users`, risking FK failure.
   - Fixed in `backend/app/api/v1/account.py`.
4. **Email comparison casing bug** in account profile update.
   - Fixed by normalized lowercase compare/set.

---
## Checklist (C-B1..C-D2)

- C-B1: Environment matrix + secret handling documented — **PASS**
- C-B2: Critical query audit with evidence — **PASS**
- C-B3: Pragmatic indexes added — **PASS**
- C-C1: Rollback-safe Alembic migrations (upgrade + downgrade) — **PASS**
- C-C2: Retention policy defined + executable script — **PASS**
- C-D1: Staging-like migration trial executed + verified — **PASS**
- C-D2: Real backup+restore verified + runbook documented — **PASS**





