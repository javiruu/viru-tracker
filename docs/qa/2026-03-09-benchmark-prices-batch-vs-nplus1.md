# Benchmark — `/prices/history` N+1 vs `/prices/history/batch`

Fecha: 2026-03-09

## Objetivo
Documentar comparación formal entre:
- Estrategia N+1: `GET /api/v1/prices/history?watch_id=...` por cada watch.
- Estrategia batch: `POST /api/v1/prices/history/batch` con todos los watch_ids.

## Script
`backend/scripts/benchmark_prices_batch_vs_nplus1.py`

## Ejecución recomendada
```bash
backend/.venv/bin/python backend/scripts/benchmark_prices_batch_vs_nplus1.py --watches 100 --snapshots-per-watch 50
```

## Métricas reportadas
- `n_plus_one_ms`
- `batch_ms`
- `speedup_x`
- filas recuperadas por cada estrategia

## Resultado de referencia (local)
Comando ejecutado:
```bash
backend/.venv/bin/python backend/scripts/benchmark_prices_batch_vs_nplus1.py --watches 30 --snapshots-per-watch 20
```

Salida:
- `n_plus_one_rows`: 600
- `batch_rows`: 600
- `n_plus_one_ms`: 490.96
- `batch_ms`: 58.84
- `speedup_x`: 8.34

## Nota operativa
Para payloads grandes, usar:
- `captured_since_utc` para recortar ventana temporal.
- `max_rows` para hard-cap de respuesta y evitar latencias extremas / payloads excesivos.

Si `total_rows > max_rows`, la API responde `413 batch_history_too_large`.
