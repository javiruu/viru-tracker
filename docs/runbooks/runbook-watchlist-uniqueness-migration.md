# Runbook — Migración de unicidad watchlist (0008)

## Objetivo
Garantizar que exista un único watch por `(user_id, origin_iata, destination_iata, travel_date_local)`.

## Estrategia de deduplicación
- **Fila ganadora:** la más reciente por `created_at DESC, id DESC`.
- Filas duplicadas:
  - Se reasignan sus `price_snapshot.watch_id` al watch ganador.
  - Se reasignan sus `alert_rule.watch_id` al watch ganador.
  - Luego se eliminan los watches duplicados.

Esto evita pérdida de snapshots/reglas válidas durante la limpieza.

## Pre-check (antes de deploy)
```bash
backend/.venv/bin/python backend/scripts/check_watchlist_duplicates.py
```
- Exit code `0`: no hay duplicados.
- Exit code `1`: existen duplicados (se listan muestras en JSON).

## Aplicación de migración
```bash
cd backend
DB_URL=<tu_db_url> .venv/bin/alembic upgrade head
```

## Verificación post-migración
- Confirmar que el índice existe: `uq_flight_watch_user_route_date`.
- Reejecutar pre-check: debe devolver `duplicate_groups = 0`.

## Rollback
```bash
cd backend
DB_URL=<tu_db_url> .venv/bin/alembic downgrade 0007_pg_ops_idx
```
Rollback elimina el índice único. **No recrea duplicados previamente consolidados** (esperado).

## Impacto API
- `POST /api/v1/watchlist` devuelve `409 watch_already_exists` para duplicados.
