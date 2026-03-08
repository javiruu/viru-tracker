# C7.1 — Matriz copy/i18n (hardcoded vs `t()`)

Fecha: 2026-03-08

## Criterio
- **Hardcoded**: texto visible definido inline en componente/página.
- **i18n**: texto servido vía `t()` o dominio i18n.

## Hallazgos por archivo

### 1) `frontend/src/app/(private)/suggestions/page.tsx`
- Estado: **Hardcoded dominante**.
- Evidencias:
  - Título/subtítulo, placeholders, CTA, mensajes de éxito/error están inline.
  - No hay uso de `t()` para contenido principal.
- Impacto: alto en consistencia lingüística y extensibilidad EN.

### 2) `frontend/src/app/(private)/admin/page.tsx`
- Estado: **Hardcoded dominante**.
- Evidencias:
  - Labels/acciones/errores y estados de sistema inline.
  - Tono operativo interno no armonizado con resto del producto.
- Impacto: alto en cohesión de producto y percepción de acabado.

### 3) `frontend/src/app/(public)/policies/page.tsx`
- Estado: **Hardcoded total (contenido largo)**.
- Evidencias:
  - Secciones completas, FAQ, CTAs y metadatos inline.
- Impacto: alto (mantenimiento + riesgo de drift entre idiomas/claims).

### 4) `frontend/src/modules/shared/quickSearchCopy.ts`
- Estado: **i18n sólido** (ES/EN + helpers + warnings).
- Evidencia:
  - Mapa completo por locale, funciones `t` y `tWarn`.
- Impacto: referencia positiva para migración de otras pantallas.

### 5) `frontend/src/i18n/index.ts`
- Estado: **infra i18n correcta**.
- Evidencia:
  - dominios, `t()`, persistencia locale.

---

## Resumen ejecutivo matriz

| Archivo | Estado | Riesgo | Acción C7.2 |
|---|---|---|---|
| suggestions/page.tsx | Hardcoded alto | Medio | Migrar copy a dominio i18n |
| admin/page.tsx | Hardcoded alto | Medio/Alto | Migrar copy + normalizar tono |
| policies/page.tsx | Hardcoded muy alto | Alto | Extraer copy/claims a fuente versionada |
| quickSearchCopy.ts | i18n fuerte | Bajo | Usar como patrón |
| i18n/index.ts | Base correcta | Bajo | Mantener |

---

## Regla de aceptación para siguientes ciclos
No se considera “cerrado” hasta que:
1. Suggestions/Admin usan `t()` para todo texto visible principal.
2. Policies tiene copy estructurado y versionado (aunque siga ES-first, sin texto suelto no gobernado).
3. Se reduzca drásticamente hardcoded en `frontend/src/app/(private)` para módulos foco.
