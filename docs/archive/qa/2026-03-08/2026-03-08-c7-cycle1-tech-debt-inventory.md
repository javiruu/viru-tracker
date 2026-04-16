Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c7-cycle1-tech-debt-inventory.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# 3) Legacy bridges en transición

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





