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

is_ready() {
  curl -s -f -o /dev/null -m 2 "$APP_URL"
}

# 2. Check and start local server if not running
if ! is_ready; then
  # Check if port 3000 is blocked by another PID
  if lsof -i :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port $PORT is occupied. Attempting to use existing service."
  else
    echo "Starting VectorAutomator server in background..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    
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
  fi
fi

# 3. Open in isolated desktop window (Chrome / Edge App mode or default browser)
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
