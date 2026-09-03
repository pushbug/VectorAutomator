#!/bin/bash

# ==============================================================================
# VectorAutomator Local Launcher Script
# Automatically resolves Node environment, boots server if needed,
# and opens the application in a standalone desktop-style window.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

# 1. Environment & PATH Resolution (Supports macOS GUI / Finder / launchd)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.local/bin:$PATH"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  \. "$NVM_DIR/nvm.sh"
elif [ -d "$HOME/.nvm/versions/node" ]; then
  LATEST_NVM_NODE="$(ls -d "$HOME/.nvm/versions/node"/v* 2>/dev/null | tail -n 1)/bin"
  if [ -d "$LATEST_NVM_NODE" ]; then
    export PATH="$LATEST_NVM_NODE:$PATH"
  fi
fi

if [ -f "$HOME/.zshrc" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.zshrc" 2>/dev/null || true
fi

# Verify Node availability
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "VectorAutomator Error" message "Node.js or npm is not found in PATH. Please ensure Node.js is installed."'
  exit 1
fi

PORT=3000
APP_URL="http://localhost:${PORT}"
LOG_FILE="${PROJECT_DIR}/.server.log"
PID_FILE="${PROJECT_DIR}/.server.pid"

is_ready() {
  curl -s -f -o /dev/null -m 2 "$APP_URL"
}

# 2. Check and start local server if not running
if is_ready; then
  echo "VectorAutomator server is already running on port $PORT. Spawning additional window..."
else
  # Check if port 3000 is occupied by a non-responsive process
  OCCUPIED_PID="$(lsof -i :"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1)"
  if [ -n "$OCCUPIED_PID" ]; then
    echo "Port $PORT occupied by PID $OCCUPIED_PID. Verifying readiness..."
    sleep 2
    if ! is_ready; then
      echo "Stale process detected on port $PORT (PID $OCCUPIED_PID). Gracefully stopping..."
      kill "$OCCUPIED_PID" 2>/dev/null || true
      sleep 1
    fi
  fi

  if ! is_ready; then
    echo "Starting VectorAutomator server on port $PORT in background..."
    nohup npx next dev -p "$PORT" > "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo "$SERVER_PID" > "$PID_FILE"
    
    # Wait for server readiness (up to 25 seconds)
    MAX_ATTEMPTS=25
    COUNT=0
    while ! is_ready; do
      sleep 1
      COUNT=$((COUNT + 1))
      if [ "$COUNT" -ge "$MAX_ATTEMPTS" ]; then
        osascript -e 'display alert "VectorAutomator Error" message "Server failed to start within 25 seconds. Please check .server.log for details."'
        exit 1
      fi
    done
    echo "VectorAutomator server ready on port $PORT."
  fi
fi

# 3. Open isolated desktop window (Chrome / Edge App mode or default browser)
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "/Applications/Google Chrome.app" --args --app="$APP_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "/Applications/Microsoft Edge.app" --args --app="$APP_URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "/Applications/Brave Browser.app" --args --app="$APP_URL"
else
  open "$APP_URL"
fi

exit 0
