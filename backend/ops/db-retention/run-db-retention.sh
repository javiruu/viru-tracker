#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="${DB_RETENTION_LOG_DIR:-$BACKEND_DIR/logs}"
LOCK_FILE="${DB_RETENTION_LOCK_FILE:-$BACKEND_DIR/logs/db-retention.lock}"
PYTHON_BIN="${DB_RETENTION_PYTHON:-$BACKEND_DIR/.venv/bin/python}"

mkdir -p "$LOG_DIR" "$(dirname "$LOCK_FILE")"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "db-retention: missing python runtime at $PYTHON_BIN" >&2
  exit 2
fi

export DB_RETENTION_LOG_FILE="${DB_RETENTION_LOG_FILE:-$LOG_DIR/db-retention.log}"
export DB_RETENTION_ALERT_FILE="${DB_RETENTION_ALERT_FILE:-$LOG_DIR/alerts/db-retention-failure.json}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "db-retention: another run is active, skipping" >&2
  exit 3
fi

cd "$BACKEND_DIR"

"$PYTHON_BIN" scripts/db_retention.py "$@"
