# Runbook Proveedor Degradado

1. Detectar incremento de errores del adapter.
2. Abrir circuito y servir último snapshot válido (`stale=true`).
3. Reducir frecuencia de consulta y aplicar reintentos controlados.
4. Aplicar guardrail de ráfagas en refresh manual con `WATCH_REFRESH_COOLDOWN_SECONDS` (default: `60`).
   - Endpoint afectado: `POST /api/v1/watchlist/{watch_id}/refresh-now`
   - En cooldown activo devuelve `429 refresh_cooldown_active` + header `Retry-After`.
5. Observar ratio de bloqueos `429 refresh_cooldown_active` por `user_id/watch_id` en logs (`event=watch_refresh_denied_cooldown`).
6. Comunicar estado degradado en API/UI.
7. Recuperar gradualmente y reconciliar snapshots.
