Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c7-cycle1-baseline-freeze.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# 3) Evidencia (archivos verificados)

### Suggestions (copy hardcoded + poco i18n)
- `frontend/src/app/(private)/suggestions/page.tsx`
  - Texto visible hardcoded en español (títulos, CTA, estados, errores).
  - No usa `t()` de i18n para la mayor parte del contenido.

### Admin (tono operativo interno + hardcoded)
- `frontend/src/app/(private)/admin/page.tsx`
  - Copy técnica/operativa hardcoded.
  - Tono inconsistente con pantallas de producto orientadas a usuario final.

### Policies (extensa, hardcoded ES, claims operativos)
- `frontend/src/app/(public)/policies/page.tsx`
  - Contenido legal/operativo casi completamente hardcoded.
  - Varias afirmaciones requieren anclaje con operación real (p. ej., plazos, estado de servicios, revisiones por país).

### i18n base (correcta)
- `frontend/src/i18n/index.ts` (base sólida es/en + persistencia locale)
- `frontend/src/modules/shared/quickSearchCopy.ts` (ejemplo de dominio con i18n consistente)

### Legacy bridges activos
- `frontend/src/modules/shared/routeBridges.ts`
  - `/history -> /watchlist`
  - `/preferences -> /preferencias`

### Deuda técnica UTC
- Búsqueda backend: `grep -R "datetime\.utcnow" backend/app`
- Hallazgos en:
  - `backend/app/api/v1/account.py`
  - `backend/app/api/v1/watchlist.py`
  - `backend/app/api/v1/auth.py`
  - `backend/app/services/security_activity.py`
  - `backend/app/services/alert_service.py`
  - `backend/app/infrastructure/db/models.py`
  - `backend/app/infrastructure/providers/ryanair_public_provider.py`
  - `backend/app/infrastructure/providers/ryanair_py_adapter.py`

### Warnings hooks (pendiente abierto)
- `docs/qa/2026-03-08-c6-open-issues.md` (C6-001)
- `docs/qa/2026-03-08-c6-command-outputs.md` (build OK con warnings)

---

## 4) Matriz baseline (resumen)

| Área | Estado baseline | Riesgo | Prioridad siguiente ciclo |
|---|---|---|---|
| Suggestions copy/i18n | Hardcoded ES, tono no homogeneizado | Medio | Alta |
| Admin copy/UX | Operativo interno, poco refinado | Medio | Alta |
| Policies claims | Texto extenso hardcoded + claims no trazados 1:1 | Medio/Alto | Alta |
| i18n core | Base correcta (`t()`, locale persistente) | Bajo | Mantener |
| UTC backend | `utcnow()` generalizado | Alto | Alta |
| Hooks warnings | Pendiente conocido C6 | Medio | Alta |
| Legacy bridges | Activos como transición | Bajo | Media |

---

## 5) Freeze de comportamiento (criterios)

Queda congelado como baseline para siguientes ciclos:

1. Flujos core no se alteran (auth/session, watchlist/history, quick-search, alerts, recommendations, account/admin).
2. Rutas canónicas actuales se mantienen; bridges legacy siguen vivos durante transición.
3. Cualquier mejora en C7.2+ deberá ser de pulido/cohesión, no de feature nueva.
4. Claims sensibles en políticas/ayuda no se endurecen ni amplían sin evidencia operativa.

---

## 6) Obligaciones activas para C7.2+

1. Todo copy visible en Suggestions/Admin debe migrar a i18n (`t()`).
2. Toda afirmación sensible en Policies/Help debe mapearse a evidencia real o reformularse.
3. Reemplazar `datetime.utcnow()` por `datetime.now(timezone.utc)` con tipado consistente.
4. Cerrar warnings de hooks priorizados (dashboard/quick-search) sin cambio funcional.
5. Mantener build/tests/smoke en verde en cada ciclo.

---

## 7) Peligros identificados

1. **Riesgo de regresión de comportamiento** al “arreglar warnings de hooks”.
2. **Riesgo legal/comercial** por claims de políticas no soportados por operación real.
3. **Riesgo de inconsistencia UX** si se pulen pantallas aisladas sin guía de tono común.
4. **Riesgo de deuda oculta** si i18n se aplica parcial (hardcoded residual en áreas críticas).

---

## 8) Definition of Done del Ciclo 1

- [x] Baseline documentado y verificable con rutas/archivos concretos.
- [x] Matriz de deuda de copy/i18n/claims/UTC/hooks creada.
- [x] Freeze de comportamiento definido para proteger C7.2+.
- [x] Sin cambios funcionales introducidos en este ciclo.

Resultado: ✅ C7 Ciclo 1 completado.





