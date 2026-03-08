# C7.1 — Mapeo de claims sensibles (Help/Policies)

Fecha: 2026-03-08
Objetivo: trazar afirmaciones operativas a fuente de verdad real para evitar sobrepromesa.

## Tabla de mapeo

| Claim (texto actual) | Ubicación | Evidencia operativa actual | Estado |
|---|---|---|---|
| "Todos los servicios estan activos" | `backend/app/api/v1/support.py` (`help_payload`) | No hay chequeo runtime real dentro de este endpoint; string estático | ⚠️ Debe reformularse |
| "Seguimos monitoreando proveedores" | `support.py` | No hay enlace explícito a métrica/health específica en payload | ⚠️ Debe reformularse o instrumentarse |
| "Hasta 72h / 30 días / 24h" en flujo de borrado/portabilidad | `frontend/src/app/(public)/policies/page.tsx` | No hay SLA transaccional codificado en backend como garantía dura | ⚠️ Riesgo de sobrepromesa |
| "Sesiones con expiracion y tokens rotativos" | `policies/page.tsx` | Expiración de tokens sí existe; rotación en cada request no evidenciada como claim formal | ⚠️ Ajustar redacción |
| "Políticas por país versionadas con revisión editorial" | `policies/page.tsx` | No se observa sistema editorial dedicado en código backend/frontend | ⚠️ Inferido, no verificado |
| "Si desactivas analítica…" | `policies/page.tsx` | No se evidencia feature flag público de analytics opt-out en este baseline | ⚠️ Debe anclarse o matizarse |

---

## Claims con soporte razonable

| Claim | Ubicación | Evidencia |
|---|---|---|
| "No compartimos credenciales/tokens con terceros" | `policies/page.tsx` | Diseño de auth local + uso interno tokens, sin endpoint que exporte secretos (`backend/app/api/v1/auth.py`, `deps.py`) |
| "Deep-link puede fallar y se muestra alternativa" | `policies/page.tsx` | Flujos de quick-search/deeplink contemplan fallback de error (frontend quick-search + backend search) |
| "Alertas orientativas/no asesoramiento" | `policies/page.tsx` | Recomendaciones y alertas son heurísticas/umbral, no ejecución de compra |

---

## Obligación para C7.3

1. Reescribir claims marcados ⚠️ en términos verificables ("normalmente", "objetivo interno", "cuando aplica").
2. Donde exista evidencia técnica real (healthchecks, expiración), mantener claim con precisión.
3. Añadir referencia de versión/fecha de política ligada a proceso real de actualización de docs.
