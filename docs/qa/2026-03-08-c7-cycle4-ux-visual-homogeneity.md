# C7 — Ciclo 4 (Homogeneidad UX visual: admin/suggestions/policies)

Fecha: 2026-03-08
Estado: ✅ COMPLETADO

## Objetivo
Conseguir que `admin`, `suggestions` y `policies` se perciban como partes del mismo producto mediante refinamiento visual sutil (sin rediseño profundo).

## Alcance ejecutado

### 1) Normalización de spacing + jerarquía
- Ajuste de `page-header` para ritmo visual coherente:
  - margen inferior menos abrupto,
  - borde inferior suave,
  - mayor consistencia en separación con contenido.
- `page-title p` con ancho máximo y line-height uniforme para lectura estable.
- `panel` de admin/suggestions con padding fluido similar (`clamp`) para misma densidad.

### 2) Botones, cards, estados y toasts
- Suggestions:
  - acciones agrupadas con mejor alineación (`suggestions-actions`),
  - nuevo `state-pill` unificado (`idle/loading/success/error`) para feedback continuo.
- Admin:
  - estado empty/loading explícito en bloque diagnóstico cuando aún no hay checks.
- Policies:
  - nota contextual (`notice-info`) post-hero para reforzar marco operativo sin ruido.
  - redondeados y ritmo de lectura alineados con cards/panels del producto.

### 3) Ajustes responsive finos
- `page-header` en mobile con gap y padding más contenido.
- `state-pill` en mobile pasa a flujo natural (sin empujar layout).

---

## Archivos modificados

- `frontend/src/app/(private)/suggestions/page.tsx`
- `frontend/src/app/(private)/admin/page.tsx`
- `frontend/src/app/(public)/policies/page.tsx`
- `frontend/src/styles/globals.css`
- `frontend/scripts/c7_cycle4_visual_screenshots.mjs` (capturas before/after)

---

## Capturas before/after (obligación)

Generadas con Playwright y mocks estables:

### BEFORE
- `docs/qa/screenshots/c7.4/before/01-admin.png`
- `docs/qa/screenshots/c7.4/before/02-suggestions.png`
- `docs/qa/screenshots/c7.4/before/03-policies.png`

### AFTER
- `docs/qa/screenshots/c7.4/after/01-admin.png`
- `docs/qa/screenshots/c7.4/after/02-suggestions.png`
- `docs/qa/screenshots/c7.4/after/03-policies.png`

---

## Checklist visual (obligación)

### Padding y ritmo
- [x] Header y bloques principales con separación homogénea.
- [x] Cards/panels con densidad visual consistente entre las 3 páginas.

### Tipografía y jerarquía
- [x] Subtítulos de cabecera con line-height y ancho óptimos de lectura.
- [x] Titulación de secciones mantiene jerarquía coherente.

### CTAs y controles
- [x] Botones primarios/secundarios en patrones ya existentes (sin variaciones nuevas extrañas).
- [x] Grupo de acciones en suggestions con flujo estable desktop/mobile.

### Estados (empty/error/loading/success)
- [x] Suggestions: feedback continuo (`state-pill`) + toast.
- [x] Admin: estado de carga explícito en diagnóstico antes de checks.
- [x] Policies: estado contextual informativo consistente con `notice` del sistema.

### Responsive
- [x] Header y acciones mantienen legibilidad en mobile.
- [x] No se introducen overflows en estas tres vistas.

---

## Constraints respetados

- ✅ Sin rediseño profundo.
- ✅ Sin cambios de lógica de negocio.
- ✅ Sin cambios de contrato API/rutas.
- ✅ Refinamiento sobre sistema visual existente.

---

## Peligros y mitigación

1. **Romper densidad/flujo por “sobrepulido”**
   - Mitigación: cambios acotados a spacing, estados y microjerarquía; sin alterar composición base.

2. **Introducir variaciones nuevas en lugar de unificar**
   - Mitigación: reutilización de clases existentes (`panel`, `notice`, `toast`, `btn-*`) y extensión mínima (`cycle4-page`, `state-pill`).

---

## Verificación técnica

```bash
npm run build
npm run test -- tests/navigation-route-bridges.test.ts tests/quick-search-copy.test.ts
```

Resultado:
- Build: ✅ PASS
- Tests: ✅ PASS (8/8)
- Warnings existentes de hooks en dashboard/quick-search: sin cambios en este ciclo (deuda ya inventariada para ciclo técnico).
