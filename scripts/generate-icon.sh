#!/bin/bash

# ==============================================================================
# VectorAutomator Icon Generator
# Generates a high-resolution macOS Big Sur+ style app icon (Blue background, White V)
# and compiles it into an applet.icns file using native AppKit and iconutil.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESOURCES_DIR="${PROJECT_DIR}/scripts/assets"
ICONSET_DIR="${PROJECT_DIR}/scripts/assets/VectorAutomator.iconset"
OUTPUT_ICNS="${PROJECT_DIR}/scripts/assets/applet.icns"

mkdir -p "$RESOURCES_DIR"
mkdir -p "$ICONSET_DIR"

# 1. Render 1024x1024 Master Icon using Swift / AppKit
cat << 'EOF' > "${RESOURCES_DIR}/render_icon.swift"
import Cocoa

let size: CGFloat = 1024.0
let image = NSImage(size: NSSize(width: size, height: size))

image.lockFocus()

guard let context = NSGraphicsContext.current?.cgContext else {
    exit(1)
}

// Background: rounded squircle
let rect = CGRect(x: 48, y: 48, width: 928, height: 928)
let path = NSBezierPath(roundedRect: rect, xRadius: 210, yRadius: 210)

// Blue Gradient Fill
let colorSpace = CGColorSpaceCreateDeviceRGB()
let topColor = NSColor(calibratedRed: 37.0/255.0, green: 99.0/255.0, blue: 235.0/255.0, alpha: 1.0).cgColor // #2563eb
let bottomColor = NSColor(calibratedRed: 29.0/255.0, green: 78.0/255.0, blue: 216.0/255.0, alpha: 1.0).cgColor // #1d4ed8
let colors = [topColor, bottomColor] as CFArray

if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0.0, 1.0]) {
    context.saveGState()
    path.addClip()
    context.drawLinearGradient(gradient, start: CGPoint(x: 512, y: 976), end: CGPoint(x: 512, y: 48), options: [])
    context.restoreGState()
}

// Subtle border highlight
NSColor(white: 1.0, alpha: 0.15).setStroke()
path.lineWidth = 4
path.stroke()

// White Letter 'V'
let font = NSFont.systemFont(ofSize: 560, weight: .black)
let text = "V"
let paragraphStyle = NSMutableParagraphStyle()
paragraphStyle.alignment = .center

let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white,
    .paragraphStyle: paragraphStyle
]

let str = NSAttributedString(string: text, attributes: attrs)
let textSize = str.size()
let textRect = CGRect(
    x: (size - textSize.width) / 2.0,
    y: ((size - textSize.height) / 2.0) - 20.0,
    width: textSize.width,
    height: textSize.height
)

str.draw(in: textRect)

image.unlockFocus()

if let tiffData = image.tiffRepresentation,
   let bitmap = NSBitmapImageRep(data: tiffData),
   let pngData = bitmap.representation(using: .png, properties: [:]) {
    let outURL = URL(fileURLWithPath: CommandLine.arguments[1])
    try? pngData.write(to: outURL)
}
EOF

MASTER_PNG="${RESOURCES_DIR}/icon_1024.png"
echo "Rendering 1024x1024 master icon..."
swift "${RESOURCES_DIR}/render_icon.swift" "$MASTER_PNG"
rm -f "${RESOURCES_DIR}/render_icon.swift"

if [ ! -f "$MASTER_PNG" ]; then
  echo "Error: Failed to render master PNG."
  exit 1
fi

# 2. Build .iconset resolutions via sips
echo "Generating multi-resolution iconset..."
sips -z 16 16     "$MASTER_PNG" --out "${ICONSET_DIR}/icon_16x16.png" >/dev/null
sips -z 32 32     "$MASTER_PNG" --out "${ICONSET_DIR}/icon_16x16@2x.png" >/dev/null
sips -z 32 32     "$MASTER_PNG" --out "${ICONSET_DIR}/icon_32x32.png" >/dev/null
sips -z 64 64     "$MASTER_PNG" --out "${ICONSET_DIR}/icon_32x32@2x.png" >/dev/null
sips -z 128 128   "$MASTER_PNG" --out "${ICONSET_DIR}/icon_128x128.png" >/dev/null
sips -z 256 256   "$MASTER_PNG" --out "${ICONSET_DIR}/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$MASTER_PNG" --out "${ICONSET_DIR}/icon_256x256.png" >/dev/null
sips -z 512 512   "$MASTER_PNG" --out "${ICONSET_DIR}/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$MASTER_PNG" --out "${ICONSET_DIR}/icon_512x512.png" >/dev/null
sips -z 1024 1024 "$MASTER_PNG" --out "${ICONSET_DIR}/icon_512x512@2x.png" >/dev/null

# 3. Compile to applet.icns
echo "Compiling ICNS icon..."
iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_ICNS"

# Cleanup iconset folder
rm -rf "$ICONSET_DIR"

if [ -f "$OUTPUT_ICNS" ]; then
  echo "Successfully generated $OUTPUT_ICNS"
else
  echo "Error: Failed to create applet.icns"
  exit 1
fi

exit 0
