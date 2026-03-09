# Ciclo 6 — QA visual obligatorio de rutas core

## Rutas core definidas
- `/dashboard`
- `/watchlist`
- `/quick-search`
- `/alerts`
- `/login`
- `/register`

Rutas adicionales incluidas:
- `/ayuda`
- `/policies`

## Resoluciones aplicadas
- Desktop `1440x900`
- Mobile `375x812` (iPhone 13)
- Mobile `320x780`

## Estados revisados (pasada inicial)
- Dashboard: normal + banner/notices + datos mínimos
- Watchlist: lista + vacío + actualización
- Quick-search: loading + empty + error + resultados
- Alerts: lista + vacío + toggle + historial
- Auth: login/register normal + validaciones

## Evidencia visual
Se generaron capturas en `docs/qa/snapshots/`:
- `dashboard-desktop.png`
- `watchlist-desktop.png`
- `quick-search-desktop.png`
- `alerts-desktop.png`
- `login-desktop.png`
- `register-desktop.png`
- `ayuda-desktop.png`
- `policies-desktop.png`
- variantes `-mobile375.png` para rutas privadas core
- variantes `-mobile320.png` para rutas privadas core

## Integración en flujo PR
Se añadió plantilla de PR con bloque obligatorio de UI visual:
- `.github/pull_request_template.md`

## Verificación técnica
- Build frontend: OK
- TypeScript: OK

## Riesgos visuales detectados (no bloqueantes)
1. Quick-search es la ruta con mayor complejidad visual y mayor riesgo de regresión.
2. Dashboard puede degradarse si se mezclan varios CTAs primarios en futuros PRs.
3. Watchlist y alerts requieren mantener consistencia de status-pill/notice tras cambios de copy.
