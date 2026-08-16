#!/bin/bash

# ==============================================================================
# VectorAutomator macOS .app Generator
# Compiles a native double-clickable .app bundle using osacompile and applies custom icon
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCH_SCRIPT="${PROJECT_DIR}/scripts/launch.sh"
ICON_SCRIPT="${PROJECT_DIR}/scripts/generate-icon.sh"
ICNS_FILE="${PROJECT_DIR}/scripts/assets/applet.icns"
APP_NAME="${PROJECT_DIR}/VectorAutomator.app"
DESKTOP_APP="$HOME/Desktop/VectorAutomator.app"

if [ ! -f "$LAUNCH_SCRIPT" ]; then
  echo "Error: launch.sh not found at $LAUNCH_SCRIPT"
  exit 1
fi

chmod +x "$LAUNCH_SCRIPT"

# 1. Ensure Icon is generated
if [ ! -f "$ICNS_FILE" ] && [ -f "$ICON_SCRIPT" ]; then
  echo "Generating app icon..."
  chmod +x "$ICON_SCRIPT"
  bash "$ICON_SCRIPT"
fi

echo "Building macOS application bundle at $APP_NAME..."

# Remove old app bundle if exists
rm -rf "$APP_NAME"

# 2. Use osacompile to create a clean native macOS application
osacompile -o "$APP_NAME" -e "do shell script \"${LAUNCH_SCRIPT} >/dev/null 2>&1 &\""

if [ -d "$APP_NAME" ]; then
  # 3. Embed Custom Icon in Bundle
  if [ -f "$ICNS_FILE" ]; then
    echo "Embedding custom applet.icns..."
    cp -f "$ICNS_FILE" "$APP_NAME/Contents/Resources/applet.icns"
    
    # Apply custom icon attribute via NSWorkspace
    swift -e "
    import Cocoa
    if let img = NSImage(contentsOfFile: \"${ICNS_FILE}\") {
        _ = NSWorkspace.shared.setIcon(img, forFile: \"${APP_NAME}\", options: [])
    }
    " 2>/dev/null || true
  fi

  echo "Successfully created $APP_NAME"
  
  # 4. Copy direct standalone bundle to Desktop (replaces symlink for native icon rendering)
  rm -rf "$DESKTOP_APP"
  cp -R "$APP_NAME" "$DESKTOP_APP"
  
  if [ -f "$ICNS_FILE" ]; then
    swift -e "
    import Cocoa
    if let img = NSImage(contentsOfFile: \"${ICNS_FILE}\") {
        _ = NSWorkspace.shared.setIcon(img, forFile: \"${DESKTOP_APP}\", options: [])
    }
    " 2>/dev/null || true
  fi
  
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$DESKTOP_APP" "$APP_NAME" 2>/dev/null || true
  killall Finder 2>/dev/null || true

  echo "Created standalone app on Desktop: $DESKTOP_APP"
  echo "You can now double-click VectorAutomator.app on your Desktop with the blue 'V' icon!"
else
  echo "Failed to create application bundle."
  exit 1
fi

exit 0
