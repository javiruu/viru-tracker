Status: archived
Scope: archived QA evidence or release history
Last reviewed: 2026-04-15
Original source: docs/qa/2026-03-08-c3-navigation-route-mapping.md
Related: docs/archive/README.md, docs/INDICE_UNICO.md

---
# C3 — Route mapping (legacy -> canonical)

Fecha: 2026-03-08

## Objetivo
Evitar enlaces rotos durante la unificación de navegación (v1), manteniendo compatibilidad con rutas antiguas.

## Mapeo oficial

| Legacy | Canonical v1 | Estrategia |
|---|---|---|
| `/history` | `/watchlist` | Redirect client-side (bridge) |
| `/preferences` | `/preferencias` | Redirect client-side (bridge) |
| `/preferencias/busqueda` | `/preferencias?tab=busqueda` | Canonical de navegación (se mantiene deep-link actual) |
| `/preferencias/apariencia` | `/preferencias?tab=apariencia` | Canonical de navegación (se mantiene deep-link actual) |
| `/preferencias/region` | `/preferencias?tab=region` | Canonical de navegación (se mantiene deep-link actual) |

## Notas de compatibilidad
- No se elimina ninguna pantalla funcional.
- Se mantiene acceso directo a subrutas de preferencias para bookmarks existentes.
- El punto de entrada único para ajustes es `/preferencias`.
- Ayuda pública y privada comparten base de renderizado (HelpBase) con CTAs contextuales.





