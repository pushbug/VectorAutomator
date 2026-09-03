#!/bin/bash

# ==============================================================================
# VectorAutomator Safe Terminal Dev Launcher
# Checks port 3000 status first to prevent raw EADDRINUSE crashes and guide users.
# ==============================================================================

PORT=3000
APP_URL="http://localhost:${PORT}"

is_ready() {
  curl -s -f -o /dev/null -m 2 "$APP_URL"
}

# Check if port 3000 is already active
if is_ready; then
  ACTIVE_PID=$(lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -n 1)
  echo ""
  echo "=============================================================================="
  echo "⚡ VectorAutomator is already running at ${APP_URL} (PID: ${ACTIVE_PID:-active})"
  echo "=============================================================================="
  echo "• เซิร์ฟเวอร์เปิดใช้งานอยู่แล้ว คุณสามารถเปิดใช้งานบนเบราว์เซอร์ได้ทันที"
  echo "• เปิดหน้าต่างใหม่: เข้าผ่าน ${APP_URL} หรือกดปุ่ม 'New Window' ในหน้าเว็บ"
  echo "• ต้องการปิดเซิร์ฟเวอร์เดิม: พิมพ์ 'npm run app:stop'"
  echo "• ต้องการรีสตาร์ตเซิร์ฟเวอร์: พิมพ์ 'npm run app:restart'"
  echo "=============================================================================="
  echo ""
  exit 0
fi

# If port is occupied by a non-responsive dead socket, warn and clean up
OCCUPIED_PID=$(lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -n 1)
if [ -n "$OCCUPIED_PID" ]; then
  echo "Port $PORT is occupied by unresponsive PID $OCCUPIED_PID. Cleaning up..."
  kill -15 "$OCCUPIED_PID" 2>/dev/null || true
  sleep 1
fi

# Launch Next.js dev server on port 3000
exec next dev -p "$PORT"
