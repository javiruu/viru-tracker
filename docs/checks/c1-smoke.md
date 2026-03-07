# C1 Smoke Manual

Fecha: 2026-03-07
Scope: hardening de sesion + rutas puente C1.

## Pasos
1. Sin token en `localStorage`, abrir `/watchlist`.
Esperado: redireccion a `/login?returnUrl=%2Fwatchlist`.

2. Sin token, abrir `/alerts?tab=events`.
Esperado: redireccion a `/login?returnUrl=%2Falerts%3Ftab%3Devents`.

3. Con token invalido (`viru_token=abc`), abrir `/dashboard`.
Esperado: llamada a `/api/v1/auth/me` devuelve 401 `invalid_auth`, token se limpia y redireccion a login.

4. Estando autenticado, abrir `/history`.
Esperado: redireccion a `/watchlist`.

5. Estando autenticado, abrir `/preferences`.
Esperado: redireccion a `/preferencias/busqueda`.

6. Login correcto con `returnUrl=%2Fquick-search`.
Esperado: post-login navega a `/quick-search`.
