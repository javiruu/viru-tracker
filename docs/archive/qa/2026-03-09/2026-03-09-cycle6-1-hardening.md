Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-09-cycle6-1-hardening.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# QA Hardening — Ciclo 6.1 (2026-03-09)

## Alcance
- Lint técnico
- Snapshot visual básico desktop/mobile
- Consolidación inicial de estilos compartidos en `components.css`

## Evidencias

### 1) Lint
Comando:
```bash
cd frontend
npm run lint
```
Resultado: **OK** (`No ESLint warnings or errors`).

### 2) Build
Comando:
```bash
cd frontend
npm run build
```
Resultado: **OK**.

### 3) Snapshots manuales automatizados (Playwright)
URLs verificadas:
- `/login`
- `/policies`

Resoluciones:
- Desktop (1440x900)
- Mobile (iPhone 13)

Archivos:
- `docs/qa/snapshots/login-desktop.png`
- `docs/qa/snapshots/login-mobile.png`
- `docs/qa/snapshots/policies-desktop.png`
- `docs/qa/snapshots/policies-mobile.png`

### 4) Consolidación de estilos compartidos
- Nuevo `components.css` con primitivas:
  - `.card`
  - `.panel-header`
  - `.status-pill` (+ variantes `success|warn|error`)
  - `.action-row` (y compatibilidad `.row-actions`)
- Eliminada duplicidad directa de `.row-actions` en `screens.css`.

## Veredicto
Hardening técnico **PASS** con regresión funcional nula y cambio visual controlado mínimo.





