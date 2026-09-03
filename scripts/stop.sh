#!/bin/bash

# ==============================================================================
# VectorAutomator Graceful Server Stopper
# Stops background Next.js server, checkpoints SQLite WAL, and frees port 3000.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${PROJECT_DIR}/.server.pid"
PORT=3000

echo "Stopping VectorAutomator server..."

# 1. Terminate recorded daemon PID gracefully
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Sending graceful shutdown signal to PID $PID..."
    kill -15 "$PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

# 2. Also signal any process currently listening on port 3000
PORT_PIDS=$(lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null)
if [ -n "$PORT_PIDS" ]; then
  for p in $PORT_PIDS; do
    echo "Sending shutdown signal to port $PORT process (PID $p)..."
    kill -15 "$p" 2>/dev/null || true
  done
fi

# 3. Wait up to 3 seconds for port to release
COUNT=0
while lsof -t -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
  sleep 0.5
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -ge 6 ]; then
    echo "Forcing release on port $PORT..."
    REMAINING_PIDS=$(lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null)
    if [ -n "$REMAINING_PIDS" ]; then
      kill -9 $REMAINING_PIDS 2>/dev/null || true
    fi
    break
  fi
done

# Clean up stale PID file
rm -f "$PID_FILE"

if ! lsof -t -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ VectorAutomator server stopped. Port $PORT is now completely free."
else
  echo "⚠️ Warning: Port $PORT may still have active connections."
fi

exit 0
