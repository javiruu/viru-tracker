# C7.1 — Inventario técnico baseline (UTC + hooks + transición)

Fecha: 2026-03-08

## 1) `datetime.utcnow()` (backend)

### Hallazgo
Uso generalizado de `datetime.utcnow()` en API, servicios, modelos y proveedores.

### Evidencias
- `backend/app/api/v1/account.py`
- `backend/app/api/v1/watchlist.py`
- `backend/app/api/v1/auth.py`
- `backend/app/services/security_activity.py`
- `backend/app/services/alert_service.py`
- `backend/app/infrastructure/db/models.py`
- `backend/app/infrastructure/providers/ryanair_public_provider.py`
- `backend/app/infrastructure/providers/ryanair_py_adapter.py`

### Riesgo
- Inconsistencia temporal (naive/aware).
- Ruido de deprecación y futuros fallos de compatibilidad.

### Obligación siguiente ciclo técnico
Migrar a `datetime.now(timezone.utc)` con tipado coherente y tests de regresión temporal.

---

## 2) Warnings `react-hooks/exhaustive-deps`

### Hallazgo
Warnings pendientes en build frontend, especialmente dashboard y quick-search.

### Evidencia
- `docs/qa/2026-03-08-c6-open-issues.md` (C6-001)
- `docs/qa/2026-03-08-c6-command-outputs.md` (build PASS con warnings)

### Riesgo
- Side-effects frágiles por dependencias incompletas.
- Dificultad de mantenimiento en módulos largos.

### Obligación
Resolver por prioridad funcional, con smoke de no regresión en quick-search/dashboard.

---

## 3) Legacy bridges en transición

### Hallazgo
Rutas legacy aún vivas por compatibilidad:
- `/history -> /watchlist`
- `/preferences -> /preferencias`

### Evidencia
- `frontend/src/modules/shared/routeBridges.ts`

### Riesgo
- Deuda permanente si no se define fecha de retiro.

### Obligación
Definir política de retirada con telemetría/uso y ventana de deprecación.

---

## 4) Operación DB (retención no programada)

### Hallazgo
Existe script de retención, pero no evidencia de scheduling activo.

### Evidencia
- `backend/scripts/db_retention.py`
- `docs/qa/2026-03-08-c6-open-issues.md` (C6-004)

### Riesgo
- Crecimiento silencioso de tablas de alto volumen.

### Obligación
Activar scheduler + monitoreo de ejecución.
