#!/usr/bin/env python3
"""
Generate crisp, modern, color-coded Chrome extension icons.
Outputs 16x16, 48x48, and 128x128 PNGs for Contributor ('C'), Sales ('S'), and SERP ('R').
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CONFIGS = [
    {
        "name": "contributor",
        "letter": "C",
        "bg_color": (79, 70, 229, 255),      # Indigo #4F46E5
        "output_dir": os.path.join(WORKSPACE_ROOT, "extension", "extension-contributor", "icons"),
    },
    {
        "name": "sales",
        "letter": "S",
        "bg_color": (5, 150, 105, 255),      # Emerald #059669
        "output_dir": os.path.join(WORKSPACE_ROOT, "extension", "extension-sales", "icons"),
    },
    {
        "name": "serp",
        "letter": "R",
        "bg_color": (217, 119, 6, 255),      # Amber #D97706
        "output_dir": os.path.join(WORKSPACE_ROOT, "extension", "extension-serp", "icons"),
    },
]

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNS.ttf",
]

def find_font():
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    return None

def render_badge(letter: str, bg_color: tuple, font_path: str) -> Image.Image:
    canvas_size = 512
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded squircle
    radius = int(canvas_size * 0.22)
    padding = 16
    draw.rounded_rectangle(
        [padding, padding, canvas_size - padding, canvas_size - padding],
        radius=radius,
        fill=bg_color,
    )

    # Draw centered bold letter
    font_size = int(canvas_size * 0.62)
    font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()

    bbox = font.getbbox(letter)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Calculate exact optical center
    text_x = (canvas_size - text_w) / 2 - bbox[0]
    text_y = (canvas_size - text_h) / 2 - bbox[1]

    # Render bold white text with slight subtle shadow
    draw.text((text_x, text_y + 4), letter, font=font, fill=(0, 0, 0, 50))
    draw.text((text_x, text_y), letter, font=font, fill=(255, 255, 255, 255))

    return img

def main():
    dry_run = "--dry-run" in sys.argv
    font_path = find_font()
    print(f"Using font: {font_path}")

    sizes = [128, 48, 16]

    for cfg in CONFIGS:
        print(f"Processing extension: {cfg['name']} -> Letter '{cfg['letter']}'")
        master_img = render_badge(cfg["letter"], cfg["bg_color"], font_path)

        os.makedirs(cfg["output_dir"], exist_ok=True)

        for size in sizes:
            out_file = os.path.join(cfg["output_dir"], f"icon{size}.png")
            if dry_run:
                print(f"  [DRY-RUN] Would write {size}x{size} to {out_file}")
            else:
                resized = master_img.resize((size, size), Image.Resampling.LANCZOS)
                resized.save(out_file, "PNG", optimize=True)
                print(f"  [WRITTEN] {size}x{size} -> {out_file} ({os.path.getsize(out_file)} bytes)")

if __name__ == "__main__":
    main()
