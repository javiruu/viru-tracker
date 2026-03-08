# C7 — Ciclo 2 (Copy/i18n en Suggestions + Admin)

Fecha: 2026-03-08
Estado: ✅ COMPLETADO

## Objetivo del ciclo
Unificar copy visible crítica en `suggestions` y `admin` bajo i18n estándar (`t()`), normalizar tono y reducir hardcoded residual sin cambiar comportamiento funcional.

## Constraints aplicados
1. Sin cambios de lógica de negocio/endpoints.
2. Sin cambios de rutas ni contratos API.
3. Mantener UX y acciones existentes (solo capa textual/idioma + cohesión).
4. Build y tests deben seguir en verde.

## Cambios realizados

### 1) Nuevo dominio i18n Suggestions
- Archivo nuevo: `frontend/src/i18n/domains/suggestions.ts`
- Incluye ES/EN para:
  - título/subtítulo,
  - labels,
  - placeholders,
  - contador,
  - CTA y toasts,
  - validaciones básicas.

### 2) Nuevo dominio i18n Admin
- Archivo nuevo: `frontend/src/i18n/domains/admin.ts`
- Incluye ES/EN para:
  - encabezados,
  - diagnóstico/checks,
  - estado sistema,
  - acciones de usuario/admin,
  - confirmaciones,
  - notificaciones,
  - footer técnico.

### 3) Registro de nuevos dominios en diccionarios
- `frontend/src/i18n/es.ts`
- `frontend/src/i18n/en.ts`
- Nuevos nodos: `suggestions`, `admin`.

### 4) Migración de Suggestions a `t()`
- `frontend/src/app/(private)/suggestions/page.tsx`
- Hardcoded crítico sustituido por keys i18n.

### 5) Migración de Admin a `t()`
- `frontend/src/app/(private)/admin/page.tsx`
- Hardcoded crítico sustituido por keys i18n.
- Ajuste adicional: `updatedAt` ahora usa `localeTag` de i18n en lugar de `"es-ES"` fijo.

## Verificación

### Tests
```bash
npm run test -- tests/quick-search-copy.test.ts tests/navigation-route-bridges.test.ts
```
Resultado: ✅ PASS (8/8)

### Build
```bash
npm run build
```
Resultado: ✅ PASS

Notas:
- Persisten warnings conocidos de hooks en dashboard/quick-search (ya inventariados para ciclo técnico posterior).
- En admin desaparecen warnings nuevos introducidos por la migración.

## Obligaciones cerradas en este ciclo
- [x] Suggestions usa i18n para copy principal.
- [x] Admin usa i18n para copy principal.
- [x] Tono más homogéneo con el resto del producto.
- [x] Sin cambio funcional.

## Peligros observados y mitigación
1. **Riesgo de key faltante** en runtime: mitigado con build completo y revisión de claves.
2. **Riesgo de regresión por hooks deps** tras usar `t()/localeTag`: mitigado ajustando dependencias en callbacks/effects del admin.
3. **Riesgo de traducción inconsistente**: mitigado con pares ES/EN en el mismo commit para mantener paridad.

## Pendiente para siguientes ciclos
- Policies sigue con copy hardcoded extenso (C7.3).
- Normalización transversal de claims sensibles (C7.3).
- Deuda técnica UTC/hooks global no cerrada aún (C7.5/C7.6).
