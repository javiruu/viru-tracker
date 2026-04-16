Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c7-cycle7-db-retention-evidence.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# C7 / Cycle 7 - Evidencia de automatización DB retention

Fecha: 2026-03-08  
Entorno de validación: staging-like local SQLite (`/tmp/viru-retention-staging.db`) con datos sintéticos y relaciones reales.

## 1) Preparación
Se creó DB temporal y se insertaron por tabla:
- 1 registro viejo (debe borrarse)
- 1 registro reciente (debe quedarse)

Tablas validadas:
- `price_snapshot`
- `notification_event`
- `security_activity`
- `idempotency_record`

## 2) Dry-run (sin borrado)
Comando:
```bash
DB_URL="sqlite:////tmp/viru-retention-staging.db" ops/db-retention/run-db-retention.sh --dry-run
```

Extracto de log:
```json
{"event":"db_retention.run_completed","status":"ok","dry_run":true,"totals":{"candidates":4,"deleted":0}}
```

## 3) Ejecución real
Comando:
```bash
DB_URL="sqlite:////tmp/viru-retention-staging.db" ops/db-retention/run-db-retention.sh
```

Extracto de log exitoso:
```json
{"event":"db_retention.table_completed","table":"price_snapshot","candidates":1,"deleted":1,"batches":1,"dry_run":false}
{"event":"db_retention.table_completed","table":"notification_event","candidates":1,"deleted":1,"batches":1,"dry_run":false}
{"event":"db_retention.table_completed","table":"security_activity","candidates":1,"deleted":1,"batches":1,"dry_run":false}
{"event":"db_retention.table_completed","table":"idempotency_record","candidates":1,"deleted":1,"batches":1,"dry_run":false}
{"event":"db_retention.run_completed","status":"ok","dry_run":false,"totals":{"candidates":4,"deleted":4}}
```

Verificación post-run (conteos restantes):
```text
remaining {'price_snapshot': 1, 'notification_event': 1, 'security_activity': 1, 'idempotency_record': 1}
```

Resultado: se eliminaron solo los datos fuera de ventana; los recientes permanecen.

## 4) Comportamiento ante fallo (guard rail)
Comando forzando ventana insegura:
```bash
DB_URL="sqlite:////tmp/viru-retention-staging.db" DB_RETENTION_ALERT_FILE="/tmp/db-retention-failure.json" ops/db-retention/run-db-retention.sh --idempotency-days 1
```

Resultado:
- Exit code: `1`
- Evento: `db_retention.run_failed`
- Alerta escrita en `/tmp/db-retention-failure.json`

Extracto:
```json
{"status":"failed","error_type":"ValueError","error":"Unsafe retention window for idempotency_days: got 1, requires >= 3 days"}
```





