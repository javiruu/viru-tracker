# C7 — Ciclo 3 (Claims sensibles alineados con realidad operativa)

Fecha: 2026-03-08
Estado: ✅ COMPLETADO

## Objetivo
Eliminar sobrepromesas en políticas y ayuda, dejando copy legal/operativa con precisión basada en evidencia real del sistema.

## Alcance ejecutado
- `frontend/src/app/(public)/policies/page.tsx`
- `backend/app/api/v1/support.py`
- `backend/app/api/v1/public.py`

---

## Tabla obligatoria: claim -> evidencia -> texto final

| Claim previo | Evidencia real disponible | Texto final aplicado |
|---|---|---|
| "Todos los servicios están activos" (help privado) | Endpoint `/support/help` no ejecuta healthchecks en tiempo real; payload estático. | "Mostramos el estado operativo reportado por el backend en el momento de la consulta..." |
| "Seguimos monitoreando proveedores" (help privado) | Hay manejo de degradación/frescura, pero no promesa de monitorización total continua por este endpoint. | Se reformula a degradación reflejada en alertas/mensajes de frescura. |
| SLA fijos "Inmediato / 72h / 30 días / 24h" (policies) | No hay SLA contractual codificado en backend para estos tiempos exactos. | Sustituido por plazos prudentes: "según complejidad" / "según proceso operativo" / "tras finalizar proceso". |
| "Tokens rotativos" (policies) | Expiración de sesión/token sí; rotación garantizada en todo caso no está explicitada como contrato técnico. | Sustituido por "sesiones con expiración y controles de invalidación de acceso". |
| "Políticas por país versionadas con revisión editorial" | No hay sistema editorial regional formal explícito en código runtime. | Sustituido por "puede mostrar contenido contextual... cuando haya cambios relevantes se actualiza esta política". |
| "Puedes desactivar analítica" (universal) | Feature depende de configuración/entorno, no garantizada universalmente. | Sustituido por texto condicional: "si en tu entorno existe ajuste..." |
| Soporte público: promesa implícita de respuesta inmediata | No existe SLA garantizado en endpoint público. | Añadido "el tiempo de respuesta puede variar según volumen". |

---

## Cambios aplicados por archivo

### 1) `backend/app/api/v1/support.py`
- `status.message`: de "Operativo" a "Estado reportado por backend".
- sección "Estado del sistema": reformulada para evitar promesa absoluta.

### 2) `backend/app/api/v1/public.py`
- sección "Soporte": se añade nota de variabilidad de tiempos de respuesta.

### 3) `frontend/src/app/(public)/policies/page.tsx`
- reformulaciones de claims de SLA/proceso/tiempo.
- cambios en tabla de conservación y FAQ de analítica/políticas por país.
- ajustes de lenguaje para precisión operativa.

---

## Verificación de riesgo reputacional/legal (objetivo del ciclo)

- ✅ Eliminadas afirmaciones absolutas no sustentadas por telemetría/contrato técnico explícito.
- ✅ Ayuda pública y privada más coherentes en tono prudente.
- ✅ Se mantienen derechos y funcionalidad sin sobreprometer plazos fijos.

---

## Peligros mitigados

1. **Riesgo reputacional/legal por claims no soportados** -> mitigado con redacción prudente basada en evidencia.
2. **Inconsistencia entre ayuda pública y privada** -> mitigado alineando mensajes de estado/soporte.

---

## Definition of Done del ciclo 3

- [x] Revisados `policies/page.tsx`, `support.py`, `public.py`.
- [x] Claims SLA/proceso/tiempo reformulados o anclados en evidencia.
- [x] Tabla obligatoria claim->evidencia->texto final incluida.
- [x] Riesgos residuales de comunicación explícitos.
