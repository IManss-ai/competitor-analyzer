#!/usr/bin/env bash
set -euo pipefail

export SCRAPER_URL="${SCRAPER_URL:-http://localhost:3001}"

# DB migrations
alembic upgrade head

# Start the Node scraper sidecar in the background
node /app/scraper-service/dist/index.js &
SCRAPER_PID=$!

# Wait for the sidecar /health (max ~60s)
for i in $(seq 1 60); do
  if curl -fsS http://localhost:3001/health >/dev/null 2>&1; then
    echo "[start] scraper sidecar healthy"
    break
  fi
  if ! kill -0 "$SCRAPER_PID" 2>/dev/null; then
    echo "[start] scraper sidecar exited early" >&2
    break
  fi
  sleep 1
done

# Hand off to uvicorn (foreground / PID 1 work)
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
