# Runbook — Canonicalización de rutas (frontend)

## Rutas canónicas actuales
- `/dashboard`
- `/watchlist`
- `/quick-search`
- `/alerts`
- `/preferencias`

## Rutas puente históricas (mantener por compatibilidad)
- `/history` → redirige a `/watchlist`
- `/preferences` → redirige a `/preferencias`

Motivo: compatibilidad con enlaces antiguos y accesos guardados.

## Regla de mantenimiento
- No crear nuevas rutas puente salvo necesidad de compatibilidad.
- Toda navegación interna debe apuntar siempre a la ruta canónica.
- Si se elimina una ruta puente, validar primero métricas/uso y enlaces externos.
